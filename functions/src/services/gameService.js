const { db, Timestamp } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { getGameImpl } = require("../games/registry");
const { newId } = require("../utils/ids");
const logger = require("firebase-functions/logger");

async function createGame({ uid, type, season, visibility, canCreateOfficial = false }) {
  const impl = getGameImpl(type);

  const vis = visibility || "unofficial";
  if (!["official", "unofficial"].includes(vis)) {
    throw new HttpsError("invalid-argument", "visibility must be 'official' or 'unofficial'");
  }
  if (vis === "official" && (!season || typeof season !== "string" || !season.trim())) {
    throw new HttpsError("invalid-argument", "season is required for official games");
  }
  if (vis === "official" && !canCreateOfficial) {
    throw new HttpsError("permission-denied", "Only an administrator can create official games.");
  }

  const gameId = `${type}-${newId().slice(0, 8)}`;
  const gameRef = db.collection("games").doc(gameId);

  const gameDoc = {
    type,
    season: vis === "official" ? season.trim() : (season?.trim() || null),
    visibility: vis,
    status: "waiting",
    hostUid: uid,                 // only the host can start, advance, and close
    createdAt: Timestamp.now(),
    startAt: null,
    closedAt: null,

    // game-specific evolving state
    rolls: [],

    // output artifacts
    leaderboard: [],

    // settlement control / idempotency
    settlement: null,

    // optional future-proof flags
    rosterLocked: false,
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
    if (game.rosterLocked) {
      throw new HttpsError("failed-precondition", "Roster locked.");
    }

    // user must not already be in a game
    const userRef = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);
    const user = userSnap.data() || {};
    if (user.currentGame?.gameId) {
      throw new HttpsError("failed-precondition", "User already in a game.");
    }

    // Find or create team by name
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
    tx.set(userRef, {
      email: userEmail || user.email || null,
      currentGame: { gameId, teamId: teamRef.id }
    }, { merge: true });

    tx.create(gameRef.collection("events").doc(), {
      type: "PLAYER_JOINED",
      createdAt: Timestamp.now(),
      payload: { uid, teamName, userEmail },
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

    if (game.status === "active" || game.status === "closing") {
      throw new HttpsError("failed-precondition", "Players cannot leave while the game is running.");
    }

    const teamRef = gameRef.collection("teams").doc(cg.teamId);
    const playerRef = teamRef.collection("players").doc(uid);

    tx.delete(playerRef);
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
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();

    if (game.status !== "waiting") {
      throw new HttpsError("failed-precondition", "Game not in waiting status.");
    }

    if (game.hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only the host can start the game.");
    }

    tx.update(gameRef, {
      status: "active",
      startAt: Timestamp.now(),
      rosterLocked: true, // ✅ freeze roster now that game started
    });

    tx.create(gameRef.collection("events").doc(), {
      type: "GAME_STARTED",
      createdAt: Timestamp.now(),
      payload: { by: uid },
    });
  });

  return { ok: true };
}

async function tickGame({ uid, gameId }) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }
  if (typeof gameId !== "string" || gameId.trim() === "") {
    throw new HttpsError("invalid-argument", "A valid gameId is required.");
  }

  logger.log("Ticking game", gameId);

  const gameRef = db.collection("games").doc(gameId);

  return db.runTransaction(async (tx) => {
    // READS
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");

    const game = { id: gameSnap.id, ...gameSnap.data() };
    if (game.hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only the host can advance the game.");
    }
    if (game.status !== "active") {
      throw new HttpsError("failed-precondition", "Game is not active.");
    }
    if (!game.type) throw new HttpsError("failed-precondition", `Game ${gameId} is missing its type.`);

    const impl = getGameImpl(game.type);

    // game-specific tick
    const { event, ...patch } = impl.tick({ game });

    // WRITES
    const updates = {
      ...patch,
      updatedAt: Timestamp.now(),
    };

    tx.update(gameRef, updates);

    // write event as a new doc in games/{gameId}/events/{new uid}
    if (event) {
      tx.create(gameRef.collection("events").doc(), {
        type: event.type,
        createdAt: Timestamp.now(),
        payload: event.payload ?? {},
      });
    }

    return { gameId, updates, event };
  });
}

module.exports = { createGame, joinGame, leaveGame, startGame, tickGame };
