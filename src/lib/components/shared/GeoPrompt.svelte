<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Navigation from '@lucide/svelte/icons/navigation';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { GeoError, locateNearestCity, markGeoPromptSeen } from '$lib/geolocate';

	/*
		Плашка при першому візиті: «Погода там, де ви зараз».
		Не модальна й нічого не перекриває: виїжджає в лівому нижньому куті (на телефоні — знизу),
		фокус не забирає. Після будь-якої відповіді більше не показується.
	*/

	let visible = $state(true);
	let locating = $state(false);
	let error = $state('');

	// Компонент вантажиться лише в браузері, тож matchMedia доступний одразу
	const mobile = window.matchMedia('(max-width: 639px)').matches;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motion = {
		x: mobile ? 0 : -24,
		y: mobile ? 16 : 0,
		duration: reducedMotion ? 0 : 280
	};

	function dismiss() {
		markGeoPromptSeen();
		visible = false;
	}

	async function locate() {
		error = '';
		locating = true;
		try {
			const path = await locateNearestCity();
			dismiss();
			goto(resolve('/pohoda/[city]', { city: path }));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Не вдалося визначити місцезнаходження';
			// Доступ заборонено — питати знову немає сенсу
			if (err instanceof GeoError && err.denied) markGeoPromptSeen();
		} finally {
			locating = false;
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && visible) dismiss();
	}}
/>

{#if visible}
	<div
		role="dialog"
		aria-labelledby="geo-prompt-text"
		transition:fly={motion}
		class="fixed inset-x-4 bottom-4 z-40 rounded-[18px] border border-separator bg-background p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] sm:right-auto sm:bottom-6 sm:left-6 sm:w-[22rem] sm:p-5"
	>
		<div class="flex items-start gap-3">
			<Navigation class="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
			<div class="min-w-0">
				<!-- Одне речення-прохання, як на Синоптику; помилка стає на його місце -->
				<p id="geo-prompt-text" class="text-[15px] leading-snug">
					{error ||
						'Дозвольте Pogodka доступ до вашої геолокації, щоб дізнаватися про погоду там, де ви знаходитесь.'}
				</p>

				<div class="mt-3.5 flex items-center gap-2">
					<button
						type="button"
						onclick={locate}
						disabled={locating}
						class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70"
					>
						{#if locating}
							<LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
							Визначаємо…
						{:else}
							Дозволити
						{/if}
					</button>
					<button
						type="button"
						onclick={dismiss}
						class="h-9 cursor-pointer rounded-full px-3 text-[14px] text-primary transition-colors hover:bg-fill"
					>
						Не зараз
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
