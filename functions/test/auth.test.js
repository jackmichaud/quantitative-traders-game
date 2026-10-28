const test = require("node:test");
const assert = require("node:assert/strict");

const { isAdmin, requireAdmin } = require("../src/utils/auth");

test("isAdmin only accepts the signed admin claim", () => {
  assert.equal(isAdmin({ auth: { uid: "admin", token: { admin: true } } }), true);
  assert.equal(isAdmin({ auth: { uid: "user", token: { admin: false } } }), false);
  assert.equal(isAdmin({ auth: { uid: "user", token: {} } }), false);
  assert.equal(isAdmin({}), false);
});

test("requireAdmin returns the authenticated admin uid", () => {
  const uid = requireAdmin({ auth: { uid: "admin", token: { admin: true } } });
  assert.equal(uid, "admin");
});

test("requireAdmin rejects unauthenticated and non-admin requests", () => {
  assert.throws(() => requireAdmin({}), (error) => error.code === "unauthenticated");
  assert.throws(
    () => requireAdmin({ auth: { uid: "user", token: {} } }),
    (error) => error.code === "permission-denied"
  );
});
