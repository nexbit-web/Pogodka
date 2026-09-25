<script lang="ts">
	import Container from './Container.svelte';
	import WeatherHeadline from './WeatherHeadline.svelte';
	import DayForecast from './DayForecast.svelte';
	import PartnerBanner from './PartnerBanner.svelte';
	import { findCurrentHourIndex, getCurrentWeather } from '$lib/weather';
	import { kyivNow } from '$lib/date';
	import { untrack, type Snippet } from 'svelte';
	import type { WeatherApiResponse } from '$lib/types';

	let { data, children }: { data: WeatherApiResponse; children?: Snippet } = $props();

	const weather = $derived(data.weather);

	/*
		Одна «поточна година» для шапки й таблиці — щоб «зараз» скрізь показувало те саме.
		Сторінка може прийти з кешу CDN (до пів години) або довго лишатися відкритою,
		тож після завантаження і далі щохвилини година звіряється з годинником.
	*/
	let now = $state(kyivNow());
	$effect(() => {
		const sync = () => {
			const next = kyivNow();
			const prev = untrack(() => now);
			if (next.date !== prev.date || next.hour !== prev.hour) now = next;
		};
		sync();
		const timer = setInterval(sync, 60_000);
		return () => clearInterval(timer);
	});

	const current = $derived(getCurrentWeather(weather, findCurrentHourIndex(weather, now)));
</script>

<Container>
	<WeatherHeadline
		city={data.misto}
		temperature={current.temp}
		weather={current.code}
		isFelt={current.feels}
	/>

	<!-- Увесь прогноз — в одному місці: стрічка днів і деталі вибраного дня -->
	<div class="pt-4 pb-10 sm:py-5">
		<DayForecast {weather} {now} city={data.misto} />
	</div>

	<!-- Посилання на інші населені пункти: сусідні або обласні центри -->
	{@render children?.()}

	<PartnerBanner />
</Container>
