<script>
    import { createEventDispatcher } from "svelte";

    export let pendingOrder = {
        direction: 'sell',
        price: null,
        shares: null,
        type: 'limit'
    }

    export let highest_bid = 0
    export let lowest_ask = 0
    export let awaiting_update = false

    const dispatch = createEventDispatcher()

    function handleOrder() {
        awaiting_update = true
        dispatch('placeOrder', pendingOrder)
    }
</script>

<div class="border-white border rounded-md">
    <!-- Loading Overlay -->
    {#if awaiting_update}
        <div class="loading-overlay">
            <div class="spinner"></div>
        </div>
    {/if}
    
    <!-- Content -->
    <div class="bg-slate-700 rounded-t-md flex p-2 justify-between">
        <div class="flex align-middle">
            <h1 class="ml-4 text-white font-semibold py-2 text-sm">Order Direction:</h1>
            <button on:click|preventDefault={() => {pendingOrder.direction = 'buy'}} class="ml-4 {pendingOrder.direction === 'buy' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-sm rounded-md">Buy</button>
            <button on:click|preventDefault={() => {pendingOrder.direction = 'sell'}} class="ml-4 {pendingOrder.direction === 'sell' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-sm rounded-md">Sell</button>
        </div>
        <div class="flex align-middle">
            <h1 class="ml-4 text-white font-semibold py-2 text-sm">Shares:</h1>
            <input bind:value={pendingOrder.shares} type=number min="0.00" step="1" maxlength="8" class="bg-slate-700 pl-2 ml-2 py-2 rounded-md border font-semibold border-white text-white outline-orange-500 text-sm" placeholder="Shares"/>
        </div>
    </div>
    <div class="bg-slate-700 flex p-2 justify-between">
        <div class="flex align-middle">
            <h1 class="ml-4 text-white font-semibold py-2 text-sm">Order Type:</h1>
            <button on:click|preventDefault={() => {pendingOrder.type = 'market'}} class="ml-4 {pendingOrder.type === 'market' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-sm rounded-md">Market</button>
            <button on:click|preventDefault={() => {pendingOrder.type = 'limit'}} class="ml-4 {pendingOrder.type === 'limit' ? 'bg-orange-500' : 'bg-orange-200'} text-slate-600 font-semibold p-2 text-sm rounded-md">Limit</button>
        </div>
        <div class="flex align-middle">
            <h1 class="ml-4 text-white font-semibold py-2 text-sm">Price:</h1>
            {#if pendingOrder.type === 'limit'}
                <input bind:value={pendingOrder.price} type=number min="0.00" step="0.01" maxlength="8" class="bg-slate-700 pl-2 ml-2 py-2 rounded-md border font-semibold border-white text-white outline-orange-500 text-sm" placeholder="Price" disabled={pendingOrder.type === 'market'}/>
            {/if}
        </div>
    </div>
    <div class="bg-slate-700 rounded-b-md flex border-t border-dashed justify-between text-white font-semibold p-2">
        <div class="flex">
            <h1 class="ml-4 text-white font-semibold py-2 text-sm">Place Order:</h1>
            {#if pendingOrder.shares !== null && (pendingOrder.shares > 1000 || pendingOrder.shares <= 0)}
                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2 text-sm">Please enter a number of shares between 0 and 1000!</h1>
            {:else if pendingOrder.type === 'limit' && pendingOrder.price !== null && (pendingOrder.price <= 0)}
                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2 text-sm">Please enter a price greater than 0!</h1>
            {:else if pendingOrder.type === 'limit' && (pendingOrder.shares * pendingOrder.price <= 0)}
                <h1 class="ml-4 border rounded text-red-600 border-red-600 p-2 text-sm">Make sure total cost is greater than 0!</h1>
            {:else}
                <button on:click|preventDefault={handleOrder} class="ml-4 bg-orange-500 text-slate-700 font-semibold w-32 text-sm rounded-md">Place Order</button>
            {/if}
            
        </div>
        <h1 class="ml-4 my-2 text-sm">Total Cost: ${pendingOrder.type === 'limit' ? pendingOrder.shares * pendingOrder.price : (pendingOrder.direction === 'buy' ? lowest_ask * pendingOrder.shares : highest_bid * pendingOrder.shares)}</h1>
    </div>
</div>

<style>
    /* Loading overlay styling */
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6); /* Gray out background */
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border-radius: inherit; /* Match container's border radius */
    }

    /* Spinner styling */
    .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>