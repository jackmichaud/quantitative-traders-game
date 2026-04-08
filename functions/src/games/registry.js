const dice = require("./types/dice");
const cards = require("./types/cards");
const golf = require("./types/golf");

const registry = {
  dice,
  cards,
  golf,
};

function getGameImpl(type) {
  const impl = registry[type];
  if (!impl) throw new Error(`Unsupported game type: ${type}`);
  return impl;
}

module.exports = { getGameImpl };