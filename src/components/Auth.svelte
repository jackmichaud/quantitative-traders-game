<script>
    import { authHandler, authStore } from "../stores/authStore";
    
    let register = false
    let email = ''
    let password = ''
    let confirmPassword = ''

    async function handleSubmit() {
        if(!email || !password || (register && !confirmPassword)) {
            return
        }

        if(register && password === confirmPassword) {
            try {
                await authHandler.signup(email, password)
                await authHandler.login(email, password)
            } catch (err) {
                alert(err)
            }
        } else {
            try {
                await authHandler.login(email, password)
            } catch (err) {
                alert(err)
            }
        }

        if($authStore.currentUser) {
            window.location.href='/'
        }
    }
</script>

<div class="flex flex-col align-middle items-center">
    <h1 class="text-4xl">{register ? "Sign Up" : "Sign In"}</h1>
    <form class="flex flex-col border rounded-md p-4 bg-slate-700 my-4">
        <label>
            <input bind:value={email} type="text" placeholder="Email" class="rounded-md my-2 text-black p-2 text-2xl"/>
        </label>
        <label>
            <input bind:value={password} type="password" placeholder="Password" class="rounded-md my-2 text-black p-2 text-2xl"/>
        </label>
        {#if register}
            <input bind:value={confirmPassword} type="password" placeholder="Confirm Password" class="rounded-md my-2 text-black p-2 text-2xl"/>
        {/if}
        <button on:click={handleSubmit} class="rounded-md bg-orange-500 p-2 mt-4 text-2xl text-slate-700">Submit</button>
    </form>
    {#if !register}
        <div class="text-lg">
            Don't have an account?
            <button on:click={() => register = true} class="underline">Sign up</button>
        </div>
        <div class="text-lg">
            Forgot password?
            <button on:click={() => authHandler.resetPassword(email)} class="underline">Reset password</button>
        </div>
    {:else}
        <div class="text-lg">
            Already have an account?
            <button on:click={() => register = false} class="underline">Log in</button>
        </div>
    {/if}
</div>