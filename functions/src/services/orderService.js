const { db, Timestamp, FieldValue } = require("../admin");
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

  const orderId = newId();

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data();
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Game not active.");

    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists) throw new HttpsError("not-found", "Market not found.");

    // Create order doc
    const orderRef = ordersCol.doc(orderId);
    tx.set(orderRef, {
      userId: uid,
      teamId: cg.teamId,
      side,
      price,
      sharesRemaining: shares,
      status: "open",
      createdAt: Timestamp.now(),
    });

    // Simple matching loop (bounded)
    // We do small matching in-call; for heavy usage, move matching to a queue worker.
    const maxMatches = 10;
    let remaining = shares;

    for (let i = 0; i < maxMatches && remaining > 0; i++) {
      const bestOpp = await _getBestOpposingOpenOrder(tx, ordersCol, side);
      if (!bestOpp) break;

      const opp = bestOpp.data;
      if (opp.teamId === cg.teamId) {
        // prevent self-trade: skip (mark as "skipped" in future if you want)
        // We just break to avoid infinite loops.
        break;
      }

      const crosses =
        side === "buy" ? price >= opp.price : opp.price >= price;

      if (!crosses) break;

      const fillQty = Math.min(remaining, opp.sharesRemaining);

      // Midpoint price like your original
      const tradePrice = (price + opp.price) / 2;

      // Update opposing order remaining
      const oppRef = ordersCol.doc(bestOpp.id);
      const newOppRemaining = opp.sharesRemaining - fillQty;
      tx.update(oppRef, {
        sharesRemaining: newOppRemaining,
        status: newOppRemaining === 0 ? "filled" : "open",
      });

      remaining -= fillQty;

      // Write trade events
      tx.create(gameRef.collection("events").doc(), {
        type: "TRADE",
        createdAt: Timestamp.now(),
        payload: {
          marketId,
          price: tradePrice,
          qty: fillQty,
          buyOrder: side === "buy" ? orderId : bestOpp.id,
          sellOrder: side === "sell" ? orderId : bestOpp.id,
        },
      });

      // Update market summary
      tx.set(
        marketRef,
        { lastPrice: tradePrice },
        { merge: true }
      );
    }

    // Update the placed order with remaining + filled status
    tx.update(ordersCol.doc(orderId), {
      sharesRemaining: remaining,
      status: remaining === 0 ? "filled" : "open",
    });

    // Update best bid/ask summary (cheap, helps UI)
    // NOTE: This is approximate unless you recompute from queries; good enough for a game UI.
    const bestBid = side === "buy" ? price : marketSnap.data().bestBid;
    const bestAsk = side === "sell" ? price : marketSnap.data().bestAsk;
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

    tx.update(orderRef, { status: "cancelled", sharesRemaining: 0 });
  });

  return { ok: true };
}

// helper: returns {id, data} or null
async function _getBestOpposingOpenOrder(tx, ordersCol, side) {
  const oppSide = side === "buy" ? "sell" : "buy";

  // Buy wants cheapest sell; Sell wants highest buy
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