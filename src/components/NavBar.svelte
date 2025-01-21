<script>
    import Modal from "./Modal.svelte";
    import Auth from "./Auth.svelte"
    import { authStore, authHandler } from "../stores/authStore";
    import { dbHandler } from "../stores/dataStore";
    import NewGame from "./NewGame.svelte";
    import JoinGame from "./trader_components/JoinGame.svelte";
    import { startGame, updateMarket, endGame, createGame, closeGame } from "../lib/cloud_functions";

    let showModal = "closed";
    let email;
    let game;

    authStore.subscribe((curr) => {
        email = curr?.currentUser?.email
        game = curr?.currentUser?.game
    })

    async function start() {
        await startGame().catch((error) => alert(error.message))

        for(let i = 0; i < 6; i++) {    // TODO: Add a way to adjust the number of market updates
            await new Promise(resolve => setTimeout(resolve, 60000));

            await updateMarket().catch((error) => alert(error.message))
            
        }

        await closeGame().catch((error) => alert(error.message))

        await new Promise(resolve => setTimeout(resolve, 60000));

        await endGame().catch((error) => alert(error.message))
    }

    async function recalculate() {
        await closeGame().catch((error) => alert(error.message));
    }

    
</script>

<header class="sticky flex py-4 items-center bg-slate-700 font-semibold text-4xl text-white border-b border-white justify-between">
    <button 
        on:click={() => { window.location.href = '/' }} 
        class="ml-4 text-center text-orange-500 text-4xl italic transform transition-transform duration-150 ease-in-out hover:scale-105 bg-transparent hover:shadow-lg"
        >
        Quantitative Traders At Virginia
    </button>
    {#if $authStore.currentUser}


        <button on:click={() => showModal = "join"} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Join game</button>

        {#if showModal === "join"}
            <Modal on:close={() => showModal = "closed"}>
                <JoinGame/>
            </Modal>
        {/if}

        <!-- Make sure this only appears if uid is a certain value-->
        {#if $authStore.currentUser.uid === "66Q8I5XwY0TChOmSUWoYM5nEaB32"}
            <button on:click={() => showModal = "create"} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Create game</button>
            <button on:click={start} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Start game</button>
            <!-- <button on:click={recalculate} class="mr-4 text-lg border p-2 rounded-md">Recalculate</button> -->

            {#if showModal === "create"}
                <Modal on:close={() => showModal = "closed"}>
                    <NewGame/>
                </Modal>
            {/if}
        {/if}

        <button on:click={() => {window.location.href='/dashboard'}} class="mr-4 text-lg border p-2 rounded-md hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150">{email}</button>
    {:else}
        <button on:click={() => showModal = "auth"} class="mr-4 text-lg border p-2 rounded-md ">Log in / Sign up</button>

        {#if showModal === "auth"}
            <Modal on:close={() => showModal = "closed"}>
                <Auth/>
            </Modal>
        {/if}
    {/if}
</header>