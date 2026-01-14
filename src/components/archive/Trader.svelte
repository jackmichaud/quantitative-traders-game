<script>
    import { dbHandler } from "../stores/dataStore";
    import { joinGame, leaveGame, placeOrder, cancelOrder } from "../lib/cloud_functions";
    import { authStore } from "../stores/authStore";
    import { doc, onSnapshot } from "firebase/firestore";
    import { onMount } from "svelte";
    import LineChart from "./LineChart.svelte";
    import Auth from "./Auth.svelte";
    import OrderBook from "./trader_components/OrderBook.svelte";

    const db = dbHandler.getDB();

    let orders = []
    let markets = ["SUM", "PRODUCT", "AVG", "MAX", "MIN"]
    let news = []
    let bids = []
    let asks = []
    let game_id = ""
    let team_name = ""
    let submitted = false
    let team_balance = 0
    let dice_unsub
    let market_unsub
    let game_doc_unsub
    let game_start_time = null
    let doneGameSetup = false
    let user_doc_unsub
    let chartData = [{rollNumber: 0, sum: 0}]
    let sum = 0
    let num_dice_rolls = 0
    let inGame = false;

    let pendingOrder = {
        price: null,
        shares: null,
        direction: null,
        type: null,
        uuid: null,
        teamName: team_name,
        timestamp: Date.now(),
        market: null
    }

    let time = new Date();

	// these automatically update when `time`
	// changes, because of the `$:` prefix
	$: hours = String(time.getHours()).padStart(2, '0');
	$: minutes = String(time.getMinutes()).padStart(2, '0');
	$: seconds = String(time.getSeconds()).padStart(2, '0');

    // Get real-time updates on user
    const auth_store_unsub = authStore.subscribe((value) => {
        if(value.currentUser !== null) {
            console.log("User is logged in: " + value.currentUser.uid)
            user_doc_unsub = onSnapshot(doc(db, `users/${value.currentUser.uid}`), (doc) => {
                if(doc.data().game.gameID !== null) {
                    console.log("User is in a game: " + doc.data().game.gameID)
                    game_id = doc.data().game.gameID
                    team_name = doc.data().game.teamName
                    submitted = true

                    // Setup game environment
                    setupGameDocListeners()
                } else {
                    console.log("User is not in a game")
                }
            })
        }
    })

    markets = 

    function setupGameDocListeners() {
        // Attach listener to the game document
        game_doc_unsub = onSnapshot(doc(db, `games/${game_id}`), (doc) => {
            // Update the team balance
            team_balance = doc.data().teams.find((team) => team.name === team_name).balance

            if (doc.data().status === "waiting") {
                if(game_start_time !== null) {
                    game_start_time = null
                }
                dice_unsub = null
                market_unsub = null

                console.log("Game is waiting")
                // Add messages about teammates joining here
            } else if(doc.data().status === "active") {
                console.log("Game is in progress")

                if(game_start_time === null && doc.data().start_time !== null) {
                    game_start_time = new Date(doc.data().start_time.seconds * 1000)
                    console.log("Start time: " )

                    news.push({title: "Game starting in 15 seconds!", 
                                content: "", 
                                timestamp: {hours: String(time.getHours()).padStart(2, '0'), minutes: String(time.getMinutes()).padStart(2, '0'), seconds: String(time.getSeconds()).padStart(2, '0')}})
                    news = news
                }

                // Check if listeners have already been attached for dice rolls and markets
                updateListeners()
            } else if(doc.data().status === "done") {
                // Add messages about the game ending here
                news.push({title: "Game over!", 
                            content: "", 
                            timestamp: {hours: String(time.getHours()).padStart(2, '0'), minutes: String(time.getMinutes()).padStart(2, '0'), seconds: String(time.getSeconds()).padStart(2, '0')}})
                news = news

                // Remove listeners
                game_doc_unsub = null
                dice_unsub = null
                market_unsub = null
                team_balance = 0
                game_start_time = null

                console.log("Game has ended")
            }
        })
    }

    function updateListeners() {
        if(dice_unsub === null) {
            console.log("Attaching dice roll listener")

            dice_unsub = onSnapshot(doc(db, `games/${game_id}/game_data/dice_rolls`), (document) => {
                if(document.data().dice.length < 1) return
                let newDice = document.data().dice[document.data().dice.length - 1]

                // Add message about dice rolls
                news.push({title: "Dice Roll", 
                            content: "Die Rolled: " + newDice.die1 + ", Die Rolled: " + newDice.die2, 
                            timestamp: {hours: String(time.getHours()).padStart(2, '0'), minutes: String(time.getMinutes()).padStart(2, '0'), seconds: String(time.getSeconds()).padStart(2, '0')}})
                news = news

                // Update chart data
                num_dice_rolls += 1
                sum += newDice.die1 + newDice.die2
                chartData.push({rollNumber: num_dice_rolls, sum: sum})
                chartData = chartData
            });
        }
        if(market_unsub === null) {
            market_unsub = onSnapshot(doc(db, `games/${game_id}/game_data/sum_market`), (doc) => {
                bids = doc.data().limit_buy_orders
                asks = doc.data().limit_sell_orders
                orders = [...doc.data().market_orders, ...bids, ...asks]
                orders.sort((a, b) => a.timestamp - b.timestamp);
            })
        }
        return dice_unsub, market_unsub, game_start_time
    }

    // Handle join/leave game
    function handleSubmit() {
        if(submitted && game_id.length <= 4) {
            alert("The game ID must be at least 5 characters long")
            return
        } else if (submitted && team_name.length <= 4) {
            alert("The team name must be at least 5 characters long")
            return
        } else if (game_id.length <= 4 || team_name.length <= 4) {
            return
        }

        if(!submitted && game_id.length > 4 && team_name.length > 4) {
            joinGame({game_id, team_name})
            .then((response) => {
                // Game succesfully joined
                news.push({title: "Joined Game", content: response.data, timestamp: {hours: String(time.getHours()).padStart(2, '0'), minutes: String(time.getMinutes()).padStart(2, '0'), seconds: String(time.getSeconds()).padStart(2, '0')}})
                news = news
                submitted = !submitted
                inGame = true
            })
            .catch((error) => alert(error.message))
        } else {
            leaveGame({game_id, team_name})
            .then((response) => {
                news.push({title: "Left Game", content: response.data, timestamp: {hours: String(time.getHours()).padStart(2, '0'), minutes: String(time.getMinutes()).padStart(2, '0'), seconds: String(time.getSeconds()).padStart(2, '0')}})
                submitted = !submitted
                inGame = false;
            })
            .catch((error) => alert(error.message))
        }
    }

    // Handle submitting new order
    function _placeOrder() {
        if(game_start_time === null) {
            alert("Game has not started yet")
            return
        }

        if((pendingOrder.price <= 0 && pendingOrder.type !== 'market') || pendingOrder.shares <= 0 || pendingOrder.direction == null || pendingOrder.type == null) {
            alert("Please fill out all fields to place a valid order")
        } else {
            // Set pending order timestamp
            if (pendingOrder.type === 'market') {pendingOrder.price = "market"}
            pendingOrder.timestamp = Date.now()
            pendingOrder.teamName = team_name

            // Call cloud function to place order
            placeOrder(pendingOrder)
            .catch((error) => alert(error.message))
            // Zero out pending order
            pendingOrder = {
                price: null,
                shares: null,
                direction: null,
                type: null,
                uuid: null,
                teamName: team_name,
                timestamp: Date.now(),
                market: null
            }
        }
    }

    function _cancelOrder(order) {
        cancelOrder({order: order})
        .catch((error) => alert(error.message))
    }

    function tickTime() {
        const interval = setInterval(() => {
			time = new Date();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
    }
    
    tickTime()

    let ligma = [{rollNumber: 1, sum: 7}, {rollNumber: 2, sum: 17}, {rollNumber: 3, sum: 18}, {rollNumber: 4, sum: 32}, {rollNumber: 5, sum: 39}]
    
</script>

<div class="flex flex-row flex-grow">
    <div class="basis-3/4 border-white ml-2 mr-1 my-2 rounded-md">
        <div class="basis-1/4 border-white rounded-md">
            <div class="bg-slate-700 p-2 rounded-md border flex justify-center items-center text-md text-black font-semibold">
                <h1 class="bg-orange-500 px-2 mr-4 py-2 rounded-md text-slate-700">{#if game_start_time === null}{hours + ":" + minutes + ":" + seconds}
                    {:else}Game Clock: {5 - (Math.abs(minutes - game_start_time.getMinutes()) % 60)}:{60 - (Math.abs(seconds - game_start_time.getSeconds()) % 60)}{/if}</h1>
                <form>
                    <input bind:value={team_name} class="bg-slate-700 pl-2 mr-2 py-2 rounded-md border border-white text-white outline-orange-500" placeholder="Team Name" disabled={submitted}/>
                    <input bind:value={game_id} class="bg-slate-700 pl-2 ml-2 py-2 rounded-md border border-white text-white outline-orange-500" placeholder="Game ID" disabled={submitted}/>
                    <button on:click={handleSubmit} class="text-white border p-2 ml-4 rounded-md">{#if !inGame}Join Game{:else}Leave Game{/if}</button>
                </form>
            </div>
        </div>
        <div class="flex flex-row">
            <div class="basis-1/4 border-white mr-1 my-2 rounded-md">
                <div class="border-white border mb-2 rounded-md">
                    <div class="bg-slate-700 rounded-t-md border-b">
                        <h1 class="text-center text-white font-semibold py-2 text-md">Market Chart</h1>
                    </div>
                    <LineChart bind:data={chartData}/>
                </div>
                <OrderBook bids={bids} asks={asks} team_name={team_name}/>
            </div>
            <div class="basis-3/4 border-white ml-1 my-2 rounded-md">
                <div class="border-white border mb-2 rounded-md">
                    <div class="bg-slate-700 rounded-t-md flex p-2 justify-between">
                        <div class="flex align-middle">
                            <h1 class="ml-4 text-white font-semibold py-2 text-md">Order Direction:</h1>
                            <button on:click={() => {pendingOrder.direction = 'buy'}} class="ml-4 {pendingOrder.direction === 'buy' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-md rounded-md">Buy</button>
                            <button on:click={() => {pendingOrder.direction = 'sell'}} class="ml-4 {pendingOrder.direction === 'sell' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-md rounded-md">Sell</button>
                        </div>
                        <div class="flex akign-middle">
                            <h1 class="ml-4 text-white font-semibold py-2 text-md">Shares:</h1>
                            <input bind:value={pendingOrder.shares} type=number class="bg-slate-700 pl-2 ml-2 py-2 rounded-md border font-semibold border-white text-white outline-orange-500" placeholder="Shares"/>
                        </div>
                    </div>
                    <div class="bg-slate-700 flex p-2 justify-between">
                        <div class="flex align-middle">
                            <h1 class="ml-4 text-white font-semibold py-2 text-md">Order Type:</h1>
                            <button on:click={() => {pendingOrder.type = 'market'}} class="ml-4 {pendingOrder.type === 'market' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-md rounded-md">Market</button>
                            <button on:click={() => {pendingOrder.type = 'limit'}} class="ml-4 {pendingOrder.type === 'limit' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-md rounded-md">Limit</button>
                        </div>
                        <div class="flex align-middle">
                            <h1 class="ml-4 text-white font-semibold py-2 text-md">Price:</h1>
                            <input bind:value={pendingOrder.price} type=number class="bg-slate-700 pl-2 ml-2 py-2 rounded-md border font-semibold border-white text-white outline-orange-500" placeholder="Price" disabled={pendingOrder.type === 'market'}/>
                        </div>
                    </div>
                    <div class="bg-slate-700 rounded-b-md flex border-t border-dashed justify-between text-white font-semibold p-2">
                        <div class="flex">
                            <h1 class="ml-4 text-white font-semibold py-2 text-md">Place Order:</h1>
                            {#if pendingOrder.shares !== null && (pendingOrder.shares > 1000 || pendingOrder.shares <= 0)}
                                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2">Please enter a number of shares between 0 and 1000!</h1>
                            {:else if pendingOrder.type === 'limit' && pendingOrder.price !== null && (pendingOrder.price <= 0)}
                                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2">Please enter a price greater than 0!</h1>
                            {:else if pendingOrder.type === 'limit' && (pendingOrder.shares * pendingOrder.price <= 0)}
                                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2">Make sure total cost is greater than 0!</h1>
                            {:else}
                                <button on:click={_placeOrder} class="ml-4 bg-orange-500 text-slate-700 font-semibold w-32 text-md rounded-md">Place Order</button>
                            {/if}
                            
                        </div>
                        <h1 class="ml-4 my-2">Total Cost: ${pendingOrder.type === 'limit' ? pendingOrder.shares * pendingOrder.price : 'Market'}</h1>
                    </div>
                </div>
                <div class="border-white border mt-2 rounded-md">
                    <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2">
                        <h1 class="text-white text-center font-semibold text-md">Open Orders</h1>
                    </div>
                    <div class="min-h-32">
                        <div class="border-dashed border-b">
                            <div class="flex">
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Market</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Direction</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Price</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Shares</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center py-1">Cancel</h1>
                            </div>
                        </div>
                        {#each orders as o}
                            <div class="flex">
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">sum</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.direction}</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.price}</h1>
                                <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.shares}</h1>
                                {#if o.teamName === team_name}
                                    <button on:click={() => _cancelOrder(o)} class="text-md font-semibold bg-red-400 p-4  text-red-600 text-center py-1 w-1/5">
                                        X
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
        <div class="border bg-slate-700 p-2 rounded-md flex justify-around items-center text-md text-black font-semibold">
            <div class="justify-center items-center flex mr-2">
                <h1 class="text-white font-semibold text-md mr-2">Market: </h1>
                <select name="markets" id="market" class="bg-slate-700 border rounded-md p-2 text-white ml-2 text-md">
                    {#each markets as market}
                        <option value={market}>{market}</option>
                    {/each}
                </select>
            </div>
            <h1 class="text-white font-semibold py-2 text-md ml-2">Team Balance: ${team_balance}</h1>
        </div>
    </div>
    <div class="basis-1/4 border-white border ml-1 mr-2 my-2 rounded-md">
        <div class="bg-slate-700 rounded-t-md border-b">
            <h1 class="text-center text-white font-semibold py-2 text-md">News</h1>
        </div>
        {#each news as n}
            <div class="bg-slate-600 rounded-md my-2 border border-dashed">
                <div class="flex content-between">
                    <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-md">{n.title}</h1>
                    <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-sm italic">{n.timestamp.hours}:{n.timestamp.minutes}:{n.timestamp.seconds}</h1>
                </div>
                <h1 class="mx-2 my-0 text-white font-semibold py-2 text-sm">{n.content}</h1>
            </div>
        {/each}
    </div>
</div>