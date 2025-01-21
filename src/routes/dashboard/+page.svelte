<script>
    import AuthReset from "../../components/AuthReset.svelte";
    import { authStore, authHandler } from "../../stores/authStore";

    let email;
    authStore.subscribe((curr) => {
        email = curr?.currentUser?.email
    })
</script>

<div class="border-orange-500 bg-slate-600 border rounded-md flex flex-col p-4 m-4 font-bold text-white">
    {#if $authStore.currentUser}
        <h1 class="text-4xl text-white">Current User: {email}</h1>
        <AuthReset/>
        <button on:click={authHandler.logout} class="mr-4 text-xl border p-4 rounded-md">Log Out</button>
    {:else}
        <h1>Loading...</h1>
    {/if}
</div>



