<script lang="ts">
	import WeatherLayout from '$lib/components/shared/WeatherLayout.svelte';
	import Footer from '$lib/components/shared/Footer.svelte';
	import { OG_IMAGE, SITE_NAME, SITE_URL } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const title = 'Pogodka';
	const description =
		'Точний прогноз погоди в Україні: температура, опади, вітер, сонце та хмарність у містах і селах України з погодинним та 7-денним прогнозом.';
	const ogTitle = 'Pogodka — точний прогноз погоди в Україні';
	const ogDescription =
		'Pogodka: міста і села України, температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={SITE_URL} />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="uk_UA" />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={ogDescription} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Погода в Україні — Pogodka" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={ogTitle} />
	<meta name="twitter:description" content={ogDescription} />
	<meta name="twitter:image" content={OG_IMAGE} />
</svelte:head>

<WeatherLayout data={data.weather} />
<Footer breadcrumb={data.weather.misto} region={data.weather.oblast} />
