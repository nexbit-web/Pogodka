<script lang="ts">
	import Container from './Container.svelte';
	import WeatherHeadline from './WeatherHeadline.svelte';
	import DayForecast from './DayForecast.svelte';
	import PartnerBanner from './PartnerBanner.svelte';
	import { findCurrentHourIndex, getCurrentWeather } from '$lib/weather';
	import type { WeatherApiResponse } from '$lib/types';

	let { data }: { data: WeatherApiResponse } = $props();

	const weather = $derived(data.weather);
	const current = $derived(getCurrentWeather(weather, findCurrentHourIndex(weather)));
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
		<DayForecast {weather} />
	</div>

	<PartnerBanner />
</Container>
