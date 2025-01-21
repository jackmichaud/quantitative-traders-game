<script>
    import { onMount } from 'svelte';
    import { cubicOut } from 'svelte/easing';
    import { quintOut } from 'svelte/easing';
    import { dbHandler } from '../stores/dataStore';
    import { authHandler, authStore } from '../stores/authStore';
    import { deleteDoc } from 'firebase/firestore';

    $: innerWidth = 0;
    $: innerHeight = 0;

    let timer = 600;
    let die1 = 0;
    let die2 = 0;
    let showDice = false;
    let state = "waitingRoom";
    let gameID;
    let teams = [{name: "Team 1", players: ["Player 1", "Player 2"]}, {name: "Team 2", players: ["Player 3", "Player 4"]}, {name: "Team 3", players: ["Player 5", "Player 6"]}];

    onMount(() => {
        console.log("users", $authStore.currentUser.uid)
        userInfo = dbHandler.getDoc("users", $authStore.currentUser.uid)

        if(userInfo.exists()) {
            gameID = userInfo.data().game.reference
        }

        //attach a listener to the game and update the teams list and stuff yknow
    })

    function rollDice() {
        die1 = Math.floor(Math.random() * 6) + 1;
        die2 = Math.floor(Math.random() * 6) + 1;
        showDice = true
    }

    function flyRotate(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0 }) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        
        return {
            delay,
            duration,
            easing,
            css: t => `
                transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px) rotate(${t * 360}deg);
            `
        };
    }

    function close() {
        dbHandler.updateDoc("users", $authStore.currentUser.uid, {game: {type: "none", gameID: "", reference: null}})

        dbHandler.deleteDoc("games", gameID)

        window.location.href = "/"
    }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="fixed top-0 right-0 bottom-0 left-0 bg-black/[.5] flex justify-center items-center z-30">
    <div class="border-orange-500 bg-slate-600 border rounded-md flex flex-col p-4 m-4">
        <div class="flex justify-end">
            <button class="font-semibold text-lg mr-4 underline" on:click={close}>Cancel</button>
        </div>
        {#if state === "waitingRoom"}
            <div class="bg-slate-700 rounded-md">
                <div class="flex border-b">
                    <h1 class="text-2xl font-semibold text-white m-4 p-2">Game ID: {gameID}</h1>
                    <button on:click={() => state = "playing"} class="rounded-md bg-orange-500 p-2 m-4 font-semibold text-2xl text-slate-700">Play</button>
                </div>
                <div class="grid grid-cols-3 min-h-60 text-white font-semibold m-2">
                    {#if teams.length > 0}
                        {#each teams as team}
                            <div class="border rounded-md p-4 h-min m-2">
                                <h1>Team name: {team.name}</h1>
                                {#each team.players as player}
                                    <h2 class="ml-4">{player}</h2>
                                {/each}
                            </div>
                        {/each}
                    {:else}
                        <h1 class="text-md font-semibold text-white m-4 p-2">Waiting for players...</h1>
                    {/if}
                </div>
            </div>
        {:else if state === "playing"}
            <div class="flex my-2 py-2 text-center font-semibold bg-slate-700 rounded-md">
                <h1 class="text-4xl text-white w-1/3">Clock: {timer / 60}:{timer % 60 > 9 ? timer % 60 : '0' + timer % 60}</h1>
                <h1 class="text-4xl text-white w-1/3">Die 1: {die1}</h1>
                <h1 class="text-4xl text-white w-1/3">Die 2: {die2}</h1>
            </div>
            <div class="mt-2 bg-[url('images/woodbg.jpg')] rounded-md grid place-content-center">
                <div class="flex justify-center p-32">
                    {#if die1 > 0 && showDice && die2 > 0}
                        <img src="images/dice/die{die1}.png" alt="die1" class="w-1/12 mr-4"
                            transition:flyRotate="{{ x: -innerWidth / 2, duration: 1000, easing: quintOut }}" />
                        <img src="images/dice/die{die2}.png" alt="die2" class="w-1/12 ml-4"
                            transition:flyRotate="{{ x: innerWidth / 2, duration: 1000, easing: quintOut }}" />
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>