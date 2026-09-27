<script lang="ts">
	import WeatherLayout from '$lib/components/shared/WeatherLayout.svelte';
	import CityLinks from '$lib/components/shared/CityLinks.svelte';
	import Footer from '$lib/components/shared/Footer.svelte';
	import Seo from '$lib/components/shared/Seo.svelte';
	import { i18n } from '$lib/i18n/state.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title={data.seo.title}
	description={data.seo.description}
	path={data.seo.path}
	socialTitle={data.seo.title}
	imageAlt={`${i18n.t.weather} — Pogodka`}
	jsonLd={data.jsonLd}
/>

<WeatherLayout data={data.weather} home>
	<CityLinks
		id="region-centres"
		title={i18n.t.centresTitle}
		subtitle={i18n.t.centresSubtitle}
		prefix={i18n.t.weather}
		cities={data.centres}
	/>
</WeatherLayout>
<Footer breadcrumb={data.weather.misto} region={data.weather.oblast} />
