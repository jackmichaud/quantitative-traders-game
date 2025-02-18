<script>
    import { createEventDispatcher } from 'svelte';

    export let title = "Title"

    const dispatch = createEventDispatcher();
  
    function close() {
		dispatch('close');
    }
</script>


<div class="fixed top-0 right-0 bottom-0 left-0 bg-black/[.5] flex justify-center items-center z-50">
    <div class="border-white bg-slate-600 border rounded-md flex flex-col">
        
        <div class="flex justify-between bg-slate-700 border-b m2 rounded-t-md p-2">
            <h1 class="text-orange-500 italic mr-8">{title}</h1>
            <button class="font-semibold text-lg mr-4 underline hover:scale-105 hover:shadow-lg transform transition-transform duration-150" on:click={close}>Back &gt;</button>
        </div>
        <slot></slot>
    </div>
</div>