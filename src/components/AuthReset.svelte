<script>
    import { authHandler, authStore } from "../stores/authStore";
    
    let action = ''
    let newEmail = ''
    let newPass = ''
    let confirmPassword = ''

    async function handleSubmit() {
        if(!action) { return }

        if(action === 'updateEmail') {
            return await authHandler.updateEmail(newEmail)
        } else if (action === 'updatePass' && newPass === confirmPassword) {
            return await authHandler.updatePassword(newPass)
        }
    }
</script>

<div class="flex flex-col align-middle items-center">
    <div>
        <button on:click={() => action = 'updateEmail'} class="mr-4 text-xl border p-4 rounded-md">Update Email</button>
        <button on:click={() => action = 'updatePass'} class="mr-4 text-xl border p-4 rounded-md">Update Password</button>
    </div>
    {#if action === 'updateEmail'}
        <form class="flex flex-col">
            <label>
                <input bind:value={newEmail} type="text" placeholder="New Email"/>
            </label>
            <button on:click={handleSubmit}>Submit</button>
        </form>
    {/if}
    {#if action === 'updatePass'}
        <form class="flex flex-col">
            <label>
                <input bind:value={newPass} type="text" placeholder="New Password"/>
            </label>
            <label>
                <input bind:value={confirmPassword} type="password" placeholder="Confirm Password"/>
            </label>
            <button on:click={handleSubmit}>Submit</button>
        </form>
    {/if}
</div>