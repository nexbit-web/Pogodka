<script lang="ts">
	import WeatherLayout from '$lib/components/shared/WeatherLayout.svelte';
	import CityLinks from '$lib/components/shared/CityLinks.svelte';
	import Footer from '$lib/components/shared/Footer.svelte';
	import Seo from '$lib/components/shared/Seo.svelte';
	import { HOME_DESCRIPTION, HOME_TITLE } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title={HOME_TITLE}
	description={HOME_DESCRIPTION}
	path="/"
	socialTitle="Pogodka — точний прогноз погоди в Україні"
	imageAlt="Погода в Україні — Pogodka"
	jsonLd={data.jsonLd}
/>

<WeatherLayout data={data.weather}>
	<CityLinks
		id="region-centres"
		title="Погода в обласних центрах."
		subtitle="Столиця та всі області України."
		cities={data.centres}
	/>
</WeatherLayout>
<Footer breadcrumb={data.weather.misto} region={data.weather.oblast} />
