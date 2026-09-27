<script lang="ts">
	import WeatherLayout from './WeatherLayout.svelte';
	import CityLinks from './CityLinks.svelte';
	import Footer from './Footer.svelte';
	import Seo from './Seo.svelte';
	import { rememberCity } from '$lib/cityHistory';
	import { i18n } from '$lib/i18n/state.svelte';
	import type { ForecastView } from '$lib/forecastViews';
	import type { WeatherApiResponse } from '$lib/types';

	interface Props {
		data: {
			weather: WeatherApiResponse;
			view: ForecastView;
			city: { name: string; region: string; path: string };
			nearby: { name: string; path: string; note?: string }[];
			seo: { title: string; description: string; path: string; jsonLd: Record<string, unknown> };
		};
	}

	let { data }: Props = $props();

	// «на 7 днів», «на завтра» — для підпису в соцмережах
	const period = $derived(i18n.t.views[data.view].period);

	// Історія для пошуку; з останнім переглянутим відкриється головна наступного разу (див. app.html)
	$effect(() => {
		rememberCity({ path: data.city.path, name: data.city.name, region: data.city.region });
	});
</script>

<Seo
	title={data.seo.title}
	description={data.seo.description}
	path={data.seo.path}
	socialTitle={`Погода ${data.city.name} ${period} — Pogodka`}
	imageAlt={`${i18n.t.weather} ${data.city.name} — Pogodka`}
	jsonLd={data.seo.jsonLd}
/>

<WeatherLayout data={data.weather} view={data.view}>
	<CityLinks
		id="nearby"
		title={i18n.t.nearbyTitle}
		subtitle={i18n.t.nearbySubtitle}
		cities={data.nearby}
	/>
</WeatherLayout>
<Footer breadcrumb={data.city.name} region={data.city.region} />
