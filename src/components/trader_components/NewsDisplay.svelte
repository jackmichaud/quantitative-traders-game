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
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md'} flex justify-between items-center px-4">
        <h1 class="text-center text-white font-semibold py-2 text-md flex-grow">News</h1>

        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    <div>
        {#if news && isExpanded}
            {#if news.length === 0}
                <h1 class="text-md font-semibold text-white text-center p-4 italic">No news yet...</h1>
            {/if}
            {#each news.toReversed() as n}
                <div class="{n.timestamp.seconds < 60 && n.timestamp.seconds !== "00" ? `bg-orange-600` : 'bg-slate-600'} my-2 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150 bg-slate-500">
                    <div class="flex content-between">
                        <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-md">{n.title}</h1>
                        {#if seconds - n.timestamp.seconds < 60 && n.timestamp.seconds !== "00"}
                            <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-sm italic">{seconds - n.timestamp.seconds} s ago</h1>
                        {:else if seconds - n.timestamp.seconds >= 60}
                            <h1 class="mx-2 my-0 text-white font-semibold pt-2 text-sm italic">{Math.floor((seconds - n.timestamp.seconds)/60)} m ago</h1>
                        {/if}
                        
                    </div>
                    <h1 class="mx-2 my-0 text-white font-semibold py-2 text-sm">{n.content}</h1>
                </div>
            {/each}
        {/if}
    </div>
</div>