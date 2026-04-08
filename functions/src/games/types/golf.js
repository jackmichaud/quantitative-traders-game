module.exports = {
  type: "golf",

  markets() {
    return ["SCORE", "BIRDIES", "BOGEYS", "EAGLES"].map((name) => ({ id: name, name }));
  },

  tick({ game }) {
    const holes = [...(game.holes || [])];
    const rand = Math.random();
    let score, scoreName;
    if      (rand < 0.05) { score = -2; scoreName = "EAGLE"; }
    else if (rand < 0.30) { score = -1; scoreName = "BIRDIE"; }
    else if (rand < 0.75) { score =  0; scoreName = "PAR"; }
    else if (rand < 0.90) { score =  1; scoreName = "BOGEY"; }
    else                  { score =  2; scoreName = "DOUBLE_BOGEY"; }
    holes.push(score);
    return {
      holes,
      event: { type: "HOLE_PLAYED", payload: { score, scoreName, holeNumber: holes.length } },
    };
  },

  finalize(game) {
    const holes = game.holes || [];
    const total   = holes.reduce((a, b) => a + b, 0);
    const birdies = holes.filter(s => s === -1).length;
    const eagles  = holes.filter(s => s === -2).length;
    const bogeys  = holes.filter(s => s ===  1).length;
    return {
      SCORE:   36 + total,
      BIRDIES: birdies * 10,
      BOGEYS:  bogeys  * 20,
      EAGLES:  eagles  * 50,
    };
  },
};
