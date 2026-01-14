const { onCall } = require("firebase-functions/v2/https");
const { requireAuth } = require("../utils/auth");
const { toHttpsError } = require("../utils/errors");
const { requireString, requireNumber, requireOneOf } = require("../utils/validate");

const orderService = require("../services/orderService");

exports.placeOrder = onCall(async (req) => {
  try {
    const uid = requireAuth(req);

    const marketId = requireString(req.data.marketId, "marketId");
    const side = requireOneOf(req.data.side, "side", ["buy", "sell"]);
    const price = requireNumber(req.data.price, "price");
    const shares = requireNumber(req.data.shares, "shares");

    if (shares <= 0) throw new Error("shares must be > 0");
    if (price < 0) throw new Error("price must be >= 0");

    return await orderService.placeOrder({ uid, marketId, side, price, shares });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.cancelOrder = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    const marketId = requireString(req.data.marketId, "marketId");
    const orderId = requireString(req.data.orderId, "orderId");
    return await orderService.cancelOrder({ uid, marketId, orderId });
  } catch (e) {
    throw toHttpsError(e);
  }
});