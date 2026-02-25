<script>
    import LineChart from '../LineChart.svelte'
    import InfoButton from '../ui/InfoButton.svelte'

    export let chartData = []
    export let title = ""
    export let start_time = {seconds: 0}
    let data = [{price: 0, timestamp: 0}]
    let isExpanded = true

    $: if(chartData === undefined || chartData.length === 0 || chartData === null) {data = []; chartData=[]} else {
      // chartData is the data with timestamps converted to seconds
      data = chartData.map(d => ({...d, timestamp: d.timestamp.seconds - start_time?.seconds}));
    }
</script>

<div class="border-white border rounded-md mb-2 shadow-black shadow-md">
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between items-center px-4 py-2">
        <!-- Title -->
        <h1 class="text-center text-white font-semibold text-md">
            Market Chart
        </h1>
        <!-- Buttons -->
        <div class="flex items-center gap-2">
            <InfoButton text="Trade price history for the selected market, plotted from game start." />
            <button
                on:click={() => { isExpanded = !isExpanded }}
                class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
                {isExpanded ? '↑' : '↓'}
            </button>
        </div>
    </div>
    {#if isExpanded}
        <LineChart bind:data={data} bind:title={title} />
    {/if}
</div>