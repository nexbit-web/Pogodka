import { error } from '@sveltejs/kit';
import { renderIndex, sitemapFileCount, SITEMAP_HEADERS, today } from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

// Індекс карти сайту
export const GET: RequestHandler = async () => {
	// База недоступна, а в кеші ще порожньо — 503: робот прийде пізніше (Retry-After — у hooks.server)
	const files = await sitemapFileCount().catch((err: unknown) => {
		console.error('[sitemap] База недоступна:', err);
		error(503, 'Карта сайту тимчасово недоступна');
	});
	return new Response(renderIndex(files, today()), { headers: SITEMAP_HEADERS });
};
