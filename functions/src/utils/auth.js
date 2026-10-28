const { HttpsError } = require("firebase-functions/v2/https");

function requireAuth(req) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in.");
  return uid;
}

function isAdmin(req) {
  return Boolean(req.auth?.uid && req.auth?.token?.admin === true);
}

function requireAdmin(req) {
  const uid = requireAuth(req);
  if (!isAdmin(req)) {
    throw new HttpsError("permission-denied", "Administrator access required.");
  }
  return uid;
}

module.exports = { requireAuth, isAdmin, requireAdmin };
