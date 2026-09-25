import { error } from '@sveltejs/kit';
import {
	renderUrlset,
	sitemapEntries,
	SITEMAP_HEADERS,
	today,
	URLS_PER_FILE
} from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

// Один файл карти сайту: /sitemaps/1.xml
export const GET: RequestHandler = async ({ params }) => {
	const match = params.file.match(/^([1-9]\d*)\.xml$/);
	if (!match) error(404, 'Невідома сторінка мапи сайту');

	const index = Number(match[1]) - 1;
	const entries = await sitemapEntries();
	const chunk = entries.slice(index * URLS_PER_FILE, (index + 1) * URLS_PER_FILE);
	if (chunk.length === 0) error(404, 'Невідома сторінка мапи сайту');

	return new Response(renderUrlset(chunk, today()), { headers: SITEMAP_HEADERS });
};
