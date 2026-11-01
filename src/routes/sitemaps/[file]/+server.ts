import { error } from '@sveltejs/kit';
import { renderUrlset, sitemapChunk, SITEMAP_HEADERS, today } from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

// Один файл карти сайту: /sitemaps/1.xml
export const GET: RequestHandler = async ({ params }) => {
	// До 9999 файлів: більший номер не має сенсу і не повинен доходити до бази
	const match = params.file.match(/^([1-9]\d{0,3})\.xml$/);
	if (!match) error(404, 'Невідома сторінка мапи сайту');

	// База недоступна, а в кеші ще порожньо — 503: робот прийде пізніше (Retry-After — у hooks.server)
	const chunk = await sitemapChunk(Number(match[1]) - 1).catch((err: unknown) => {
		console.error('[sitemap] База недоступна:', err);
		error(503, 'Карта сайту тимчасово недоступна');
	});
	if (chunk.length === 0) error(404, 'Невідома сторінка мапи сайту');

	return new Response(renderUrlset(chunk, today()), { headers: SITEMAP_HEADERS });
};
