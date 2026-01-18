<script>
    export let bids = []
    export let asks = []
    export let teamId

    let isExpanded = true
</script>

<div class="border-white border rounded-md shadow-black shadow-md">
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b ' : 'rounded-b-md'} flex justify-between items-center px-4">
        <h1 class="text-center text-white font-semibold py-2 text-md">Order Book</h1>

        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    {#if isExpanded}
        <div class="flex">
            <h1 class="basis-1/2 text-md font-semibold text-white text-center border-b py-1 border-dashed">Bid</h1>
            <h1 class="basis-1/2 text-md font-semibold text-white text-center border-b py-1 border-dashed">Ask</h1>
        </div>
        <div class="min-h-32 flex max-h-60 overflow-auto">
            <div class="basis-1/2 border-r border-dashed">
                {#if bids.length > 0}
                    {#each bids as bid}
                        <h1 
                            class="{bid.teamId === teamId ? 'bg-slate-600' : 'bg-slate-500'} text-sm font-semibold text-white text-center py-1 hover:scale-105 hover:shadow-lg transform transition-transform duration-150 bg-slate-500 border-y border-dashed">
                            {bid.sharesRemaining} x ${bid.price}
                        </h1>
                    {/each}
                {/if}
            </div>
            <div class="basis-1/2">
                {#if asks.length > 0}
                    {#each asks as ask}
                        <h1 
                            class="{ask.teamId === teamId ? 'bg-slate-600' : 'bg-slate-500'} text-sm font-semibold text-white text-center py-1 hover:scale-105 hover:shadow-lg transform transition-transform duration-150 bg-slate-500 border-y border-dashed">
                            {ask.sharesRemaining} x ${ask.price}
                        </h1>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>