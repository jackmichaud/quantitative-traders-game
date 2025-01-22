<script>
    import { ascending } from "d3";
    import { onMount } from "svelte";
    export let news = []

    let isExpanded = true

    let seconds = 0;

    function tickTime() {
        const interval = setInterval(() => {
            seconds = Math.floor(Date.now() / 1000);
		}, 1000);

		return () => {
			clearInterval(interval);
		};
    }
    
    tickTime()
</script>

<div class="basis-1/4 border-white border rounded-md">
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md'} relative">
        <h1 class="text-center text-white font-semibold py-2 text-md">News</h1>

        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="absolute top-1/2 right-4 -translate-y-1/2 text-white text-lg hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    {#if news && isExpanded}
        {#each news.toReversed() as n}
            <div class="{n.timestamp.seconds < 60 && n.timestamp.seconds !== "00" ? `bg-orange-600` : 'bg-slate-600'} rounded-md my-2 border border-dashed">
                <div class="flex content-between">
                    <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-md">{n.title}</h1>
                    {#if seconds - n.timestamp.seconds < 60 && n.timestamp.seconds !== "00"}
                        <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-sm italic">{seconds - n.timestamp.seconds} seconds ago</h1>
                    {:else if seconds - n.timestamp.seconds >= 60}
                        <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-sm italic">{Math.floor((seconds - n.timestamp.seconds)/60)} minutes ago</h1>
                    {/if}
                    
                </div>
                <h1 class="mx-2 my-0 text-white font-semibold py-2 text-sm">{n.content}</h1>
            </div>
        {/each}
    {/if}
</div>