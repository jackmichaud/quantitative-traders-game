<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
  
    function close() {
		dispatch('close');
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="fixed top-0 right-0 bottom-0 left-0 bg-black/[.5] flex justify-center items-center z-30">
    <div class="border-orange-500 bg-slate-600 border rounded-md flex flex-col p-4">
        <div class="flex justify-end">
            <button class="font-semibold text-lg mr-4 underline" on:click={close}>Back &gt;</button>
        </div>
        <slot></slot>
    </div>
</div>