import {
	renderIndex,
	sitemapEntries,
	SITEMAP_HEADERS,
	today,
	URLS_PER_FILE
} from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

// Індекс карти сайту
export const GET: RequestHandler = async () => {
	const entries = await sitemapEntries();
	const files = Math.max(1, Math.ceil(entries.length / URLS_PER_FILE));
	return new Response(renderIndex(files, today()), { headers: SITEMAP_HEADERS });
};
