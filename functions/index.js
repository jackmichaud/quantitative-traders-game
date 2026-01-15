const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "us-central1" }); // change if you want

const gameCalls = require("./src/https/gameCalls");
const orderCalls = require("./src/https/orderCalls");

module.exports = {
  ...gameCalls,
  ...orderCalls,
};