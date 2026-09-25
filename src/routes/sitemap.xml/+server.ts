import { renderIndex, sitemapFileCount, SITEMAP_HEADERS, today } from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

// Індекс карти сайту
export const GET: RequestHandler = async () => {
	const files = await sitemapFileCount();
	return new Response(renderIndex(files, today()), { headers: SITEMAP_HEADERS });
};
