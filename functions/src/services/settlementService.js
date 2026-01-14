const { db, Timestamp, FieldValue } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { getGameImpl } = require("../games/registry");

async function closeGame({ uid }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);

  // Phase 1: lock the game as "closing" exactly once
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();

    if (game.status === "closed") throw new HttpsError("failed-precondition", "Game already closed.");
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Game not active.");
    tx.update(gameRef, { status: "closing" });
  });

  // Phase 2: compute final prices and settlement
  const gameSnap = await gameRef.get();
  const game = gameSnap.data();
  const impl = getGameImpl(game.type);
  const finalPrices = impl.finalize(game);

  // Write final prices (batch)
  const marketsCol = gameRef.collection("markets");
  const marketIds = Object.keys(finalPrices);
  const batch = db.batch();
  for (const mid of marketIds) {
    batch.set(marketsCol.doc(mid), { finalPrice: finalPrices[mid] }, { merge: true });
  }
  await batch.commit();

  // Compute PnL by scanning orders
  // For bigger scale: write fills/trades separately; for your use case, scanning orders is fine.
  const teamsSnap = await gameRef.collection("teams").get();
  const teamRefs = teamsSnap.docs.map(d => d.ref);

  // Reset team balances to 0 for this settlement pass (game-local PnL)
  const resetBatch = db.batch();
  for (const tRef of teamRefs) resetBatch.set(tRef, { balance: 0 }, { merge: true });
  await resetBatch.commit();

  // Accumulate pnl per team + per player + user global
  const teamPnl = new Map();   // teamId -> pnl
  const playerPnl = new Map(); // `${teamId}:${uid}` -> pnl
  const userPnl = new Map();   // uid -> pnl

  for (const mid of marketIds) {
    const fp = finalPrices[mid];
    const ordersSnap = await marketsCol.doc(mid).collection("orders").get();

    for (const doc of ordersSnap.docs) {
      const o = doc.data();
      // Only filled orders contribute; if you want partial fills, you’ll need a fills/trades log.
      if (o.status !== "filled") continue;

      const orderPrice = Math.min(Math.max(o.price, 0), 1e9);
      let delta = fp - orderPrice;
      if (o.side === "sell") delta = -delta;

      // In this simplified version, “sharesRemaining” is 0 for filled orders,
      // so we need original size to compute pnl. If you need exact pnl, store `sharesOriginal`.
      // For now: treat filled = sharesRemaining was driven to 0; we can’t recover qty.
      // → Fix: start storing sharesOriginal in placeOrder.
      // I’m leaving this note so you don’t silently compute wrong pnl.
      throw new HttpsError(
        "failed-precondition",
        "Settlement requires orders to store sharesOriginal. Add it in placeOrder()."
      );
    }
  }

  // Phase 3: finalize game (if we got here)
  await gameRef.update({ status: "closed", closedAt: Timestamp.now() });

  return { ok: true };
}

module.exports = { closeGame };