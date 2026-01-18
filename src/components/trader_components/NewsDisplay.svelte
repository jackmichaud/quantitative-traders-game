<script>
  export let news = [];

  let isExpanded = true;
  let seconds = Math.floor(Date.now() / 1000);

  // keep "now" updated so the "x s ago" / "x m ago" label updates
  const interval = setInterval(() => {
    seconds = Math.floor(Date.now() / 1000);
  }, 1000);

  import { onDestroy } from "svelte";
  onDestroy(() => clearInterval(interval));

  function getSeconds(item) {
    // supports Firestore Timestamp {seconds, nanoseconds} or a number
    const ts = item?.createdAt ?? item?.timestamp;
    if (typeof ts === "number") return ts;
    if (ts?.seconds != null) return ts.seconds;
    if (ts?.toMillis) return Math.floor(ts.toMillis() / 1000);
    if (item?.createdAtMs) return Math.floor(item.createdAtMs / 1000);
    return 0;
  }

  function formatItem(item) {
    const type = item?.type || "NEWS";
    const p = item?.payload || {};

    switch (type) {
      case "PLAYER_JOINED":
        return {
          title: "Player joined",
          content: `${p.teamName ?? "A team"}: ${JSON.stringify(p)} joined.`
        };

      case "PLAYER_LEFT":
        return {
          title: "Player left",
          content: `${p.teamName ?? "A team"}: ${p.userEmail ?? p.uid ?? "unknown"} left.`
        };

      case "GAME_STARTED":
        return { title: "Game started", content: "Trading is now live." };

      case "GAME_ENDED":
        return { title: "Game ended", content: "Trading has closed." };

      case "DICE_ROLL":
        return { title: "Dice roll", content: "A dice was rolled: [" + p.roll + "]" };

      default:
        // fallback: show raw-ish info without crashing
        return {
          title: type,
          content: p?.message ?? JSON.stringify(p)
        };
    }
  }

  function isRecent(item) {
    const s = getSeconds(item);
    return s > 0 && (seconds - s) < 60;
  }

  function ageLabel(item) {
    const s = getSeconds(item);
    if (!s) return "";
    const age = seconds - s;
    if (age < 60) return `${age} s ago`;
    return `${Math.floor(age / 60)} m ago`;
  }
</script>

<div class="basis-1/4 border-white border rounded-md shadow-black shadow-md">
  <div class="bg-slate-700 rounded-t-md {isExpanded ? 'rounded-b-none border-b' : 'rounded-b-md'} flex justify-between items-center px-4">
    <h1 class="text-center text-white font-semibold py-2 text-md flex-grow">News</h1>

    <button
      on:click={() => { isExpanded = !isExpanded }}
      class="text-white text-lg hover:scale-105 hover:shadow-lg transition-transform duration-150"
    >
      {isExpanded ? "↑" : "↓"}
    </button>
  </div>

  <div class="h-full overflow-y-auto overflow-x-hidden max-h-[80vh]">
    {#if news && isExpanded}
      {#if news.length === 0}
        <h1 class="text-md font-semibold text-white text-center p-4 italic">No news yet...</h1>
      {/if}

      {#each news as n (n.id)}
        {@const display = formatItem(n)}
        {@const recent = isRecent(n)}
        <div class="{recent ? 'bg-orange-500' : 'bg-slate-600'} my-2 border-y hover:scale-105 hover:shadow-lg transform transition-transform duration-150">
          <div class="flex content-between">
            <h1 class="mx-2 my-0 {recent ? 'text-slate-600' : 'text-white'} font-semibold pt-2 text-md">{display.title}</h1>

            {#if ageLabel(n)}
              <h1 class="mx-2 my-0 {recent ? 'text-slate-600' : 'text-white'}  font-semibold pt-2 text-sm italic">{ageLabel(n)}</h1>
            {/if}
          </div>

          <h1 class="mx-2 my-0 {recent ? 'text-slate-600' : 'text-white'}  font-semibold py-2 text-sm">{display.content}</h1>
        </div>
      {/each}
    {/if}
  </div>
</div>