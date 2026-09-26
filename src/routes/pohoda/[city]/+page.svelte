<script lang="ts">
	import WeatherLayout from '$lib/components/shared/WeatherLayout.svelte';
	import CityLinks from '$lib/components/shared/CityLinks.svelte';
	import Footer from '$lib/components/shared/Footer.svelte';
	import Seo from '$lib/components/shared/Seo.svelte';
	import { rememberCity } from '$lib/cityHistory';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Історія для пошуку; з останнім переглянутим відкриється головна наступного разу (див. app.html)
	$effect(() => {
		rememberCity({ path: data.city.path, name: data.city.name, region: data.city.region });
	});
</script>

<Seo
	title={data.seo.title}
	description={data.seo.description}
	path={`/pohoda/${data.city.path}`}
	socialTitle={`Погода ${data.city.name} на 7 днів — Pogodka`}
	imageAlt={`Погода ${data.city.name} — Pogodka`}
	jsonLd={data.seo.jsonLd}
/>

<WeatherLayout data={data.weather}>
	<CityLinks
		id="nearby"
		title="Погода поруч."
		subtitle="Сусідні міста й села."
		cities={data.nearby}
	/>
</WeatherLayout>
<Footer breadcrumb={data.city.name} region={data.city.region} />
