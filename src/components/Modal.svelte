<script>
    import { createEventDispatcher } from 'svelte';

    export let title = "Title"

    const dispatch = createEventDispatcher();

    function portal(node) {
		const target = document.body;
		target.appendChild(node);

		return {
			destroy() {
				if (node.parentNode === target) target.removeChild(node);
			}
		};
	}
  
    function close() {
		dispatch('close');
    }
</script>


<div use:portal class="fixed inset-0 bg-black/[.5] flex justify-center items-center z-[100]" role="dialog" aria-modal="true" aria-label={title}>
    <div class="border-white bg-slate-600 border rounded-md flex flex-col shadow-md shadow-black">
        
        <div class="flex justify-between bg-slate-700 border-b m2 rounded-t-md p-2 shadow-md shadow-black">
            <h1 class="text-orange-500 italic mr-8">{title}</h1>
            <button class="font-semibold text-lg mr-4 underline hover:scale-105 hover:shadow-lg transform transition-transform duration-150" on:click={close}>Back &gt;</button>
        </div>
        <slot></slot>
    </div>
</div>
