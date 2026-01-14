const { db, Timestamp } = require("../admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { newId } = require("../utils/ids");

async function placeOrder({ uid, marketId, side, price, shares }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  const cg = user?.currentGame;
  if (!cg?.gameId || !cg?.teamId) throw new HttpsError("failed-precondition", "User not in a game.");

  const gameRef = db.collection("games").doc(cg.gameId);
  const marketRef = gameRef.collection("markets").doc(marketId);
  const ordersCol = marketRef.collection("orders");
  const tradesCol = marketRef.collection("trades");

  const orderId = newId();

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Game not active.");

    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists) throw new HttpsError("not-found", "Market not found.");

    const now = Timestamp.now();

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

    // Simple bounded matching
    const maxMatches = 25;
    let remaining = shares;

    for (let i = 0; i < maxMatches && remaining > 0; i++) {
      const bestOpp = await _getBestOpposingOpenOrder(tx, ordersCol, side);
      if (!bestOpp) break;

      const opp = bestOpp.data;

      // prevent self-trade
      if (opp.teamId === cg.teamId) break;

      // Check crossing
      const crosses = side === "buy" ? price >= opp.price : opp.price >= price;
      if (!crosses) break;

      const fillQty = Math.min(remaining, opp.sharesRemaining);
      const tradePrice = (price + opp.price) / 2;

      // Determine maker/taker (simple: existing opp order is maker, new order is taker)
      const takerOrderId = orderId;
      const makerOrderId = bestOpp.id;

      // Update opposing order
      const oppRef = ordersCol.doc(bestOpp.id);
      const newOppRemaining = opp.sharesRemaining - fillQty;
      tx.update(oppRef, {
        sharesRemaining: newOppRemaining,
        status: newOppRemaining === 0 ? "filled" : "open",
        updatedAt: now,
      });

      remaining -= fillQty;

      // Update placed order after loop; we can update incrementally too if you prefer
      // Write trade doc (this is the source of truth for settlement)
      const tradeId = newId();
      tx.set(tradesCol.doc(tradeId), {
        tradeId,
        marketId,
        price: tradePrice,
        qty: fillQty,
        createdAt: now,

        // Sides
        buyOrderId: side === "buy" ? orderId : bestOpp.id,
        sellOrderId: side === "sell" ? orderId : bestOpp.id,

        // Participants (store both for easy settlement)
        buyer: side === "buy"
          ? { userId: uid, teamId: cg.teamId }
          : { userId: opp.userId, teamId: opp.teamId },
        seller: side === "sell"
          ? { userId: uid, teamId: cg.teamId }
          : { userId: opp.userId, teamId: opp.teamId },

        // Maker/taker (optional analytics)
        makerOrderId,
        takerOrderId,
      });

      // Market summary updates
      tx.set(marketRef, { lastPrice: tradePrice }, { merge: true });

      // Optional: also create an event at game level
      tx.create(gameRef.collection("events").doc(), {
        type: "TRADE",
        createdAt: now,
        payload: { marketId, price: tradePrice, qty: fillQty },
      });
    }

    // Finalize placed order
    tx.update(orderRef, {
      sharesRemaining: remaining,
      status: remaining === 0 ? "filled" : "open",
      updatedAt: Timestamp.now(),
    });

    // Approximate book summary (you can recompute via queries if you need perfect)
    const bestBid = side === "buy" ? price : (marketSnap.data().bestBid ?? null);
    const bestAsk = side === "sell" ? price : (marketSnap.data().bestAsk ?? null);
    tx.set(marketRef, { bestBid, bestAsk }, { merge: true });
  });

  return { ok: true, orderId };
}

async function cancelOrder({ uid, marketId, orderId }) {
  const userSnap = await db.collection("users").doc(uid).get();
  const cg = userSnap.data()?.currentGame;
  if (!cg?.gameId) throw new HttpsError("failed-precondition", "User not in a game.");

  const orderRef = db.collection("games").doc(cg.gameId)
    .collection("markets").doc(marketId)
    .collection("orders").doc(orderId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data();

    if (order.userId !== uid) throw new HttpsError("permission-denied", "Not your order.");
    if (order.status !== "open") throw new HttpsError("failed-precondition", "Order not open.");

    tx.update(orderRef, {
      status: "cancelled",
      sharesRemaining: 0,
      updatedAt: Timestamp.now(),
    });
  });

  return { ok: true };
}

async function _getBestOpposingOpenOrder(tx, ordersCol, side) {
  const oppSide = side === "buy" ? "sell" : "buy";

  let q = ordersCol
    .where("status", "==", "open")
    .where("side", "==", oppSide);

  if (oppSide === "sell") {
    q = q.orderBy("price", "asc").orderBy("createdAt", "asc").limit(1);
  } else {
    q = q.orderBy("price", "desc").orderBy("createdAt", "asc").limit(1);
  }

  const snap = await tx.get(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() };
}

module.exports = { placeOrder, cancelOrder };