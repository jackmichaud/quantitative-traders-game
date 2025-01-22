<script>
    import LineChart from '../LineChart.svelte'

    export let chartData = []
    export let title = ""
    export let start_time = {seconds: 0}
    let data = [{price: 0, timestamp: 0}]
    let isExpanded = true

    $: if(chartData === undefined || chartData.length === 0 || chartData === null) {data = []; chartData=[]} else {
      // chartData is the data with timestamps converted to seconds
      data = chartData.map(d => ({...d, timestamp: d.timestamp.seconds - start_time.seconds}));
    }
</script>

<div class="border-white border rounded-md mb-2">
    <div class="bg-slate-700 rounded-t-md relative {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'}">
        <!-- Title -->
        <h1 class="text-center text-white font-semibold py-2 text-md">
            Market Chart
        </h1>
        <!-- Button -->
        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="absolute top-1/2 right-4 -translate-y-1/2 text-white text-lg hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    {#if isExpanded}
        <LineChart bind:data={data} bind:title={title} />
    {/if}
</div>