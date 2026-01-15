<script>
  import { onDestroy } from "svelte";

  import MarketChart from "../components/trader_components/MarketChart.svelte";
  import NewsDisplay from "../components/trader_components/NewsDisplay.svelte";
  import OpenOrders from "./trader_components/OpenOrders.svelte";
  import OrderPlacer from "./trader_components/OrderPlacer.svelte";
  import OrderBook from "./trader_components/OrderBook.svelte";
  import TeamTab from "./trader_components/TeamTab.svelte";
  import GameOver from "./trader_components/GameOver.svelte";
  import TeamDisplay from "./trader_components/TeamDisplay.svelte";

  import { dbHandler } from "../stores/dataStore";
  import { authStore } from "../stores/authStore";

  import {
    doc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
  } from "firebase/firestore";

  import { placeOrder, cancelOrder } from "../lib/cloud_functions";

  const db = dbHandler.getDB();

  // ---------- Safe unsubscribe defaults ----------
  const noop = () => {};

  let authUnsub = noop;
  let userUnsub = noop;

  let gameUnsub = noop;
  let teamUnsub = noop;
  let teamPlayersUnsub = noop;

  let marketUnsub = noop;
  let bidsUnsub = noop;
  let asksUnsub = noop;
  let openOrdersUnsub = noop;
  let tradesUnsub = noop;

  // ---------- User/game identity ----------
  let uid = null;
  let inGame = false;

  let gameId = "";
  let teamId = "";

  // ---------- Game doc ----------
  let game = null;
  let game_state = "nothing";

  // Optional: if you haven’t migrated news/events yet, keep empty
  let news = [];

  // ---------- Team data ----------
  let teamData = null; // {name,balance,players:[{uid,email,balance}]}
  let team_name = "";

  // ---------- Markets ----------
  let gameType = null;
  let market_types = [];
  let current_market = null;

  // market summary doc (bestBid/bestAsk/lastPrice/finalPrice)
  let marketDoc = null;

  // orderbook derived from queries
  let bids = [];
  let asks = [];

  // open orders for this user in current market
  let openOrders = [];

  // chart derived from trades (last N trades)
  let chartData = [];

  // ---------- Order placing ----------
  let pending_order;
  let awaiting_update = false;

  // Adapter object so your existing components can stay mostly unchanged
  $: market_data = {
    buyOrders: bids.map((o) => ({ ...o, teamName: o.teamId })), // teamName field kept for UI
    sellOrders: asks.map((o) => ({ ...o, teamName: o.teamId })),
    meanPrice: chartData,
    filledOrders: []
  };

  // ---------- Helpers ----------
  function inferMarketTypes(type) {
    if (type === "dice") return ["SUM", "PRODUCT", "RANGE", "EVENS", "ODDS"];
    if (type === "cards") return ["2s", "3s", "4s", "5s", "6s"];
    return [];
  }

  function cleanupGameSubs() {
    gameUnsub(); gameUnsub = noop;
    teamUnsub(); teamUnsub = noop;
    teamPlayersUnsub(); teamPlayersUnsub = noop;
  }

  function cleanupMarketSubs() {
    marketUnsub(); marketUnsub = noop;
    bidsUnsub(); bidsUnsub = noop;
    asksUnsub(); asksUnsub = noop;
    openOrdersUnsub(); openOrdersUnsub = noop;
    tradesUnsub(); tradesUnsub = noop;
  }

  function cleanupAll() {
    userUnsub(); userUnsub = noop;
    cleanupGameSubs();
    cleanupMarketSubs();
  }

  function resetGame() {
    game = null;
    game_state = "nothing";
    news = [];
    gameType = null;
    market_types = [];
    current_market = null;

    teamData = null;
    team_name = "";
  }

  function resetMarket() {
    marketDoc = null;
    bids = [];
    asks = [];
    openOrders = [];
    chartData = [];
  }

  function resetAll() {
    resetGame();
    resetMarket();
    inGame = false;
    gameId = "";
    teamId = "";
  }

  // ---------- Auth subscription ----------
  // IMPORTANT: assign authUnsub before anything might reference it
  authUnsub = authStore.subscribe((curr) => {
    const user = curr?.currentUser;

    if (!user) {
      uid = null;
      resetAll();
      cleanupAll();
      return;
    }

    uid = user.uid;

    // Subscribe to user doc exactly once per mount
    if (userUnsub === noop) {
      userUnsub = onSnapshot(doc(db, `users/${uid}`), (snap) => {
        const userData = snap.data() || {};
        const cg = userData.currentGame || null;

        if (cg?.gameId && cg?.teamId) {
          inGame = true;
          gameId = cg.gameId;
          teamId = cg.teamId;
        } else {
          inGame = false;
          gameId = "";
          teamId = "";
          gameType = null;
          market_types = [];
          current_market = null;
        }
      });
    }
  });

  // ---------- Game subscriptions ----------
  $: if (inGame && gameId) {
    // game doc
    if (gameUnsub === noop) {
      gameUnsub = onSnapshot(doc(db, `games/${gameId}`), (snap) => {
        game = snap.data() || null;
        game_state = game?.status || "nothing";
        gameType = game?.type || null;

        // If you want events as "news", add another listener to games/{gameId}/events.
        news = [];

        // Markets list
        const mt = inferMarketTypes(gameType);
        market_types = mt;
        if (!current_market && mt.length) current_market = mt[0];
      });
    }

    // team doc
    if (teamId && teamUnsub === noop) {
      teamUnsub = onSnapshot(doc(db, `games/${gameId}/teams/${teamId}`), (snap) => {
        const t = snap.data() || null;
        team_name = t?.name || "";
        // keep any existing players array already populated
        teamData = {
          name: t?.name || team_name,
          balance: t?.balance || 0,
          players: teamData?.players || []
        };
      });
    }

    // team players subcollection
    if (teamId && teamPlayersUnsub === noop) {
      teamPlayersUnsub = onSnapshot(collection(db, `games/${gameId}/teams/${teamId}/players`), (snap) => {
        const players = snap.docs.map((d) => {
          const p = d.data() || {};
          return {
            uid: d.id,
            email: p.email || "",
            balance: p.pnl || 0
          };
        });

        teamData = {
          name: teamData?.name || team_name,
          balance: teamData?.balance || 0,
          players
        };
      });
    }
  } else {
    // left game
    cleanupGameSubs();
    cleanupMarketSubs();
    resetGame();
    resetMarket();
  }

  // ---------- Market subscriptions ----------
  $: if (inGame && gameId && current_market) {
    resubscribeMarket();
  } else {
    cleanupMarketSubs();
    resetMarket();
  }

  function resubscribeMarket() {
    // Tear down prior market subs before creating new ones
    cleanupMarketSubs();

    const marketPath = `games/${gameId}/markets/${current_market}`;

    // Market doc
    marketUnsub = onSnapshot(doc(db, marketPath), (snap) => {
      marketDoc = snap.data() || null;
    });

    const ordersCol = collection(db, `${marketPath}/orders`);

    // bids
    const bidsQ = query(
      ordersCol,
      where("status", "==", "open"),
      where("side", "==", "buy"),
      orderBy("price", "desc"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    bidsUnsub = onSnapshot(bidsQ, (snap) => {
      bids = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });

    // asks
    const asksQ = query(
      ordersCol,
      where("status", "==", "open"),
      where("side", "==", "sell"),
      orderBy("price", "asc"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    asksUnsub = onSnapshot(asksQ, (snap) => {
      asks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });

    // my open orders in this market
    const myOrdersQ = query(
      ordersCol,
      where("userId", "==", uid),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    openOrdersUnsub = onSnapshot(myOrdersQ, (snap) => {
      openOrders = snap.docs.map((d) => ({ id: d.id, marketId: current_market, ...d.data() }));
    });

    // trades -> chart data
    const tradesCol = collection(db, `${marketPath}/trades`);
    const tradesQ = query(tradesCol, orderBy("createdAt", "asc"), limit(200));
    tradesUnsub = onSnapshot(tradesQ, (snap) => {
      chartData = snap.docs.map((d) => {
        const t = d.data() || {};
        return { price: t.price, timestamp: t.createdAt };
      });
    });
  }

  // compatibility handler (TeamTab emits marketChange)
  function updateMarket() {
    // no-op: resubscribeMarket() is driven by reactive current_market
  }

  async function _placeOrder() {
    awaiting_update = true;
    try {
      if (!inGame) throw new Error("Please join a game first.");
      if (!current_market) throw new Error("Please select a market.");
      if (!pending_order) throw new Error("Please enter an order.");

      const { type: orderType, direction, price, shares } = pending_order;

      if (!["buy", "sell"].includes(direction)) throw new Error("Invalid direction.");
      if (!Number.isFinite(shares) || shares <= 0) throw new Error("Shares must be > 0.");

      let px = price;

      // emulate market orders by taking top-of-book
      if (orderType === "market") {
        if (direction === "buy") {
          if (!asks.length) throw new Error("No asks available.");
          px = asks[0].price;
        } else {
          if (!bids.length) throw new Error("No bids available.");
          px = bids[0].price;
        }
      } else {
        if (!Number.isFinite(px) || px <= 0) throw new Error("Price must be > 0.");
      }

      await placeOrder({
        marketId: current_market,
        side: direction,
        price: px,
        shares
      });
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      awaiting_update = false;
    }
  }

  async function _cancelOrder(event) {
    try {
      const order = event.detail; // expect {id, marketId, ...}
      if (!order?.id || !order?.marketId) throw new Error("Invalid order.");
      await cancelOrder({ marketId: order.marketId, orderId: order.id });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  onDestroy(() => {
    cleanupAll();
    authUnsub(); authUnsub = noop;
  });
</script>

<main class="flex flex-row flex-grow">
  <div class="basis-1/4 m-2">
    {#if inGame && teamData}
      <TeamDisplay bind:teamData={teamData} />
    {/if}

    <MarketChart bind:chartData={market_data.meanPrice}
                 start_time={game?.startAt}
                 bind:title={current_market} />

    <OrderBook bind:bids={market_data.buyOrders}
               bind:asks={market_data.sellOrders}
               bind:team_name={team_name} />
  </div>

  {#if game_state === "closed"}
    <GameOver leaderboard={game?.leaderboard} />
  {:else}
    <div class="basis-2/4 my-2">
      <TeamTab on:marketChange={updateMarket}
               bind:markets={market_types}
               bind:selected_market={current_market}
               start_time={game?.startAt} />

      <OrderPlacer bind:pendingOrder={pending_order}
                   highest_bid={market_data.buyOrders[0]?.price || 0}
                   lowest_ask={market_data.sellOrders[0]?.price || 0}
                   on:placeOrder={_placeOrder}
                   bind:awaiting_update={awaiting_update} />

      <!-- NOTE: OpenOrders.svelte should accept `openOrders` now -->
      <OpenOrders {openOrders} on:cancelOrder={_cancelOrder} />
    </div>
  {/if}

  <div class="basis-1/4 m-2">
    <NewsDisplay bind:news={news} />
  </div>
</main>