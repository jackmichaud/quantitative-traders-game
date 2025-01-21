<script>
    import { createEventDispatcher } from "svelte";
    import MarketSelector from "./MarketSelector.svelte";

    export let profit_loss = 0
    export let markets = []
    export let selected_market
    export let start_time = null
    
    let clock = ""

    const dispatch = createEventDispatcher()

    function manage_market_change(market_name) {
        if(market_name !== undefined && market_name !== null) {
            dispatch('marketChange', market_name)
        } 
    }

    function tickTime() {
        const interval = setInterval(() => {
            if(start_time !== null && start_time !== undefined && start_time.seconds) {
                let seconds_left = 360 - (Math.floor(Date.now() / 1000) - start_time.seconds)   //TODO: Update clock depending on length of the game
                let minutes = Math.floor(seconds_left / 60)
                let seconds = seconds_left % 60
                clock = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
            }
		}, 1000);

		return () => {
			clearInterval(interval);
		};
    }
    
    tickTime()

</script>

<div class="border bg-slate-700 p-2 rounded-md flex justify-around items-center text-md text-black font-semibold">
    <h1 class="bg-orange-500 px-2 mr-4 py-2 rounded-md text-slate-700">{#if start_time === null}Game Clock: {:else}Game Clock: {clock}{/if}</h1>
    <div class="justify-center items-center flex mr-2">
        <MarketSelector bind:markets={markets} bind:selected_market={selected_market} on:marketChange={manage_market_change}/>
    </div>
    <h1 class="text-white font-semibold py-2 text-md ml-2">P&L Approx: ${profit_loss}</h1>
</div>