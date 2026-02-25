<script>
    import InfoButton from '../ui/InfoButton.svelte'

    export let teamData = {name: "", players: [{}]}

    let isExpanded = true
</script>

<div class="border-white border rounded-md mb-2 shadow-black shadow-md">
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between items-center px-4 py-2">
        <!-- Title -->
        <h1 class="text-center text-white font-semibold text-md italic">
            {teamData.name}
        </h1>
        <!-- Buttons -->
        <div class="flex items-center gap-2">
            <InfoButton text="Your team's members and their P&L for this game." />
            <button
                on:click={() => { isExpanded = !isExpanded }}
                class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
                {isExpanded ? '↑' : '↓'}
            </button>
        </div>
    </div>
    {#if isExpanded}
        {#each teamData.players as player}
            <div class="flex justify-between items-center bg-slate-600 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
                <h1 class="text-white
                            font-semibold
                            text-md
                            text-center
                            py-1
                            flex-grow
                            ">
                    {player.email.slice(0,player.email.indexOf('@'))}
                </h1>
                <!-- TODO: Add live player balance updates -->
            </div> 
        {/each}
    {/if}
</div>