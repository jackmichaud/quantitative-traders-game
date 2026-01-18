// orderService.js
const { db, Timestamp } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { newId } = require("../utils/ids");

/**
 * Firestore transactions require: ALL reads must happen before ANY writes.
 * This implementation:
 *  - Reads: game, market, opposing order batch (once)
 *  - Writes: order create, fills, trades, market summary, event(s), final order update
 */

async function placeOrder({ uid, marketId, side, price, shares }) {
  if (!uid || !marketId) throw new HttpsError("invalid-argument", "Missing uid or marketId.");
  if (side !== "buy" && side !== "sell") throw new HttpsError("invalid-argument", "Invalid side.");
  if (typeof price !== "number" || price <= 0) throw new HttpsError("invalid-argument", "Invalid price.");
  if (!Number.isInteger(shares) || shares <= 0) throw new HttpsError("invalid-argument", "Invalid shares.");

  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  const cg = user?.currentGame;
  if (!cg?.gameId || !cg?.teamId) {
    throw new HttpsError("failed-precondition", "User not in a game.");
  }

  const gameRef = db.collection("games").doc(cg.gameId);
  const marketRef = gameRef.collection("markets").doc(marketId);
  const ordersCol = marketRef.collection("orders");
  const tradesCol = marketRef.collection("trades");

  const orderId = newId();

  await db.runTransaction(async (tx) => {
    // -------------------------
    // READS (must be first)
    // -------------------------
    const [gameSnap, marketSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(marketRef),
    ]);

    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Game not active.");

    if (!marketSnap.exists) throw new HttpsError("not-found", "Market not found.");
    const market = marketSnap.data() || {};

    const now = Timestamp.now();

    const maxMatches = 25;

    // Read a batch of opposing orders ONCE (no reads after we begin writing).
    // We fetch extra to allow skipping self-trades while still having up to maxMatches fills.
    const oppBatchLimit = Math.max(50, maxMatches * 2);

    const oppSide = side === "buy" ? "sell" : "buy";
    let oppQ = ordersCol
      .where("status", "==", "open")
      .where("side", "==", oppSide);

    if (oppSide === "sell") {
      // best ask first, FIFO within price
      oppQ = oppQ.orderBy("price", "asc").orderBy("createdAt", "asc").limit(oppBatchLimit);
    } else {
      // best bid first, FIFO within price
      oppQ = oppQ.orderBy("price", "desc").orderBy("createdAt", "asc").limit(oppBatchLimit);
    }

    const oppSnap = await tx.get(oppQ);
    const oppDocs = oppSnap.docs.map((d) => ({ id: d.id, data: d.data() }));

    // -------------------------
    // WRITES (no more tx.get beyond here)
    // -------------------------

    // Create order doc
    const orderRef = ordersCol.doc(orderId);
    tx.set(orderRef, {
      userId: uid,
      teamId: cg.teamId,
      side,
      price,
      sharesOriginal: shares,
      sharesRemaining: shares,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    let remaining = shares;
    let fillsDone = 0;
    let lastTradePrice = market.lastPrice ?? null;

    for (const oppDoc of oppDocs) {
      if (remaining <= 0) break;
      if (fillsDone >= maxMatches) break;

      const opp = oppDoc.data;

      // Skip self-trade orders (don't break; just keep scanning for next best)
      if (opp.teamId === cg.teamId) continue;

      // Must be an open order with remaining shares
      const oppRemaining = Number(opp.sharesRemaining ?? 0);
      if (opp.status !== "open" || oppRemaining <= 0) continue;

      // Check crossing: if the best opposing doesn't cross, none later will (sorted best-to-worse)
      const crosses = side === "buy" ? price >= opp.price : opp.price >= price;
      if (!crosses) break;

      const fillQty = Math.min(remaining, oppRemaining);
      const tradePrice = (price + opp.price) / 2;

      // Maker/taker (existing order is maker, new order is taker)
      const takerOrderId = orderId;
      const makerOrderId = oppDoc.id;

      // Update opposing order
      const oppRef = ordersCol.doc(oppDoc.id);
      const newOppRemaining = oppRemaining - fillQty;
      tx.update(oppRef, {
        sharesRemaining: newOppRemaining,
        status: newOppRemaining === 0 ? "filled" : "open",
        updatedAt: now,
      });

      remaining -= fillQty;
      fillsDone += 1;
      lastTradePrice = tradePrice;

      // Write trade doc (source of truth)
      const tradeId = newId();
      tx.set(tradesCol.doc(tradeId), {
        tradeId,
        marketId,
        price: tradePrice,
        qty: fillQty,
        createdAt: now,

        buyOrderId: side === "buy" ? orderId : oppDoc.id,
        sellOrderId: side === "sell" ? orderId : oppDoc.id,

        buyer:
          side === "buy"
            ? { userId: uid, teamId: cg.teamId }
            : { userId: opp.userId, teamId: opp.teamId },
        seller:
          side === "sell"
            ? { userId: uid, teamId: cg.teamId }
            : { userId: opp.userId, teamId: opp.teamId },

        makerOrderId,
        takerOrderId,
      });

      // Optional: game-level event
      // tx.create(gameRef.collection("events").doc(), {
      //   type: "TRADE",
      //   createdAt: now,
      //   payload: { marketId, price: tradePrice, qty: fillQty },
      // });
    }

    // Finalize placed order
    const finalStatus = remaining === 0 ? "filled" : "open";
    tx.update(orderRef, {
      sharesRemaining: remaining,
      status: finalStatus,
      updatedAt: now,
    });

    // Market summary updates:
    // - lastPrice updated if we traded
    // - bestBid/bestAsk updated conservatively (not perfect, but monotonic-safe for inserts)
    const updates = {};
    if (lastTradePrice !== null) updates.lastPrice = lastTradePrice;

    // If the order remains open, it should contribute to the book
    // If it was fully filled, it doesn't add to bestBid/Ask.
    if (finalStatus === "open") {
      if (side === "buy") {
        const cur = market.bestBid ?? null;
        updates.bestBid = cur == null ? price : Math.max(cur, price);
      } else {
        const cur = market.bestAsk ?? null;
        updates.bestAsk = cur == null ? price : Math.min(cur, price);
      }
    }

    if (Object.keys(updates).length > 0) {
      tx.set(marketRef, updates, { merge: true });
    }
  });

  return { ok: true, orderId };
}

async function cancelOrder({ uid, marketId, orderId }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const orderRef = db
    .collection("games")
    .doc(cg.gameId)
    .collection("markets")
    .doc(marketId)
    .collection("orders")
    .doc(orderId);

  await db.runTransaction(async (tx) => {
    // Reads first
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data();

    if (order.userId !== uid) throw new HttpsError("permission-denied", "Not your order.");
    if (order.status !== "open") throw new HttpsError("failed-precondition", "Order not open.");

    const now = Timestamp.now();

    // Writes after reads
    tx.update(orderRef, {
      status: "cancelled",
      sharesRemaining: 0,
      updatedAt: now,
    });
  });

  return { ok: true };
}

module.exports = { placeOrder, cancelOrder };