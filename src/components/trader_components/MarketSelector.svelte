
<script>
    import { createEventDispatcher } from "svelte";

    export let markets = []
    export let selected_market

    const dispatch = createEventDispatcher()

    function manage_market_change() {
        if(selected_market !== undefined && selected_market !== null) {
            dispatch('marketChange', selected_market)
        } 
    }
</script>

<h1 class="text-white font-semibold text-md mr-2">Market:</h1>
<select bind:value={selected_market} on:change={manage_market_change} name="markets" id="market" class="bg-slate-700 border rounded-md p-2 text-white text-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
    {#each markets as market}
        <option value={market}>{market}</option>
    {/each}
</select>