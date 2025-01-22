<script>
    import { createEventDispatcher } from "svelte";
    import { leaveGame } from "../lib/cloud_functions";

    export let game_id

    const dispatch = createEventDispatcher()


    async function _leaveGame() {
        console.log("Leaving game: " + game_id);
        try {
            await leaveGame({game_id});
            dispatch("leaveGame");
        } catch (error) {
            alert(error.message);
        }
    }

</script>

<div class="basis-1/4 border-white rounded-md text-sm m-2">
    <div class="bg-slate-700 p-2 rounded-md border flex justify-center items-center text-sm text-black font-semibold ">
        <h2 class="text-white">Leave Game?</h2>
        <button on:click|preventDefault={_leaveGame} class="text-white border p-2 ml-4 rounded-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Leave</button>
    </div>
</div>