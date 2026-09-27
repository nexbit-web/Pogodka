<script lang="ts">
	import { OG_IMAGE, SITE_NAME } from '$lib/config';
	import { absoluteUrl, serializeLd } from '$lib/seo';
	import { LANGS, isLocalized, langFromPath, localize, stripLang } from '$lib/i18n';

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

	// Мовні версії сторінки для пошуковиків: українська — основна (x-default).
	// Сторінки без перекладу посилаються лише на себе
	const lang = $derived(langFromPath(path));
	const alternates = $derived(
		isLocalized(stripLang(path))
			? LANGS.map((l) => ({ hreflang: l.hreflang, href: absoluteUrl(localize(path, l.id)) }))
			: [{ hreflang: 'uk', href: url }]
	);
	const xDefault = $derived(absoluteUrl(localize(path, 'uk')));
	const locale = $derived(LANGS.find((l) => l.id === lang)!.locale);
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
		{#each alternates as alt (alt.hreflang)}
			<link rel="alternate" hreflang={alt.hreflang} href={alt.href} />
		{/each}
		<link rel="alternate" hreflang="x-default" href={xDefault} />
	{/if}

	<meta property="og:type" content="website" />
	<meta property="og:locale" content={locale} />
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
