module.exports = {
  type: "dice",

  markets() {
    return ["SUM", "PRODUCT", "RANGE", "EVENS", "ODDS"].map((name) => ({ id: name, name }));
  },

  // Called by tick/updateMarket
  tick({ game }) {
    const roll = Math.floor(Math.random() * 30) + 1;
    const rolls = [...(game.rolls || []), roll];
    return { rolls, event: { type: "DICE_ROLL", payload: { roll } } };
  },

  // Called by closeGame
  finalize(game) {
    const rolls = game.rolls || [];
    if (!rolls.length) {
      return { SUM: 0, PRODUCT: 0, RANGE: 0, EVENS: 0, ODDS: 0 };
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    const prod = rolls.reduce((a, b) => a * b, 1);
    const range = Math.max(...rolls) - Math.min(...rolls);
    const sumEvens = rolls.filter(x => x % 2 === 0).reduce((a,b)=>a+b,0);
    const sumOdds  = rolls.filter(x => x % 2 === 1).reduce((a,b)=>a+b,0);
    return {
      SUM: sum,
      PRODUCT: prod,
      RANGE: range,
      EVENS: sumEvens ** 2,
      ODDS: sumOdds ** 2,
    };
  },
};