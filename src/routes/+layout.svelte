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

	// Плашка «Погода там, де ви зараз» — лише при першому візиті і лише там, де геолокація можлива.
	// Її код вантажиться окремо і тільки тим, кому її покажуть; зʼявляється через 1,5 с після сторінки
	let GeoPrompt = $state<typeof import('$lib/components/shared/GeoPrompt.svelte').default | null>(
		null
	);
	$effect(() => {
		let cancelled = false;
		const timer = setTimeout(async () => {
			const { shouldOfferGeolocation } = await import('$lib/geolocate');
			if (cancelled || !(await shouldOfferGeolocation())) return;
			const m = await import('$lib/components/shared/GeoPrompt.svelte');
			if (!cancelled) GeoPrompt = m.default;
		}, 1500);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
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
{#if GeoPrompt}
	<GeoPrompt />
{/if}
<TopLoader />

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
</div>
