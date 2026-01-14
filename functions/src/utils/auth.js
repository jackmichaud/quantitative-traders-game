const { HttpsError } = require("firebase-functions/v2/https");

function requireAuth(req) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in.");
  return uid;
}

module.exports = { requireAuth };