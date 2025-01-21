<script>
    import { dbHandler } from "../stores/dataStore";
    import { authHandler, authStore } from "../stores/authStore";
    import { Timestamp, doc } from "firebase/firestore";

    let submitted = false
    let gameID;
    let teamName;

    function handleSubmit() {
        submitted = true
        game = dbHandler.getDoc("games", gameID)
        if(game.exists()) {
            // Update user information and reference to game
            dbHandler.updateDoc("users", $authStore.currentUser.uid, {game: {type: gameType, role: "player", reference: gameID}})

            // Add user to team
            dbHandler.updateDoc("games", gameID, {teams: [...game.data().teams, {name: teamName, players: [...game.data().teams[game.data().teams.length - 1].players, $authStore.currentUser.uid]}]})
        }

        window.location.href='/'
    }
</script>

<form class="flex flex-col border rounded-md p-4 bg-slate-700 my-4">
    <label class="text-xl">
        Game ID:
        <input bind:value={gameID} type="text" placeholder="Game ID" class="rounded-md my-2 text-black p-2 text-2xl"/>
    </label>
    <label class="text-xl">
        Team Name:
        <input bind:value={teamName} type="text" placeholder="Game ID" class="rounded-md my-2 text-black p-2 text-2xl"/>
    </label>
    {#if !submitted}
        <button on:click={handleSubmit} class="rounded-md bg-orange-500 p-2 mt-4 text-2xl text-slate-700">Submit</button>
    {/if}
</form>