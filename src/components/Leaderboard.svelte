<script>
    import { dbHandler } from '../stores/dataStore';

    let isExpanded = true

    let selected_leaderboard = ""

    let leaderboards = ["Fall2025", "Spring2025", "TournamentSpring2025", "Spring2026"]

    let leaderboardView = "teams"

    // make a function that fetches the leaderboard data when selected_leaderboard or leaderboardView changes
    import { onMount } from 'svelte';

    let leaderboardData = [];

    async function fetchLeaderboardData() {
        if(selected_leaderboard.length < 3) return;
        console.log("Fetching leaderboard data: ", selected_leaderboard)
        try {
            let leaderboardDoc = await dbHandler.getDoc("global_leaderboards", selected_leaderboard)
            if(leaderboardDoc.exists()) {
                if(leaderboardView === 'teams') {
                    leaderboardData = leaderboardDoc.data().teams
                } else {
                    leaderboardData = leaderboardDoc.data().players
                }
            }
            console.log(leaderboardData)
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
        }
    }

    $: selected_leaderboard, fetchLeaderboardData();

    onMount(fetchLeaderboardData);

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
            <select bind:value={selected_leaderboard} name="markets" id="market" class="bg-slate-700 border rounded-md p-2 text-white text-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transition-transform duration-150">
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
        {#if leaderboardView == 'teams'}
            {#each leaderboardData as team}
                <div class="flex justify-between items-center bg-slate-600 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
                    <h1 class="text-white
                                font-semibold
                                text-md
                                text-center
                                py-1
                                flex-grow
                                ">
                        {team.name}
                    </h1>
                    <h1 class="text-white
                                font-semibold
                                text-md
                                text-center
                                py-1
                                flex-grow
                                ">
                        {team.balance}
                    </h1>
                </div>
            {/each}
        {:else if leaderboardView == 'individual'}
            {#each leaderboardData as player}
                <div class="flex justify-between items-center bg-slate-600 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
                    <h1 class="text-white
                                font-semibold
                                text-md
                                text-center
                                py-1
                                flex-grow
                                ">
                            {player.email}
                    </h1>
                    <h1 class="text-white
                                font-semibold
                                text-md
                                text-center
                                py-1
                                flex-grow
                                ">
                            {player.balance}
                    </h1>
                </div>
            {/each}
        {/if}
    {/if}
</div>