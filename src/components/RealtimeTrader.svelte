<script>
  import { onMount, onDestroy } from 'svelte';
  import JoinGame from '../components/trader_components/JoinGame.svelte';
  import MarketChart from '../components/trader_components/MarketChart.svelte';
  import NewsDisplay from '../components/trader_components/NewsDisplay.svelte';
  import OpenOrders from './trader_components/OpenOrders.svelte';
  import OrderPlacer from './trader_components/OrderPlacer.svelte';
  import OrderBook from './trader_components/OrderBook.svelte';
  import TeamTab from './trader_components/TeamTab.svelte';
  import { dbHandler } from '../stores/dataStore';
  import { authStore } from '../stores/authStore';
  import { doc, onSnapshot } from "firebase/firestore";
  import { joinGame, leaveGame, placeOrder, cancelOrder } from "../lib/cloud_functions";
  import GameOver from './trader_components/GameOver.svelte';
  import { startGame, rollDice, endGame, createGame, closeGame } from "../lib/cloud_functions";

  const db = dbHandler.getDB();

  // Data about the game
  let team_name = '';
  let game_id = ''; 
  let gameType = null;
  let inGame = false;
  let game_data = null;
  let profit_loss = 0;

  // Data about upcoming order
  let pending_order;

  // Data about markets
  let market_types = [];
  let current_market = null;
  let market_data = {buyOrders: [], sellOrders: [], meanPrice: []};
  let news = [];
  let game_state = "nothing"
  let official = false;

  // Listeners
  let user_doc_unsub = null;
  let game_doc_unsub = null;
  let current_market_unsub = null;
  let awaiting_update = false;

  //User data
  let uid = null;

  // Subscribe to current user
  authStore.subscribe((curr) => {
    let user = curr?.currentUser;
    if(user) {
      console.log("Signed in as: " + user.email);
      uid = user.uid;
      // Get real-time updates on user doc
      if (!user_doc_unsub) {
        user_doc_unsub = onSnapshot(doc(db, `users/${user.uid}`), (doc) => {
          const userData = doc.data();
          //send user data to the auth store
          authStore.update((current) => {
            return {...current, game: userData.game}
          });

          if(userData.game.gameID !== null) {
            console.log("User is in a game: " + userData.game.gameID);
            game_id = userData.game.gameID;
            team_name = userData.game.teamName;
            gameType = userData.game.type;
            official = userData.game.official;
            inGame = true;
          } else {
            console.log("User is not in a game");
            inGame = false;
            gameType = null;
            game_id = '';
          }
        });
        
      }
    } else {
      console.log("Signed out");
      if(user_doc_unsub) {
        user_doc_unsub();
        user_doc_unsub = null;
      }
      inGame = false;
      gameType = null;
      game_id = '';
    }
  });

  // Subscribe to game doc if in game
  $: if (inGame && game_id) {
    if (!game_doc_unsub) {
      console.log("Subscribing to game: " + game_id);
      let collectionName = 'games';
      if(!official) {
        collectionName = 'unofficial_games';
      }
      game_doc_unsub = onSnapshot(doc(db, `${collectionName}/${game_id}`), (doc) => {
        game_data = doc.data();

        news = game_data.news;
        game_state = game_data.status;

        // Export game_data as a CSV file
        // const csv = csvmaker(game_data.leaderboard);
        // downloadCSV(csv);
      });
    }
  } else {
    if (game_doc_unsub) {
      console.log("Unsubscribing from game: " + game_id);
      game_doc_unsub();
      game_doc_unsub = null;
    }
    game_data = null;
    news = [];
    game_state = "nothing"
  }

  // Update market selector based on game type
  $: if (gameType === 'dice' && market_types.length === 0) {
    console.log("Dice game selected");
    market_types = ['SUM', 'EVENS', 'ODDS', 'RANGE'];
    current_market = 'SUM';
  } else if (gameType === 'cards' && market_types.length === 0) {
    console.log("Card game selected");
    market_types = ['2s', '3s', '4s', '5s', '6s'];
    current_market = '2s';
  } else if (gameType !== 'dice' && gameType !== 'cards') {
    console.log("No game or non-dice game selected");
    market_types = [];
    current_market = null;
  }

  // Update market data and generate listener
  $: if (current_market && game_id) {
    if (!current_market_unsub) {
      console.log("Subscribing to market: " + current_market);
      let collectionName = 'games';
      if(!official) {
        collectionName = 'unofficial_games';
      }
      current_market_unsub = onSnapshot(doc(db, `${collectionName}/${game_id}/markets/${current_market}`), (doc) => {
        if(doc.id == current_market) {
          market_data = doc.data() || {buyOrders: [], sellOrders: [], meanPrice: [], filledOrders: [], expected_value: 0, ending_price: null};
        }
        
        // Export game_data as a CSV file
        // console.log("Printinng filled orders for " + current_market)
        // const csv = csvmaker(market_data.filledOrders);
        // downloadCSV(csv);
        
      });
    }
  } else {
    if (current_market_unsub) {
      console.log("Unsubscribing from market: " + current_market);
      current_market_unsub();
      current_market_unsub = null;
    }
    market_data = {buyOrders: [], sellOrders: [], meanPrice: []};
  }

  onDestroy(() => {
    if (user_doc_unsub) user_doc_unsub();
    if (game_doc_unsub) game_doc_unsub();
    if (current_market_unsub) current_market_unsub();
  });

  async function updateMarket() {
    if(current_market == null || current_market == undefined) {return}
    console.log("Switching subscription to market: " + current_market);
    let collectionName = 'games';
    if(!official) {
      collectionName = 'unofficial_games';
    }
    current_market_unsub = onSnapshot(doc(db, `${collectionName}/${game_id}/markets/${current_market}`), (doc) => {
      if(doc.id == current_market) {
        market_data = doc.data() || {buyOrders: [], sellOrders: [], meanPrice: [], filledOrders: [], expected_value: 0, ending_price: null};
        
        // console.log("Printinng filled orders for " + current_market)
        // const csv = csvmaker(market_data.filledOrders);
        // downloadCSV(csv);
      }
    });
  }

  async function _placeOrder() {
    if(!inGame) {
      alert("Please join a game first");
      awaiting_update = false;
      return;
    }
    if(!pending_order) {
      alert("Please enter an order");
      awaiting_update = false;
      return;
    }
    if(pending_order.type === 'limit' && pending_order.price <= 0) {
      alert("Please enter a price greater than 0");
      awaiting_update = false;
      return;
    }
    if(pending_order.shares <= 0) {
      alert("Please enter a number of shares greater than 0");
      awaiting_update = false;
      return;
    }
    if((pending_order.type === 'market' && pending_order.direction === 'buy' && market_data.sellOrders.length === 0) ||
      (pending_order.type === 'market' && pending_order.direction === 'sell' && market_data.buyOrders.length === 0)) {
      alert("No market to place order on");
      awaiting_update = false;
      return;
    }

    let { type: orderType, direction: orderDirection, price, shares } = pending_order;

    if(orderType === 'market') {
      price = orderDirection === 'buy' ? market_data.sellOrders[0].price : market_data.buyOrders[0].price;
    }

    try {
      await placeOrder({game_id, teamName: team_name, direction: orderDirection, price, shares, market: current_market});
      console.log("Placed order: " + orderType + " " + price + " " + shares);

      awaiting_update = false;

      //Add market liquidity
      add_market_liquidity();
    } catch (error) {
      awaiting_update = false;
      alert(error.message);
    }
  }

  async function add_market_liquidity() {
    try {
      // Buy a bunch of orders to add liquity to the market
    } catch (error) {
      alert(error.message);
    }
  }

  async function _cancelOrder(event) {
    try {
      await cancelOrder({order: event.detail});
    } catch (error) {
      alert(error.message);
    }
  }

  // Function to create a CSV string from an object
  const csvmaker = (data) => {
    // Empty array for storing the values
    let csvRows = [];

    // Headers is basically a keys of an object which 
    // is id, name, and profession
    const headers = Object.keys(data[0]);

    // As for making csv format, headers must be
    // separated by comma and pushing it into array
    csvRows.push(headers.join(','));

    // Pushing Object values into the array with
    // comma separation

    // Looping through the data values and make
    // sure to align values with respect to headers
    for (const row of data) {
        const values = headers.map(e => {
            return row[e]
        })
        csvRows.push(values.join(','))
    }

    // const values = Object.values(data).join(',');
    // csvRows.push(values)

    // returning the array joining with new line 
    return csvRows.join('\n')
  }

  function downloadCSV(csv) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${current_market}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
</script>

<main class="flex flex-row flex-grow z-0">  
  <div class="basis-1/4 m-2">
    <MarketChart bind:chartData={market_data.meanPrice} start_time={game_data?.start_time} bind:title={current_market}/>
    <OrderBook bind:bids={market_data.buyOrders} bind:asks={market_data.sellOrders} bind:team_name={team_name}/>
  </div>
  {#if game_state === "closed"}
    <GameOver leaderboard={game_data?.leaderboard} />
  {:else}
  <div class="basis-2/4 my-2">
    <TeamTab on:marketChange={updateMarket} bind:markets={market_types} bind:selected_market={current_market} bind:profit_loss={profit_loss} start_time={game_data?.start_time}/>
    <OrderPlacer bind:pendingOrder={pending_order} highest_bid={market_data.buyOrders[0]?.price || 0} lowest_ask={market_data.sellOrders[0]?.price || 0} on:placeOrder={_placeOrder} bind:awaiting_update={awaiting_update}/>
    <OpenOrders bind:team_name={team_name} bind:market_data={market_data} on:cancelOrder={_cancelOrder} />
  </div>
  {/if}
  <div class="basis-1/4 m-2">
    <NewsDisplay bind:news={news}/>
  </div>
</main>
