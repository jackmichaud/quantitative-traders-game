<script>
    import { createEventDispatcher } from "svelte";
    import MarketSelector from "./MarketSelector.svelte";

    export let profit_loss = 0
    export let markets = []
    export let selected_market
    export let start_time = null
    
    let clock = ""
    let displayClock = true;

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
                if(seconds_left <= 0) {
                    displayClock = false
                } else {
                    displayClock = true
                }
                clock = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
            }
		}, 1000);

		return () => {
			clearInterval(interval);
		};
    }
    
    tickTime()

</script>

<div class="border bg-slate-700 p-2 rounded-md flex justify-between items-center text-sm text-black font-semibold">
    <div class="flex">
        <h1 class="text-white font-semibold py-2 text-sm mr-2">Time Remaining:</h1>
        <h1 class="bg-orange-500 px-2 py-2 rounded-md text-slate-700">{#if start_time === null || displayClock == false}0:00{:else}{clock}{/if}</h1>
    </div>
    
    <div class="justify-center items-center flex">
        <MarketSelector bind:markets={markets} bind:selected_market={selected_market} on:marketChange={manage_market_change}/>
    </div>
    <h1 class="text-white font-semibold py-2 text-sm ml-2">P&L Approx: ${profit_loss}</h1>
</div>