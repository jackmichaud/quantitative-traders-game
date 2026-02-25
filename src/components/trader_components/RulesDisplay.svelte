<script>
  import InfoButton from '../ui/InfoButton.svelte';

  export let gameType = null;

  let isExpanded = true;

  const rules = {
    dice: {
      description: "Each tick, a number 1–30 is rolled. Markets settle on the accumulated rolls when the game closes.",
      markets: [
        { id: "SUM",     rule: "Sum of all rolls" },
        { id: "PRODUCT", rule: "Product of all rolls" },
        { id: "RANGE",   rule: "Max roll − Min roll" },
        { id: "EVENS",   rule: "(Sum of even rolls)²" },
        { id: "ODDS",    rule: "(Sum of odd rolls)²" },
      ]
    },
    cards: {
      description: "Each tick, a card 1–10 is drawn without replacement. Markets settle on the cards that were NOT drawn by close.",
      markets: [
        { id: "2s", rule: "(Sum of remaining even cards)²" },
        { id: "3s", rule: "(Sum of remaining multiples of 3)³" },
        { id: "4s", rule: "Product of remaining cards > 4" },
        { id: "5s", rule: "(Min remaining card ≤ 5)⁵" },
        { id: "6s", rule: "(Sum of remaining cards ≥ 6) × 6" },
      ]
    }
  };

  $: gameRules = gameType ? rules[gameType] : null;
</script>

<div class="border-white border rounded-md mb-2 shadow-black shadow-md">
  <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md border-none'} flex justify-between items-center px-4 py-2">
    <h1 class="text-center text-white font-semibold text-md">Rules</h1>
    <div class="flex items-center gap-2">
      <InfoButton text="Settlement formula for each market in the current game type." />
      <button
        on:click={() => { isExpanded = !isExpanded }}
        class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150"
      >
        {isExpanded ? '↑' : '↓'}
      </button>
    </div>
  </div>

  {#if isExpanded}
    {#if !gameType || !gameRules}
      <p class="text-white font-semibold text-sm italic text-center p-4">Join a game to see rules.</p>
    {:else}
      <p class="text-white font-semibold text-sm px-3 pt-3 pb-2">{gameRules.description}</p>

      <div class="border-t border-dashed border-white mx-2 mb-1"></div>

      {#each gameRules.markets as market}
        <div class="flex justify-between items-center bg-slate-600 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150 px-3 py-1">
          <span class="text-white font-semibold text-sm">{market.id}</span>
          <span class="text-slate-300 font-semibold text-sm text-right">{market.rule}</span>
        </div>
      {/each}

      <div class="h-1"></div>
    {/if}
  {/if}
</div>
