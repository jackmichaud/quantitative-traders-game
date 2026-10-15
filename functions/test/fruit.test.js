const test = require("node:test");
const assert = require("node:assert/strict");

const fruit = require("../src/games/types/fruit");
const { getGameImpl } = require("../src/games/registry");

test("fruit game is registered with five markets", () => {
  assert.equal(getGameImpl("fruit"), fruit);
  assert.deepEqual(
    fruit.markets().map((market) => market.id),
    ["VALUE", "SWEETNESS", "CITRUS", "VARIETY", "RARE"]
  );
});

test("fruit settlement calculates all five payouts", () => {
  const fruits = [
    "apple",
    "banana",
    "orange",
    "grapes",
    "pear",
    "dragonFruit",
    "apple",
    "orange",
  ];

  assert.deepEqual(fruit.finalize({ fruits }), {
    VALUE: 65,
    SWEETNESS: 56,
    CITRUS: 40,
    VARIETY: 144,
    RARE: 50,
  });
});

test("fruit draws respect crate counts and stop after eight ticks", { concurrency: false }, () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    let game = { fruits: [] };

    for (let i = 0; i < 8; i += 1) {
      const result = fruit.tick({ game });
      game = { ...game, fruits: result.fruits };
    }

    assert.equal(game.fruits.length, 8);
    assert.equal(game.fruits.filter((item) => item === "apple").length, 6);
    assert.deepEqual(game.fruits.slice(6), ["banana", "banana"]);

    const extraTick = fruit.tick({ game });
    assert.equal(extraTick.fruits.length, 8);
    assert.equal(extraTick.event.type, "FRUIT_BASKET_COMPLETE");
  } finally {
    Math.random = originalRandom;
  }
});
