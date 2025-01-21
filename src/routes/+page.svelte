<script>
    import { authStore } from "../stores/authStore";
    import DiceGame from "../components/DiceGame.svelte";
    import Trader from "../components/Trader.svelte";
    import RealtimeTrader from "../components/RealtimeTrader.svelte";

    
</script>


{#if $authStore?.game?.type === "dice"}
    <div></div>
{:else if $authStore?.game?.type === "cards"}
    <h1> Different Game </h1>
{:else}
    <div class="bg-slate-500">
        <RealtimeTrader/>
    </div>
{/if}