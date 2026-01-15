<script>
    import Modal from "./Modal.svelte";
    import Auth from "./Auth.svelte"
    import { authStore, authHandler } from "../stores/authStore";
    import { dbHandler } from "../stores/dataStore";
    import NewGame from "./NewGame.svelte";
    import JoinGame from "./JoinGame.svelte";
    import { startGame, tickGame, closeGame, createGame, joinGame } from "../lib/cloud_functions";
    import LeaveGame from "./LeaveGame.svelte";

    let showModal = "closed";
    let email;
    let game = {type: "none", gameID: null, teamName: null}

    authStore.subscribe((curr) => {
        email = curr?.currentUser?.email
        game = curr?.game
    })

    async function start() {
        let errorOccured = false;
        await startGame().catch((error) => {alert(error.message) ; errorOccured = true})
        if(errorOccured) return;

        let numIterations = 0;
        if(game.type == "dice") {
            numIterations = 5;
        } else if (game.type == "cards") {
            numIterations = 6;
        }

        for(let i = 0; i < numIterations; i++) {  
            await new Promise(resolve => setTimeout(resolve, 60000));

            await tickGame().catch((error) => alert(error.message))
            
        }

        await closeGame().catch((error) => alert(error.message))

        await new Promise(resolve => setTimeout(resolve, 60000));

        await closeGame().catch((error) => alert(error.message))
    }

    async function recalculate() {
        await closeGame().catch((error) => alert(error.message));
    }

    console.log(game)
    
</script>

<header class="sticky flex py-2 items-center bg-slate-700 font-semibold text-4xl text-white border-b border-white justify-between">
    <button 
        on:click={() => { window.location.href = '/' }} 
        class="hidden lg:inline ml-4 text-center text-orange-500 text-4xl italic transform transition-transform duration-150 ease-in-out hover:scale-105 bg-transparent hover:shadow-lg"
        >
        Quantitative Traders At Virginia
    </button>
    <button 
        on:click={() => { window.location.href = '/' }} 
        class="lg:hidden ml-4 text-center text-orange-500 text-4xl italic transform transition-transform duration-150 ease-in-out hover:scale-105 bg-transparent hover:shadow-lg"
        >
        QTV
    </button>
    {#if $authStore.currentUser}

        {#if game?.gameID !== null && game?.gameID !== undefined && game?.gameID.length > 3}
            <!--In Game-->
            <button on:click={() => showModal = "leave"} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Leave game</button>

            {#if $authStore.currentUser.uid === "66Q8I5XwY0TChOmSUWoYM5nEaB32"}
                <button on:click={start} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Start game</button>
            {/if}

            {#if showModal === "leave"}
                <Modal title="Leave" on:close={() => showModal = "closed"}>
                    <LeaveGame bind:game_id={game.gameID} on:leaveGame={() => showModal = "closed"}/>
                </Modal>
            {/if}

        {:else}
            <!--Not In Game-->
            <button on:click={() => showModal = "join"} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Join game</button>

            {#if showModal === "join"}
                <Modal title="Join Game" on:close={() => showModal = "closed"} on:joinGame={() => showModal = "closed"}>
                    <JoinGame on:joinGame={() => showModal="closed"}/>
                </Modal>
            {/if}

            <!-- Make sure this only appears if uid is a certain value-->
            {#if $authStore.currentUser.uid === "66Q8I5XwY0TChOmSUWoYM5nEaB32"}
                <button on:click={() => showModal = "create"} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Create game</button>
                
                <!-- <button on:click={recalculate} class="mr-4 text-lg border p-2 rounded-md">Recalculate</button> -->

                {#if showModal === "create"}
                    <Modal title="Create" on:close={() => showModal = "closed"}>
                        <NewGame/>
                    </Modal>
                {/if}
            {/if}
        {/if}

        <button on:click={() => {window.location.href='/dashboard'}} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">{email}</button>

    {:else}
        <button on:click={() => showModal = "auth"} class="mr-4 text-lg border p-2 rounded-md  hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Log in / Sign up</button>

        {#if showModal === "auth"}
            <Modal title="Log In/Sign Up" on:close={() => showModal = "closed"}>
                <Auth/>
            </Modal>
        {/if}
    {/if}
</header>