<script>
    import "../app.css";

    import { onMount } from 'svelte';
    import { auth } from '../lib/firebase/firebase.client'
    import { authStore } from '../stores/authStore'
    import { dbHandler } from '../stores/dataStore'
    import { browser } from '$app/environment'
    import NavBar from "../components/NavBar.svelte";

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            
            let currentGame = {gameID: null, teamName: null}
            if(user) {
                let player = await dbHandler.getDoc("users", user.uid)
                if(player) {
                    currentGame = player.data().currentGame
                }
            }

            authStore.update((current) => {
                return {...current, isLoading: false, currentUser: user, currentGame: currentGame}
            })

            if(browser && !$authStore?.currentUser && !$authStore.isLoading && window.location.pathname !== '/') {
                window.location.href = '/';
            }

        })
        return unsubscribe
    });
    
</script>

<NavBar/>
<body class="bg-slate-400">
    <slot/>
</body>