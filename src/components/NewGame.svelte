<script>
    import { createGame } from "../lib/cloud_functions";

    let official = false 
    let gameType;

    let submitted = false

    async function create() {
        createGame({"type": gameType, "official": official})
            .then((response) => alert(response.data))
            .catch((error) => alert(error.message))
    }
</script>

<form class="flex flex-col border rounded-md p-4 bg-slate-700 my-4">
    <label class="text-xl">
        Game type:
        <select bind:value|preventDefault={gameType} name="Game Type" class="text-xl rounded-md text-black">
            <option value="dice">Dice Game</option>
            <option value="cards">Card Game</option>
        </select>
    </label>

    <label class="text-xl mt-4">
        Official Game? 
        <input bind:value|preventDefault={official} type="checkbox"/>
    </label>
    
    {#if !submitted}
        <button on:click|preventDefault={create} class="rounded-md bg-orange-500 p-2 mt-4 text-2xl text-slate-700">Submit</button>
    {/if}
</form>