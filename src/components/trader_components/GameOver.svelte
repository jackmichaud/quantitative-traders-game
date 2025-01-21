<script>
    export let leaderboard = []
</script>

<div class="border-white border rounded-md bg-slate-700 w-full my-2">
    <h1 class="text-center text-white font-semibold py-2 text-xl border-white border-b">Game Over! Closing Game in 1 minute! </h1>
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