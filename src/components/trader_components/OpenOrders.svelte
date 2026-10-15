<script>
    import { createEventDispatcher } from "svelte";
    import InfoButton from '../ui/InfoButton.svelte';

    export let market_data = {openOrders: [], closedOrders: []};
    export let user_id
    export let team_id

    let isExpanded = true

    let openOrders = true
    let orderFilter = "all"

    const dispatch = createEventDispatcher()

    function createdAtMillis(order) {
        if (order.createdAt?.toMillis) return order.createdAt.toMillis();
        if (typeof order.createdAt?.seconds === "number") return order.createdAt.seconds * 1000;
        return Number(order.createdAt || 0);
    }

    let orders = []
    $: {
        orders = openOrders ? [...market_data.openOrders] : [...market_data.closedOrders]

        //apply filter
        if (orderFilter === "team") {
            orders = orders.filter(order => order.teamId === team_id);
        } else if (orderFilter === "your") {
            orders = orders.filter(order => order.userId === user_id);
        }

        orders.sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
    }

    function cancelOrder(order) {
        dispatch('cancelOrder', order)
    }
</script>

<div class="border-white border rounded-md mt-2 shadow-black shadow-md">
    <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between">
        <h1 class="text-white text-center font-semibold text-md">Orders</h1>

        <div class="flex items-center gap-2">
            <InfoButton text="Open, filled, and cancelled orders in the current market. Filter by team or yours, and cancel your open orders." />
            <button
                on:click={() => { isExpanded = !isExpanded }}
                class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
                {isExpanded ? '↑' : '↓'}
            </button>
        </div>
    </div>
    {#if isExpanded}
        <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 flex justify-between">
            <div class="flex bg-slate-600 rounded-md border">
                <div class="justify-center items-center">
                    <button on:click|preventDefault={() => {openOrders = true}} class="{openOrders ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Open</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {openOrders = false}} class="ml-4 {!openOrders ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Closed</button>
                </div>
            </div>

            <div class="flex bg-slate-600 rounded-md border">
                <div class="justify-center items-center">
                    <button on:click|preventDefault={() => {orderFilter = "all"}} class="{orderFilter === "all" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">All</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {orderFilter = "team"}} class="ml-4 {orderFilter === "team" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Team</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {orderFilter = "your"}} class="ml-4 {orderFilter === "your" ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Yours</button>
                </div>
            </div>
        </div>
        <div class="min-h-32">
            <div class="border-dashed border-b">
                <div class="flex bg-slate-600">
                    <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">Direction</h1>
                    <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">Price</h1>
                    <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">Shares</h1>
                    <h1 class="basis-1/4 text-md font-semibold text-white text-center py-1">{openOrders ? 'Cancel' : 'Status'}</h1>
                </div>
            </div>
            {#if orders.length > 0}
                {#each orders as o}
                    <div class="flex border-y border-dashed hover:scale-105 hover:shadow-lg transform transition-transform duration-150 bg-slate-500">
                        <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.side}</h1>
                        <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">{o.price}</h1>
                        <h1 class="basis-1/4 text-md font-semibold text-white text-center border-r py-1 border-dashed">{openOrders ? o.sharesRemaining : (o.sharesOriginal ?? o.sharesRemaining)}</h1>
                        {#if openOrders && o.userId === user_id}
                            <button on:click={() => cancelOrder(o)} class="text-md font-semibold bg-orange-500 p-4 text-center py-1 w-1/4 hover:scale-105 hover:shadow-lg transform transition-transform duration-150" aria-label="Cancel order">
                                🗑️
                            </button>
                        {:else if openOrders}
                            <span class="basis-1/4 text-md font-semibold text-white text-center py-1">—</span>
                        {:else}
                            <span class="basis-1/4 text-md font-semibold text-white text-center py-1 capitalize">{o.status}</span>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="text-md font-semibold text-white text-center p-4 italic">No {openOrders ? 'open' : 'closed'} orders in this market.</div>
            {/if}
        </div>
    {/if}
</div>
