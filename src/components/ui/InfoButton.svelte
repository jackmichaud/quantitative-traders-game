<script>
  export let text = "";
</script>

<div class="relative group">
  <button
    class="text-slate-400 hover:text-white text-sm font-bold leading-none flex items-center justify-center transition-colors duration-150"
    tabindex="-1"
  >
    ⓘ
  </button>
  <div class="absolute right-0 top-full mt-1 z-20 w-48 bg-slate-800 border border-white rounded-md p-2 text-white text-xs font-semibold hidden group-hover:block pointer-events-none shadow-lg">
    {text}
  </div>
</div>
