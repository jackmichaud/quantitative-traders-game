<script>
    import AuthReset from "../../components/AuthReset.svelte";
    import Leaderboard from "../../components/Leaderboard.svelte";
    import { authStore, authHandler } from "../../stores/authStore";

    let email;
    authStore.subscribe((curr) => {
        email = curr?.currentUser?.email
    })
</script>

<div class="border-white bg-slate-600 border rounded-md flex flex-col p-2 m-2 font-bold text-white">
    {#if $authStore.currentUser}
        <h1 class="text-3xl text-white border-b mb-2 pb-2">Current User: {email}</h1>
        <div class="flex border-b mb-2 pb-2">
            <button on:click={authHandler.logout} class="text-lg border p-2 rounded-md mr-2">Log Out</button>
            <AuthReset/>
        </div>
        <Leaderboard />
    {:else}
        <h1>Loading...</h1>
    {/if}
</div>



