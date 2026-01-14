const { HttpsError } = require("firebase-functions/v2/https");

function requireString(v, name) {
  if (typeof v !== "string" || !v.trim()) {
    throw new HttpsError("invalid-argument", `${name} must be a non-empty string.`);
  }
  return v.trim();
}

function requireNumber(v, name) {
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new HttpsError("invalid-argument", `${name} must be a number.`);
  }
  return v;
}

function requireOneOf(v, name, allowed) {
  if (!allowed.includes(v)) {
    throw new HttpsError("invalid-argument", `${name} must be one of: ${allowed.join(", ")}`);
  }
  return v;
}

module.exports = { requireString, requireNumber, requireOneOf };