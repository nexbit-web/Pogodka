<script lang="ts">
	import Container from './Container.svelte';
	import WeatherHeadline from './WeatherHeadline.svelte';
	import HourlyWeather from './HourlyWeather.svelte';
	import WeeklyForecast from './WeeklyForecast.svelte';
	import WeatherDetails from './WeatherDetails.svelte';
	import { buildWeeklyDays, findCurrentHourIndex, getCurrentWeather } from '$lib/weather';
	import type { WeatherApiResponse } from '$lib/types';

	let { data }: { data: WeatherApiResponse } = $props();

	const weather = $derived(data.weather);
	const current = $derived(getCurrentWeather(weather, findCurrentHourIndex(weather)));
	const weeklyDays = $derived(buildWeeklyDays(weather));
</script>

<Container>
	<WeatherHeadline
		city={data.misto}
		temperature={current.temp}
		weather={current.code}
		isFelt={current.feels}
	/>

	<!-- Секції розділені повітрям і волосяною лінією, без рамок -->
	<div class="py-10">
		<HourlyWeather days={weather} />
	</div>

	<div class="border-t border-separator py-10">
		<WeeklyForecast days={weeklyDays} currentTemp={current.temp} />
	</div>

	<div class="border-t border-separator py-10">
		<WeatherDetails {current} />
	</div>
</Container>
