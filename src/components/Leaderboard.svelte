<script>
    export let teamData = {name: "", players: [{}]}

    let isExpanded = true

    let selected_leaderboard = ""

    let leaderboards = ["Spring 2025", "Tournament"]

    let leaderboardView = "teams"

    function manage_leaderboard_change() {
        if(selected_leaderboard !== undefined && selected_leaderboard !== null) {
            console.log(selected_leaderboard)
        }
    }
</script>

<div class="border-white border rounded-md mb-2">
    <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between items-center p-2">
        <!-- Title -->
        <h1 class="text-center text-white font-semibold text-md">
            Globlal Leaderboard
        </h1>
        <!-- Button -->
        <button 
            on:click={() => { isExpanded = !isExpanded }} 
            class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150">
            {isExpanded ? '↑' : '↓'}
        </button>
    </div>
    <div class="bg-slate-700 content-evenly text-center items-center rounded-t-md border-b p-2 flex justify-between">
        <div class="justify-center items-center flex">
            <h1 class="text-white font-semibold text-md mr-2">Competition:</h1>
            <select bind:value={selected_leaderboard} on:change={manage_leaderboard_change} name="markets" id="market" class="bg-slate-700 border rounded-md p-2 text-white text-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transition-transform duration-150">
                {#each leaderboards as leaderboard}
                    <option value={leaderboard}>{leaderboard}</option>
                {/each}
            </select>
        </div>

        <div>
            <h1 class=" lg:hidden text-white font-semibold py-2 text-sm mr-2">Type:</h1>
            <div class="flex bg-slate-600 rounded-md border">
                <div class="justify-center items-center">
                    <button on:click|preventDefault={() => {leaderboardView = 'teams'}} class="{leaderboardView === 'teams' ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Team</button>
                </div>
                <div class="justify-center items-center align-middle">
                    <button on:click|preventDefault={() => {leaderboardView = 'individual'}} class="ml-4 {leaderboardView === 'individual' ? 'bg-orange-500' : 'bg-transparent text-white'} text-slate-600 font-semibold p-2 text-sm rounded-md hover:scale-105 hover:shadow-lg transition-transform duration-150">Individual</button>
                </div>
            </div>
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
                    
                </h1>
            </div>
        {/each}
    {/if}
</div>