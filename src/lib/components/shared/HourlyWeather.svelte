<script lang="ts">
	import { DateTime } from 'luxon';
	import Clock from '@lucide/svelte/icons/clock';
	import SectionHeading from './SectionHeading.svelte';
	import { KYIV_TZ, getConditionTint, getWeatherIconId } from '$lib/weather';
	import type { OpenMeteoWeather } from '$lib/types';

	interface Hour {
		time: string;
		temp: number;
		precip: number;
		code: number;
	}

	let { days }: { days: OpenMeteoWeather } = $props();

	// Години від поточної і далі, максимум 24
	const hours = $derived.by<Hour[]>(() => {
		if (!days?.hourly) return [];

		const kievNowHour = DateTime.now().setZone(KYIV_TZ).startOf('hour');

		return days.hourly.time
			.map((time, idx) => ({
				time,
				temp: days.hourly.temperature_2m[idx] ?? 0,
				precip: days.hourly.precipitation[idx] ?? 0,
				code: days.hourly.weathercode[idx] ?? 0
			}))
			.filter((h) => DateTime.fromISO(h.time).setZone(KYIV_TZ).startOf('hour') >= kievNowHour)
			.slice(0, 24);
	});

	function scrollToCurrent(node: HTMLElement) {
		node.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
	}
</script>

<section aria-labelledby="hourly-title">
	<SectionHeading id="hourly-title" icon={Clock} title="Погодинний прогноз" />

	<ul class="scroll-x mt-5 flex gap-1" aria-label="Погодинний прогноз погоди">
		{#each hours as hour, idx (hour.time)}
			{@const isCurrent = idx === 0}
			<li
				{@attach (node) => {
					if (isCurrent) scrollToCurrent(node);
				}}
				aria-current={isCurrent ? 'true' : undefined}
				class="flex min-w-[4.25rem] shrink-0 flex-col items-center gap-3 rounded-2xl px-2 py-3 transition-colors duration-200 {isCurrent
					? 'bg-fill'
					: 'hover:bg-fill'}"
			>
				<time
					datetime={hour.time}
					class="text-[0.8125rem] font-medium text-muted-foreground tabular-nums"
				>
					{isCurrent ? 'Зараз' : DateTime.fromISO(hour.time).setZone(KYIV_TZ).toFormat('HH:mm')}
				</time>

				<svg
					class="h-7 w-7"
					style="color: {getConditionTint(hour.code)}"
					aria-hidden="true"
					viewBox="0 0 24 24"
				>
					<use href={`/icons.svg?v=10#${getWeatherIconId(hour.code)}`}></use>
				</svg>

				<!-- Ймовірність опадів показуємо лише коли вони справді є -->
				{#if hour.precip > 0}
					<span class="text-[0.6875rem] font-medium text-w-rain tabular-nums">
						{hour.precip.toFixed(1)} мм
					</span>
				{:else}
					<span class="text-[0.6875rem]">&nbsp;</span>
				{/if}

				<span class="text-[1.0625rem] font-semibold tabular-nums">
					{Math.round(hour.temp)}°
				</span>
			</li>
		{/each}
	</ul>
</section>
