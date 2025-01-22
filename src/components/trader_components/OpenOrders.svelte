<script>
    import { createEventDispatcher } from "svelte";

    export let market_data = {buyOrders: [], sellOrders: [], meanPrice: []};
    export let team_name

    let isExpanded = true

    const dispatch = createEventDispatcher()

    let orders = []
    $: if(market_data.buyOrders.length > 0 || market_data.sellOrders.length > 0) {
        orders = [...market_data.buyOrders, ...market_data.sellOrders]
        orders.sort((a, b) => a.timestamp - b.timestamp);
        orders = orders
    }

    function cancelOrder(order) {
        dispatch('cancelOrder', order)
    }
</script>

<div class="border-white border rounded-md mt-2">
    <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 relative {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'}">
        <h1 class="text-white text-center font-semibold text-md">Open Orders</h1>

        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="absolute top-1/2 right-4 -translate-y-1/2 text-white text-lg hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    {#if isExpanded}
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
            {#if market_data.buyOrders.length > 0 || market_data.sellOrders.length > 0}
                {#each orders as o}
                    <div class="flex">
                        <h1 class="basis-1/5 text-md font-semibold text-white text-center border-r py-1 border-dashed">sum</h1>
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