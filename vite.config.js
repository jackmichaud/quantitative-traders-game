import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		chunkSizeWarningLimit: 750
	},
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: '200.html' }),
			preprocess: vitePreprocess()
		})
	]
});
