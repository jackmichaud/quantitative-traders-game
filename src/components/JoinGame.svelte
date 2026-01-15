<script>
    import { createEventDispatcher } from "svelte";
    import { joinGame } from "../lib/cloud_functions";
    import ErrorMessage from "./ui/ErrorMessage.svelte";

    let game_id
    let team_name
    let errorMessage = ""; // Stores error messages
    let loading = false; // Track the loading state

    const teams = ["RANGERS", "ACES", "PHEONIX", "HYDRAS", "ROOKS", "OUTLAWS", "TITANS", "APEX", "VENOM", "SABRES", "PIRATES", "GLADIATORS"]

    const dispatch = createEventDispatcher()


    async function _joinGame() {
        errorMessage = ""; // Reset error message before attempting submission

        if (game_id.length < 4 || team_name.length < 4) {
            errorMessage = "The game ID and team name must be at least 4 characters long";
            return;
        }

        try {
            loading = true; // Start loading
            console.log("Joining game: " + game_id);

            await joinGame({ gameId: game_id, teamName: team_name });

            console.log("Joined game: " + game_id);
            dispatch('joinGame', { game_id, team_name });
        } catch (error) {
            errorMessage = error.message || "An unexpected error occurred while joining the game.";
        } finally {
            loading = false; // Stop loading
        }
    }

</script>

<div class="basis-1/4 border-white rounded-md text-sm m-2">
    <div class="bg-slate-700 p-2 rounded-md border flex justify-center items-center text-sm text-black font-semibold ">
        <form class="text-sm text-white flex">
            <select bind:value={team_name} on:change|preventDefault={()=>{}} name="teams" id="teams" class="bg-slate-700 border rounded-md p-2 text-white text-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
                {#each teams as team}
                    <option value={team}>{team}</option>
                {/each}
            </select>
            
            <input bind:value={game_id} class="bg-slate-700 pl-2 ml-2 py-2 text-sm rounded-md border border-white text-white outline-orange-500  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150" placeholder="Game ID"/>
            <button 
                on:click|preventDefault={_joinGame} 
                class="text-white border p-2 ml-4 rounded-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150"
                disabled={loading}
            >
                {#if loading}Joining...{:else}Join Game{/if}
            </button>
        </form>
    </div>
    {#if errorMessage}
        <ErrorMessage errorMessage={errorMessage}/>
    {/if}
</div>