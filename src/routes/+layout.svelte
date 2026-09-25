<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import Header from '$lib/components/shared/Header.svelte';
	import TopLoader from '$lib/components/shared/TopLoader.svelte';

	let { children } = $props();
</script>

<ModeWatcher />
<Toaster position="top-center" />
<TopLoader />

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
</div>
