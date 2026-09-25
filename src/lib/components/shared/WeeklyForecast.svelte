<script lang="ts">
	import { DateTime } from 'luxon';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import SectionHeading from './SectionHeading.svelte';
	import { KYIV_TZ, getConditionTint, getTempColor, getWeatherIconId } from '$lib/weather';
	import type { WeeklyDay } from '$lib/types';

	interface Props {
		days: WeeklyDay[];
		/** Поточна температура — показуємо крапкою на смужці сьогоднішнього дня */
		currentTemp?: number;
	}

	let { days, currentTemp }: Props = $props();

	const shortDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

	function getDayLabel(dateString: string) {
		const today = DateTime.now().setZone(KYIV_TZ).startOf('day');
		const date = DateTime.fromISO(dateString, { zone: KYIV_TZ }).startOf('day');

		if (date.diff(today, 'days').days === 0) return 'Сьогодні';
		return shortDays[date.weekday % 7];
	}

	// Діапазон усього тижня задає шкалу, спільну для всіх смужок
	const scale = $derived.by(() => {
		const mins = days.map((d) => d.day.mintemp_c);
		const maxs = days.map((d) => d.day.maxtemp_c);
		const lo = Math.min(...mins);
		const hi = Math.max(...maxs);
		// Захист від ділення на нуль, якщо тиждень рівний
		return { lo, hi, span: hi - lo || 1 };
	});

	const pct = (value: number) => ((value - scale.lo) / scale.span) * 100;
</script>

<section aria-labelledby="weekly-title">
	<SectionHeading id="weekly-title" icon={CalendarDays} title="Прогноз на 7 днів" />

	<ul class="mt-3">
		{#each days as day, idx (day.date)}
			{@const isToday = idx === 0}
			{@const left = pct(day.day.mintemp_c)}
			{@const right = pct(day.day.maxtemp_c)}
			<li
				class="grid grid-cols-[4.75rem_1.5rem_2.25rem_1fr_2.25rem] items-center gap-3 border-t border-separator py-3.5 first:border-t-0 sm:grid-cols-[5rem_2rem_3rem_1fr_3rem] sm:gap-4"
			>
				<!-- День тижня -->
				<span class="text-[0.9375rem] {isToday ? 'font-semibold' : 'font-normal'}">
					{getDayLabel(day.date)}
				</span>

				<!-- Стан погоди -->
				<svg
					class="h-[1.375rem] w-[1.375rem]"
					style="color: {getConditionTint(day.day.code)}"
					aria-hidden="true"
					viewBox="0 0 24 24"
				>
					<use href={`/icons.svg?v=6#${getWeatherIconId(day.day.code)}`}></use>
				</svg>

				<!-- Мінімум -->
				<span class="text-right text-[0.9375rem] text-muted-foreground tabular-nums">
					{Math.round(day.day.mintemp_c)}°
				</span>

				<!-- Смужка діапазону температур -->
				<div
					class="temp-track relative h-1.5 rounded-full"
					role="img"
					aria-label={`Від ${Math.round(day.day.mintemp_c)} до ${Math.round(day.day.maxtemp_c)} градусів`}
				>
					<div
						class="absolute inset-y-0 rounded-full"
						style="left: {left}%; right: {100 -
							right}%; background: linear-gradient(to right, {getTempColor(
							day.day.mintemp_c
						)}, {getTempColor(day.day.maxtemp_c)})"
					></div>

					<!-- Крапка поточної температури -->
					{#if isToday && currentTemp !== undefined}
						<span
							class="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-white shadow-sm"
							style="left: {Math.min(Math.max(pct(currentTemp), 0), 100)}%"
							aria-hidden="true"
						></span>
					{/if}
				</div>

				<!-- Максимум -->
				<span class="text-right text-[0.9375rem] font-medium tabular-nums">
					{Math.round(day.day.maxtemp_c)}°
				</span>
			</li>
		{/each}
	</ul>
</section>
