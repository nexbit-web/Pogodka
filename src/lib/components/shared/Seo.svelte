<script lang="ts">
	import { OG_IMAGE, SITE_NAME } from '$lib/config';
	import { absoluteUrl, serializeLd } from '$lib/seo';

	interface Props {
		title: string;
		description: string;
		/** Канонічний шлях сторінки: «/» або «/pohoda/lviv» */
		path: string;
		/** Заголовок для соцмереж, якщо відрізняється від <title> */
		socialTitle?: string;
		image?: string;
		imageAlt?: string;
		jsonLd?: Record<string, unknown>;
		noindex?: boolean;
	}

	let {
		title,
		description,
		path,
		socialTitle,
		image = OG_IMAGE,
		imageAlt,
		jsonLd,
		noindex = false
	}: Props = $props();

	const url = $derived(absoluteUrl(path));
	const imageUrl = $derived(image.startsWith('http') ? image : absoluteUrl(image));
	const shareTitle = $derived(socialTitle ?? title);

	// Закривальний тег склеюємо з двох частин, щоб не обірвати цей блок скрипта
	const ldScript = $derived(
		jsonLd ? `<script type="application/ld+json">${serializeLd(jsonLd)}<` + '/script>' : ''
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />

	{#if noindex}
		<meta name="robots" content="noindex, follow" />
	{:else}
		<meta
			name="robots"
			content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
		/>
		<link rel="canonical" href={url} />
		<!-- Сайт лише українською: мова сторінки і версія за замовчуванням -->
		<link rel="alternate" hreflang="uk" href={url} />
		<link rel="alternate" hreflang="x-default" href={url} />
	{/if}

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="uk_UA" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt ?? shareTitle} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />

	{#if ldScript}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html ldScript}
	{/if}
</svelte:head>
