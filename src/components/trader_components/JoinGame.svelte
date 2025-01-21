<script>
    import { count } from "firebase/firestore";
    import { createEventDispatcher } from "svelte";

    export let game_id
    export let team_name
    export let submitted = false

    const teams = ["RANGERS", "ACES", "PHEONIX", "HYDRAS", "ROOKS", "OUTLAWS", "TITANS", "APEX", "VENOM", "SABRES"]

    const dispatch = createEventDispatcher()

    function handleSubmit() {
        submitted = !submitted
        if(submitted) {
            dispatch('joinGame', {game_id, team_name})
        } else {
            dispatch('leaveGame', {game_id, team_name})
        }
    }

</script>

<div class="basis-1/4 border-white rounded-md text-sm">
    <div class="bg-slate-700 p-2 rounded-md border flex justify-center items-center text-sm text-black font-semibold">
        <form class="text-sm text-white flex">
            <select bind:value={team_name} on:change|preventDefault={()=>{}} name="teams" id="teams" class="bg-slate-700 border rounded-md p-2 text-white ml-2 text-md">
                {#each teams as team}
                    <option value={team}>{team}</option>
                {/each}
            </select>
            
            <input bind:value={game_id} class="bg-slate-700 pl-2 ml-2 py-2 text-sm rounded-md border border-white text-white outline-orange-500" placeholder="Game ID" disabled={submitted}/>
            <button on:click|preventDefault={handleSubmit} class="text-white border p-2 ml-4 rounded-md">{#if !submitted}Join Game{:else}Leave Game{/if}</button>
        </form>
    </div>
</div>