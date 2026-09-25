<script lang="ts">
	// Тонка смужка прогресу під час навігації — заміна nextjs-toploader
	import { navigating } from '$app/state';

	let { color = 'var(--primary)', height = 2 }: { color?: string; height?: number } = $props();

	let progress = $state(0);
	let visible = $state(false);

	$effect(() => {
		if (!navigating.to) {
			if (!visible) return;
			// Добігаємо до 100% і ховаємо
			progress = 100;
			const timeout = setTimeout(() => {
				visible = false;
				progress = 0;
			}, 200);
			return () => clearTimeout(timeout);
		}

		visible = true;
		progress = 0;

		// Асимптотично наближаємось до 90%, доки триває навігація
		const interval = setInterval(() => {
			progress = Math.min(progress + (90 - progress) * 0.15, 90);
		}, 200);

		return () => clearInterval(interval);
	});
</script>

{#if visible}
	<div
		class="pointer-events-none fixed top-0 left-0 z-[9999] transition-[width] duration-200 ease-out"
		style={`width: ${progress}%; height: ${height}px; background: ${color}`}
		role="progressbar"
		aria-label="Завантаження сторінки"
		aria-valuenow={Math.round(progress)}
		aria-valuemin={0}
		aria-valuemax={100}
	></div>
{/if}
