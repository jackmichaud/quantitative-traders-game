<script>
    import { createEventDispatcher } from "svelte";
    import { leaveGame } from "../lib/cloud_functions";
    import ErrorMessage from "./ui/ErrorMessage.svelte";

    export let game_id
    let errorMessage = ""; // Stores error messages
    let loading = false; // Track the loading state

    const dispatch = createEventDispatcher()

    async function _leaveGame() {
        errorMessage = ""; // Reset error message before attempting submission

        try {
            loading = true; // Start loading
            console.log("Leaving game: " + game_id);

            await leaveGame({game_id});

            console.log("Left game: " + game_id);
            dispatch("leaveGame");
        } catch (error) {
            errorMessage = error.message || "An unexpected error occurred while joining the game.";
        } finally {
            loading = false; // Stop loading
        }
    }

</script>

<div class="basis-1/4 border-white rounded-md text-sm m-2">
    <div class="bg-slate-700 p-2 rounded-md border flex justify-center items-center text-sm text-black font-semibold ">
        <h2 class="text-white">Leave Game?</h2>
        <button 
            on:click|preventDefault={_leaveGame} 
            class="text-white border p-2 ml-4 rounded-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150"
            disabled={loading}
        >
            {#if loading}Leaving...{:else}Leave Game{/if}
        </button>
    </div>
    {#if errorMessage}
            <ErrorMessage errorMessage={errorMessage}/>
    {/if}
</div>