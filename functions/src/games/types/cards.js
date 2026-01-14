module.exports = {
  type: "cards",

  markets() {
    return ["2s", "3s", "4s", "5s", "6s"].map((name) => ({ id: name, name }));
  },

  tick({ game }) {
    const rolls = game.rolls || [];
    const all = [1,2,3,4,5,6,7,8,9,10];
    const remaining = all.filter(x => !rolls.includes(x));
    if (!remaining.length) return { rolls, event: { type: "CARDS_DONE", payload: {} } };
    const card = remaining[Math.floor(Math.random() * remaining.length)];
    return { rolls: [...rolls, card], event: { type: "CARD_SELECTED", payload: { card } } };
  },

  finalize(game) {
    const rolls = game.rolls || [];
    const all = [1,2,3,4,5,6,7,8,9,10];
    const remaining = all.filter(x => !rolls.includes(x));

    const sumEvens = remaining.filter(x => x % 2 === 0).reduce((a,b)=>a+b,0);
    const sumMult3 = remaining.filter(x => x % 3 === 0).reduce((a,b)=>a+b,0);
    const gt4 = remaining.filter(x => x > 4);
    const le5 = remaining.filter(x => x <= 5);
    const sum6p = remaining.filter(x => x >= 6).reduce((a,b)=>a+b,0);

    return {
      "2s": sumEvens ** 2,
      "3s": sumMult3 ** 3,
      "4s": gt4.length ? gt4.reduce((a,b)=>a*b,1) : 0,
      "5s": le5.length ? (Math.min(...le5) ** 5) : 0,
      "6s": sum6p * 6,
    };
  },
};