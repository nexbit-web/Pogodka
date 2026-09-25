<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import Header from '$lib/components/shared/Header.svelte';
	import TopLoader from '$lib/components/shared/TopLoader.svelte';

	let { children } = $props();

	// Сповіщення потрібні рідко (форма підтримки), тож їх код довантажується
	// окремо вже після показу сторінки і не гальмує перше завантаження
	let Toaster = $state<typeof import('$lib/components/ui/sonner').Toaster | null>(null);
	$effect(() => {
		import('$lib/components/ui/sonner').then((m) => (Toaster = m.Toaster));
	});
</script>

<!--
	Тема за замовчуванням завжди світла, системна не відстежується: темну вмикають вручну.
	Новий ключ сховища — щоб у тих, хто раніше вибрав «як у системі», стартувала світла.
-->
<ModeWatcher
	defaultMode="light"
	track={false}
	modeStorageKey="pogodka-theme"
	themeColors={{ light: '#ffffff', dark: '#1c1c1e' }}
/>
{#if Toaster}
	<Toaster position="top-center" />
{/if}
<TopLoader />

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
</div>
