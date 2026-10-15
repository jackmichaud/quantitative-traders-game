const { HttpsError } = require("firebase-functions/v2/https");

// Keep the existing administrator working while allowing a custom claim to
// replace this compatibility entry later.
const LEGACY_ADMIN_UIDS = new Set(["66Q8I5XwY0TChOmSUWoYM5nEaB32"]);

function requireAuth(req) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in.");
  return uid;
}

function isAdmin(req) {
  const uid = req.auth?.uid;
  return Boolean(uid && (req.auth?.token?.admin === true || LEGACY_ADMIN_UIDS.has(uid)));
}

module.exports = { requireAuth, isAdmin };
