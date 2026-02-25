<script>
    import InfoButton from '../ui/InfoButton.svelte';
    export let leaderboard = []
</script>

<div class="border-white border rounded-md bg-slate-700 w-full my-2 shadow-md shadow-black">
    <div class="flex items-center justify-between border-white border-b px-4">
        <h1 class="text-center text-white font-semibold py-2 text-xl flex-grow">Game Over! Click "Leave Game" to return to the lobby.</h1>
        <InfoButton text="Final P&L rankings for all teams and players. Leave the game to return to the lobby." />
    </div>
    {#each leaderboard.sort((a, b) => b.balance - a.balance) as team}
        <div class="text-center text-white font-semibold text-sm border-white border">
            <h1 class="text-center text-white font-semibold text-sm my-2">{team.name}: {#if team.balance >= 0} ${team.balance} {:else} (${team.balance * -1}) {/if}</h1>
            {#if team.players.length > 0}
                {#each team.players as player}
                    <h1 class="text-center text-white font-semibold my-2 text-sm">{player.email}: {#if player.balance >= 0} ${player.balance} {:else} (${player.balance * -1}) {/if} </h1>
                {/each}
            {/if}
        </div>
    {/each}

</div>