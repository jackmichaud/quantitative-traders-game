import { realtime } from "../lib/firebase";
import { ref, onValue, push, set, serverTimestamp } from "firebase/database";

export const gameLogic = {
    gameRef: ref(realtime, 'games'),
    currentGame: null,
  
    async startGame(hostId) {
      const newGameRef = push(this.gameRef);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour game
  
      await set(newGameRef, {
        hostId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'running',
        lastDiceRoll: null,
        market: {
          price: 100, // Initial market price
        },
        news: [],
        teams: {},
      });
  
      this.currentGame = newGameRef.key;
      this.startDiceRollScheduler();
      return this.currentGame;
    },
  
    startDiceRollScheduler() {
      const gameRef = ref(realtime, `games/${this.currentGame}`);
      let lastMinute = -1;
  
      onValue(gameRef, (snapshot) => {
        const game = snapshot.val();
        if (game.status !== 'running') return;
  
        const now = new Date();
        const currentMinute = now.getMinutes();
  
        if (currentMinute !== lastMinute) {
          this.rollDice();
          lastMinute = currentMinute;
        }
      });
    },
  
    async rollDice() {
      const roll1 = Math.floor(Math.random() * 6) + 1;
      const roll2 = Math.floor(Math.random() * 6) + 1;
      const total = roll1 + roll2;
  
      const rollRef = ref(realtime, `games/${this.currentGame}/diceRolls`);
      await push(rollRef, {
        roll1,
        roll2,
        total,
        timestamp: serverTimestamp(),
      });
  
      await this.updateMarket(total);
      await this.addNewsItem(`Dice roll: ${roll1} + ${roll2} = ${total}`);
    },
  
    async updateMarket(diceRoll) {
      const marketRef = ref(realtime, `games/${this.currentGame}/market`);
      const snapshot = await get(marketRef);
      const currentPrice = snapshot.val().price;
  
      let newPrice = currentPrice;
      if (diceRoll < 7) {
        newPrice *= 0.95; // Price decreases by 5% for low rolls
      } else if (diceRoll > 7) {
        newPrice *= 1.05; // Price increases by 5% for high rolls
      }
  
      await set(marketRef, { price: newPrice });
      await this.addNewsItem(`Market price updated to $${newPrice.toFixed(2)}`);
    },
  
    async placeOrder(teamId, order) {
      if (order.shares > 100) {
        throw new Error('Cannot trade more than 100 shares at once');
      }
  
      const orderRef = ref(realtime, `games/${this.currentGame}/orders`);
      await push(orderRef, {
        teamId,
        ...order,
        timestamp: serverTimestamp(),
      });
  
      await this.processOrder(teamId, order);
    },
  
    async processOrder(teamId, order) {
      const teamRef = ref(realtime, `games/${this.currentGame}/teams/${teamId}`);
      const marketRef = ref(realtime, `games/${this.currentGame}/market`);
  
      const [teamSnapshot, marketSnapshot] = await Promise.all([
        get(teamRef),
        get(marketRef),
      ]);
  
      const team = teamSnapshot.val() || { balance: 1000, shares: 0 }; // Default values if team doesn't exist
      const marketPrice = marketSnapshot.val().price;
  
      let price = order.type === 'market' ? marketPrice : order.price;
      let cost = price * order.shares;
  
      if (order.action === 'buy') {
        if (team.balance < cost) {
          throw new Error('Insufficient funds');
        }
        team.balance -= cost;
        team.shares += order.shares;
      } else { // sell
        if (team.shares < order.shares) {
          throw new Error('Insufficient shares');
        }
        team.balance += cost;
        team.shares -= order.shares;
      }
  
      await set(teamRef, team);
      await this.addNewsItem(`Team ${teamId} placed a ${order.action} order for ${order.shares} shares at $${price}`);
    },
  
    async addNewsItem(content) {
      const newsRef = ref(realtime, `games/${this.currentGame}/news`);
      await push(newsRef, {
        content,
        timestamp: serverTimestamp(),
      });
    },
  
    listenToGameUpdates(callback) {
      const gameRef = ref(realtime, `games/${this.currentGame}`);
      onValue(gameRef, (snapshot) => {
        const gameData = snapshot.val();
        callback(gameData);
      });
    },
  
    async joinTeam(gameId, teamId) {
      this.currentGame = gameId;
      const teamRef = ref(realtime, `games/${gameId}/teams/${teamId}`);
      const snapshot = await get(teamRef);
      if (!snapshot.exists()) {
        await set(teamRef, { balance: 1000, shares: 0 });
      }
      return teamId;
    },
  
    getPredictionScore(team) {
      // This is a simple scoring function. You might want to make this more sophisticated.
      return team.balance + (team.shares * this.getCurrentMarketPrice());
    },
  
    async getCurrentMarketPrice() {
      const marketRef = ref(realtime, `games/${this.currentGame}/market`);
      const snapshot = await get(marketRef);
      return snapshot.val().price;
    }
  };