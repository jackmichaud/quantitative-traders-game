const { db, Timestamp } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { getGameImpl } = require("../games/registry");
const { newId } = require("../utils/ids");

async function createGame({ type, season, visibility }) {
  const impl = getGameImpl(type);

  const gameId = `${type}-${newId().slice(0, 8)}`; // friendly id
  const gameRef = db.collection("games").doc(gameId);

  const gameDoc = {
    type,
    season: season || null,
    visibility: visibility || "unofficial", // "official"|"unofficial"
    status: "waiting",
    createdAt: Timestamp.now(),
    startAt: null,
    closedAt: null,
    rolls: [],
  };

  const batch = db.batch();
  batch.set(gameRef, gameDoc);

  // markets
  for (const m of impl.markets()) {
    const mRef = gameRef.collection("markets").doc(m.id);
    batch.set(mRef, {
      name: m.name,
      bestBid: null,
      bestAsk: null,
      lastPrice: null,
      finalPrice: null,
      createdAt: Timestamp.now(),
    });
  }

  await batch.commit();
  return { gameId };
}

async function joinGame({ uid, gameId, teamName, userEmail }) {
  const gameRef = db.collection("games").doc(gameId);

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");

    const game = gameSnap.data();
    if (game.status !== "waiting") {
      throw new HttpsError("failed-precondition", "Game already started.");
    }

    // If user already in a game, block (prevents multi-join issues)
    const userRef = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);
    const user = userSnap.data() || {};
    if (user.currentGame?.gameId) {
      throw new HttpsError("failed-precondition", "User already in a game.");
    }

    // Find or create team by name (simple approach: query by exact name)
    const teamsQuery = gameRef.collection("teams").where("name", "==", teamName).limit(1);
    const teamsSnap = await tx.get(teamsQuery);

    let teamRef;
    if (teamsSnap.empty) {
      teamRef = gameRef.collection("teams").doc();
      tx.set(teamRef, { name: teamName, balance: 0, createdAt: Timestamp.now() });
    } else {
      teamRef = teamsSnap.docs[0].ref;
    }

    // Add player doc (idempotent)
    const playerRef = teamRef.collection("players").doc(uid);
    tx.set(playerRef, { email: userEmail || null, pnl: 0, joinedAt: Timestamp.now() }, { merge: true });

    // Update user currentGame
    tx.set(userRef, { currentGame: { gameId, teamId: teamRef.id }, email: userEmail || user.email || null }, { merge: true });

    // Event
    tx.create(gameRef.collection("events").doc(), {
      type: "PLAYER_JOINED",
      createdAt: Timestamp.now(),
      payload: { uid, teamName },
    });
  });

  return { ok: true };
}

async function leaveGame({ uid }) {
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
    const user = userSnap.data();

    const cg = user.currentGame;
    if (!cg?.gameId || !cg?.teamId) throw new HttpsError("failed-precondition", "User not in a game.");

    const gameRef = db.collection("games").doc(cg.gameId);
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");

    const game = gameSnap.data();
    if (game.status !== "waiting") {
      throw new HttpsError("failed-precondition", "Cannot leave after game starts.");
    }

    const teamRef = gameRef.collection("teams").doc(cg.teamId);
    const playerRef = teamRef.collection("players").doc(uid);

    // remove player doc
    tx.delete(playerRef);

    // clear currentGame
    tx.update(userRef, { currentGame: null });

    tx.create(gameRef.collection("events").doc(), {
      type: "PLAYER_LEFT",
      createdAt: Timestamp.now(),
      payload: { uid, teamId: cg.teamId },
    });
  });

  return { ok: true };
}

async function startGame({ uid }) {
  // Any player can start; you can add “host/admin” logic later.
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  const cg = user?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");

    const game = gameSnap.data();
    if (game.status !== "waiting") throw new HttpsError("failed-precondition", "Game not in waiting status.");

    tx.update(gameRef, { status: "active", startAt: Timestamp.now() });
    tx.create(gameRef.collection("events").doc(), {
      type: "GAME_STARTED",
      createdAt: Timestamp.now(),
      payload: { by: uid },
    });
  });

  return { ok: true };
}

async function tickGame({ uid }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");

    const game = gameSnap.data();
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Game not active.");

    const impl = getGameImpl(game.type);
    const { rolls, event } = impl.tick({ game });

    tx.update(gameRef, { rolls });

    if (event) {
      tx.create(gameRef.collection("events").doc(), { ...event, createdAt: Timestamp.now() });
    }
  });

  return { ok: true };
}

module.exports = { createGame, joinGame, leaveGame, startGame, tickGame };