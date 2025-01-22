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

<div class="flex flex-col align-middle items-center m-2">
    <h1 class="text-4xl">{register ? "Sign Up" : "Sign In"}</h1>
    <form class="flex flex-col border rounded-md p-2 bg-slate-700 my-2">
        <label>
            <input bind:value={email} type="text" placeholder="Email" class="rounded-md text-black p-2 text-2xl bg-slate-700 border outline-orange-500 hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150"/>
        </label>
        <label>
            <input bind:value={password} type="password" placeholder="Password" class="rounded-md my-2 text-black p-2 text-2xl bg-slate-700 border outline-orange-500 hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150"/>
        </label>
        {#if register}
            <input bind:value={confirmPassword} type="password" placeholder="Confirm Password" class="rounded-md text-black p-2 text-2xl bg-slate-700 border outline-orange-500 hover:bg-white hover:text-slate-700 hover:scale-105 hover:shadow-lg transform transition-transform duration-150"/>
        {/if}
        <button on:click={handleSubmit} class="rounded-md bg-orange-500 p-2 mt-4 text-2xl text-slate-700 hover:scale-105 hover:bg-orange-400 hover:shadow-lg transform transition-transform duration-150">Submit</button>
    </form>
    {#if !register}
        <div class="text-lg">
            Don't have an account?
            <button on:click={() => register = true} class="underline hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Sign up</button>
        </div>
        <div class="text-lg">
            Forgot password?
            <button on:click={() => authHandler.resetPassword(email)} class="underline hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Reset password</button>
        </div>
    {:else}
        <div class="text-lg">
            Already have an account?
            <button on:click={() => register = false} class="underline hover:scale-105 hover:shadow-lg transform transition-transform duration-150">Log in</button>
        </div>
    {/if}
</div>