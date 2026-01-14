const { db, Timestamp, FieldValue } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { getGameImpl } = require("../games/registry");
const { newId } = require("../utils/ids");

async function closeGame({ uid }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);

  // Lock settlement
  const settlementAttemptId = newId();

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();

    if (game.status === "closed" || game.settlement?.state === "finished") return;

    if (game.status !== "active" && game.status !== "closing") {
      throw new HttpsError("failed-precondition", "Game not active.");
    }

    if (game.settlement?.state === "running") {
      throw new HttpsError("failed-precondition", "Settlement already running.");
    }

    tx.update(gameRef, {
      status: "closing",
      settlement: { state: "running", id: settlementAttemptId, startedAt: Timestamp.now() },
    });
  });

  const gameSnap = await gameRef.get();
  const game = gameSnap.data();
  if (!game) throw new HttpsError("not-found", "Game not found.");

  if (game.status === "closed" || game.settlement?.state === "finished") {
    return { ok: true, alreadyClosed: true };
  }

  const season = game.season;
  const visibility = game.visibility || "unofficial";
  const isOfficial = visibility === "official";

  if (isOfficial && (!season || !String(season).trim())) {
    throw new HttpsError("failed-precondition", "Official games must have a season.");
  }

  const impl = getGameImpl(game.type);
  const finalPrices = impl.finalize(game);

  const marketsCol = gameRef.collection("markets");
  const marketIds = Object.keys(finalPrices);

  // write final prices
  await commitSets(
    marketIds.map((mid) => ({
      ref: marketsCol.doc(mid),
      data: { finalPrice: finalPrices[mid] },
      merge: true,
    }))
  );

  // pnl maps
  const teamPnl = new Map();          // teamId -> pnl
  const playerPnl = new Map();        // `${teamId}:${uid}` -> pnl
  const userPnl = new Map();          // uid -> pnl

  for (const mid of marketIds) {
    const fp = finalPrices[mid];
    const tradesSnap = await marketsCol.doc(mid).collection("trades").get();

    for (const t of tradesSnap.docs) {
      const trade = t.data();
      const tradePrice = clampPrice(trade.price);
      const qty = trade.qty || 0;
      if (!qty) continue;

      const delta = (fp - tradePrice) * qty;

      // buyer gains delta
      add(teamPnl, trade.buyer.teamId, delta);
      add(playerPnl, `${trade.buyer.teamId}:${trade.buyer.userId}`, delta);
      add(userPnl, trade.buyer.userId, delta);

      // seller loses delta
      add(teamPnl, trade.seller.teamId, -delta);
      add(playerPnl, `${trade.seller.teamId}:${trade.seller.userId}`, -delta);
      add(userPnl, trade.seller.userId, -delta);
    }
  }

  // Build game leaderboard from teams + their players
  const teamsSnap = await gameRef.collection("teams").get();

  const leaderboard = [];
  const teamWrites = [];
  const playerWrites = [];
  const userWrites = [];

  for (const teamDoc of teamsSnap.docs) {
    const teamId = teamDoc.id;
    const teamData = teamDoc.data() || {};
    const teamName = teamData.name || teamId;
    const teamBalance = teamPnl.get(teamId) || 0;

    teamWrites.push({ ref: teamDoc.ref, data: { balance: teamBalance }, merge: true });

    const playersSnap = await teamDoc.ref.collection("players").get();
    const players = [];

    for (const pDoc of playersSnap.docs) {
      const playerUid = pDoc.id;
      const pData = pDoc.data() || {};
      const email = pData.email || null;

      const key = `${teamId}:${playerUid}`;
      const bal = playerPnl.get(key) || 0;

      // store pnl on team-player doc
      playerWrites.push({ ref: pDoc.ref, data: { pnl: bal }, merge: true });

      players.push({
        uid: db.doc(`users/${playerUid}`), // ✅ reference
        email,
        balance: bal,
      });
    }

    leaderboard.push({ name: teamName, balance: teamBalance, players });
  }

  for (const [userId, pnl] of userPnl.entries()) {
    userWrites.push({ ref: db.collection("users").doc(userId), data: { balance: FieldValue.increment(pnl) }, merge: true });
  }

  await commitSets(teamWrites);
  await commitSets(playerWrites);
  await commitSets(userWrites);

  // finalize game + leaderboard
  await gameRef.update({
    leaderboard,
    status: "closed",
    closedAt: Timestamp.now(),
    settlement: {
      state: "finished",
      id: game.settlement?.id || settlementAttemptId,
      startedAt: game.settlement?.startedAt || Timestamp.now(),
      finishedAt: Timestamp.now(),
      globalApplied: false,
    },
  });

  // global leaderboards (official only, exactly once)
  if (isOfficial) {
    await applyGlobalLeaderboardOnce({ gameRef, season: String(season).trim(), leaderboard });
  }

  return { ok: true, markets: finalPrices };
}

async function applyGlobalLeaderboardOnce({ gameRef, season, leaderboard }) {
  const globalRef = db.collection("global_leaderboards").doc(season);

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();
    const settlement = game.settlement || {};

    if (settlement.state !== "finished") {
      throw new HttpsError("failed-precondition", "Settlement not finished.");
    }
    if (settlement.globalApplied === true) return;

    const globalSnap = await tx.get(globalRef);
    const global = globalSnap.exists ? globalSnap.data() : { teams: [], players: [] };

    const teams = Array.isArray(global.teams) ? global.teams : [];
    const players = Array.isArray(global.players) ? global.players : [];

    // teams
    for (const t of leaderboard) {
      const idx = teams.findIndex((x) => x.name === t.name);
      if (idx >= 0) teams[idx].balance += t.balance;
      else teams.push({ name: t.name, balance: t.balance });
    }

    // players (uid ref)
    for (const t of leaderboard) {
      for (const p of t.players) {
        const uidPath = p.uid?.path;
        const idx = players.findIndex((x) => x.uid?.path === uidPath);
        if (idx >= 0) {
          players[idx].balance += p.balance;
          if (p.email) players[idx].email = p.email;
        } else {
          players.push({ uid: p.uid, email: p.email || null, balance: p.balance });
        }
      }
    }

    tx.set(globalRef, { teams, players }, { merge: true });
    tx.update(gameRef, { "settlement.globalApplied": true });
  });
}

// helpers
function clampPrice(p) {
  const x = typeof p === "number" ? p : 0;
  return Math.min(Math.max(x, 0), 1e9);
}
function add(map, key, delta) {
  map.set(key, (map.get(key) || 0) + delta);
}

async function commitSets(writes) {
  const chunks = chunk(writes, 450);
  for (const c of chunks) {
    const batch = db.batch();
    for (const w of c) batch.set(w.ref, w.data, { merge: !!w.merge });
    await batch.commit();
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports = { closeGame };