<script>
    export let bids = []
    export let asks = []
    export let team_name
</script>

<div class="border-white border rounded-md">
    <div class="bg-slate-700 rounded-t-md border-b">
        <h1 class="text-center text-white font-semibold py-2 text-md">Order Book</h1>
    </div>
    <div class="flex">
        <h1 class="basis-1/2 text-md font-semibold text-white text-center border-b py-1 border-dashed">Bid</h1>
        <h1 class="basis-1/2 text-md font-semibold text-white text-center border-b py-1 border-dashed">Ask</h1>
    </div>
    <div class="min-h-32 flex max-h-60 overflow-auto">
        <div class="basis-1/2 border-r border-dashed">
            {#if bids.length > 0}
                {#each bids as bid}
                    <h1 class="{bid.teamName === team_name ? 'bg-slate-600' : 'bg-slate-500'} text-sm font-semibold text-white text-center py-1">{bid.shares} x ${bid.price}</h1>
                {/each}
            {/if}
        </div>
        <div class="basis-1/2">
            {#if asks.length > 0}
                {#each asks as ask}
                    <h1 class="{ask.teamName === team_name ? 'bg-slate-600' : 'bg-slate-500'} text-sm font-semibold text-white text-center py-1">{ask.shares} x ${ask.price}</h1>
                {/each}
            {/if}
        </div>
    </div>
</div>