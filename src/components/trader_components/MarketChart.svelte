<script>
    import LineChart from '../LineChart.svelte'

    export let chartData = []
    export let title = ""
    export let start_time = {seconds: 0}
    let data = [{price: 0, timestamp: 0}]

    $: if(chartData === undefined || chartData.length === 0 || chartData === null) {data = []; chartData=[]} else {
      // chartData is the data with timestamps converted to seconds
      data = chartData.map(d => ({...d, timestamp: d.timestamp.seconds - start_time.seconds}));
    }
</script>

<div class="border-white border rounded-md">
    <div class="bg-slate-700 rounded-t-md border-b">
        <h1 class="text-center text-white font-semibold py-2 text-md">Market Chart</h1>
    </div>
    <LineChart bind:data={data} bind:title={title} />
</div>