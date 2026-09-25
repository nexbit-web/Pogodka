<script lang="ts">
	import WeatherLayout from '$lib/components/shared/WeatherLayout.svelte';
	import Footer from '$lib/components/shared/Footer.svelte';
	import { OG_IMAGE, SITE_NAME, SITE_URL } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const canonical = $derived(`${SITE_URL}/pohoda/${data.slug}`);
	const title = $derived(
		`POGODKA: Погода в ${data.titleCity} (Україна): температура, опади, вітер, вологість, тиск | Прогноз на тиждень`
	);
	const description = $derived(
		`Актуальний прогноз погоди в місті ${data.titleCity}: температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.`
	);
	const ogTitle = $derived(`Pogodka — точний прогноз погоди в ${data.titleCity}`);

	// JSON-LD як готовий тег. "<" у даних екрануємо, щоб вони не могли закрити <script>,
	// а сам закривальний тег склеюємо з двох частин, щоб не обірвати цей блок.
	const jsonLdScript = $derived(
		`<script type="application/ld+json">${JSON.stringify(data.jsonLd).replace(/</g, '\\u003c')}<` +
			'/script>'
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="uk_UA" />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={`Погода в ${data.titleCity} — Pogodka`} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={ogTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={OG_IMAGE} />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<WeatherLayout data={data.weather} />
<Footer breadcrumb={data.titleCity} region={data.weather.oblast} />
