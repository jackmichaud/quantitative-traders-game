<script>
    import { createEventDispatcher } from "svelte";

    export let market_data = {buyOrders: [], sellOrders: [], meanPrice: [], filledOrders: []};
    export let team_name
    export let user_id

    let isExpanded = true

    let openOrders = true
    let orderFilter = "all"

    const dispatch = createEventDispatcher()

    let orders = []
    $: if(market_data.buyOrders.length > 0 || market_data.sellOrders.length > 0) {
        if (openOrders) {
            orders = [...market_data.buyOrders, ...market_data.sellOrders]
        } else {
            orders = market_data.filledOrders
        }

        //apply filter
        if (orderFilter === "team") {
            orders = orders.filter(order => order.teamName === team_name);
        } else if (orderFilter === "your") {
            orders = orders.filter(order => order.user === user_id);
        }

        orders.sort((a, b) => a.timestamp - b.timestamp);
        orders = orders
    }

    function cancelOrder(order) {
        dispatch('cancelOrder', order)
    }
</script>

<div class="border-white border rounded-md mt-2">
    <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between">
        <h1 class="text-white text-center font-semibold text-md">Orders</h1>

        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="text-white text-lg hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    {#if isExpanded}
        <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 flex justify-between">
            <div class="flex bg-slate-600 rounded-md relative border">
                <div class="justify-center items-center">
                    <button on:click|preventDefault={() => {openOrders = true}} class="{openOrders ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Open</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {openOrders = false}} class="ml-4 {!openOrders ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Closed</button>
                </div>
            </div>

            <div class="flex bg-slate-600 rounded-md relative border">
                <div class="justify-center items-center">
                    <button on:click|preventDefault={() => {orderFilter = "all"}} class="{orderFilter === "all" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transform transition-transform duration-150">All</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {orderFilter = "team"}} class="ml-4 {orderFilter === "team" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Team</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {orderFilter = "your"}} class="ml-4 {orderFilter === "your" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Yours</button>
                </div>
            </div>
        </div>
        <div class="min-h-32">
            <div class="border-dashed border-b">
                <div class="flex bg-slate-600">
                    <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Market</h1>
                    <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Direction</h1>
                    <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Price</h1>
                    <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">Shares</h1>
                    <h1 class="basis-1/5 text-md font-semibold text-white text-center py-1">Cancel</h1>
                </div>
            </div>
            {#if market_data.buyOrders.length > 0 || market_data.sellOrders.length > 0}
                {#each orders as o}
                    <div class="flex">
                        <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.market}</h1>
                        <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.direction}</h1>
                        <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.price}</h1>
                        <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.shares}</h1>
                        {#if o.teamName === team_name && team_name !== null}
                            <button on:click={() => cancelOrder(o)} class="text-md font-semibold bg-red-400 p-4  text-red-600 text-center py-1 w-1/5">
                                X
                            </button>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="text-md font-semibold text-white text-center p-4 italic">Waiting for orders...</div>
            {/if}
        </div>
    {/if}
</div>