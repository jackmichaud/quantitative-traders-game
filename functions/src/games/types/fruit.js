const FRUITS = {
  apple: { label: "Apple", count: 6, value: 8, sweetness: 6 },
  banana: { label: "Banana", count: 5, value: 6, sweetness: 8 },
  orange: { label: "Orange", count: 4, value: 7, sweetness: 5 },
  grapes: { label: "Grapes", count: 4, value: 5, sweetness: 9 },
  pear: { label: "Pear", count: 3, value: 9, sweetness: 7 },
  dragonFruit: { label: "Dragon fruit", count: 2, value: 15, sweetness: 10 },
};

const MAX_DRAWS = 8;
const CRATE = Object.entries(FRUITS).flatMap(([fruit, config]) =>
  Array(config.count).fill(fruit)
);

function remainingCrate(drawnFruits) {
  const remaining = [...CRATE];

  for (const fruit of drawnFruits) {
    const index = remaining.indexOf(fruit);
    if (index >= 0) remaining.splice(index, 1);
  }

  return remaining;
}

module.exports = {
  type: "fruit",

  markets() {
    return ["VALUE", "SWEETNESS", "CITRUS", "VARIETY", "RARE"].map((name) => ({
      id: name,
      name,
    }));
  },

  tick({ game }) {
    const fruits = Array.isArray(game.fruits) ? [...game.fruits] : [];

    if (fruits.length >= MAX_DRAWS) {
      return {
        fruits,
        event: { type: "FRUIT_BASKET_COMPLETE", payload: { draws: fruits.length } },
      };
    }

    const remaining = remainingCrate(fruits);
    const fruit = remaining[Math.floor(Math.random() * remaining.length)];
    const config = FRUITS[fruit];
    const nextFruits = [...fruits, fruit];

    return {
      fruits: nextFruits,
      event: {
        type: "FRUIT_DRAWN",
        payload: {
          fruit,
          fruitName: config.label,
          value: config.value,
          sweetness: config.sweetness,
          drawNumber: nextFruits.length,
          remainingInCrate: remaining.length - 1,
        },
      },
    };
  },

  finalize(game) {
    const fruits = (Array.isArray(game.fruits) ? game.fruits : [])
      .slice(0, MAX_DRAWS)
      .filter((fruit) => FRUITS[fruit]);

    const value = fruits.reduce((total, fruit) => total + FRUITS[fruit].value, 0);
    const sweetness = fruits.reduce((total, fruit) => total + FRUITS[fruit].sweetness, 0);
    const oranges = fruits.filter((fruit) => fruit === "orange").length;
    const dragonFruits = fruits.filter((fruit) => fruit === "dragonFruit").length;
    const variety = new Set(fruits).size;

    return {
      VALUE: value,
      SWEETNESS: sweetness,
      CITRUS: oranges * 20,
      VARIETY: (variety ** 2) * 4,
      RARE: dragonFruits * 50,
    };
  },
};
