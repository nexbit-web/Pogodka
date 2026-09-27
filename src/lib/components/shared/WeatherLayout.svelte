<script lang="ts">
	import Container from './Container.svelte';
	import WeatherHeadline from './WeatherHeadline.svelte';
	import DayForecast from './DayForecast.svelte';
	import PartnerBanner from './PartnerBanner.svelte';
	import { findCurrentHourIndex, getCurrentWeather, precipOutlook } from '$lib/weather';
	import { kyivNow } from '$lib/date';
	import { untrack, type Snippet } from 'svelte';
	import { i18n } from '$lib/i18n/state.svelte';
	import type { ForecastView } from '$lib/forecastViews';
	import type { WeatherApiResponse } from '$lib/types';

	let {
		data,
		view = 'week',
		home = false,
		children
	}: {
		data: WeatherApiResponse;
		/** Яку сторінку прогнозу показуємо: 7 днів, завтра, 10 днів, вихідні */
		view?: ForecastView;
		/** Головна сторінка (Київ): «7 днів» у перемикачі веде на «/» */
		home?: boolean;
		children?: Snippet;
	} = $props();

	// «на завтра» — для h1; основна сторінка — просто «Погода Київ»
	const period = $derived(view === 'week' ? undefined : i18n.t.views[view].period);

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

	const hourIndex = $derived(findCurrentHourIndex(weather, now));
	const current = $derived(getCurrentWeather(weather, hourIndex));
	const outlook = $derived(precipOutlook(weather, hourIndex, 6, i18n.lang));
</script>

<Container>
	<WeatherHeadline
		city={data.misto}
		temperature={current.temp}
		weather={current.code}
		isFelt={current.feels}
		{outlook}
		{period}
	/>

	<!-- Увесь прогноз — в одному місці: стрічка днів і деталі вибраного дня -->
	<div class="pt-4 pb-10 sm:pt-5 sm:pb-14">
		<!-- Інша сторінка прогнозу — інший набір днів і вибраний день, тож стрічка будується наново -->
		{#key view}
			<DayForecast {weather} {now} air={data.air} {view} city={data.path} {home} />
		{/key}
	</div>

	<!-- Посилання на інші населені пункти: сусідні або обласні центри -->
	{@render children?.()}

	<PartnerBanner />
</Container>
