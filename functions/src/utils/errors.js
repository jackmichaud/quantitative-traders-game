const { HttpsError } = require("firebase-functions/v2/https");

function toHttpsError(err) {
  if (err instanceof HttpsError) return err;
  return new HttpsError("internal", err?.message || "Internal error");
}

module.exports = { toHttpsError };