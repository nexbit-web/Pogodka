import prisma from '$lib/server/prisma';
import { SITE_URL } from '$lib/config';
import type { RequestHandler } from './$types';

const CITIES_PER_FILE = 5000;

// Індекс мап сайту
export const GET: RequestHandler = async () => {
	const totalCities = await prisma.city.count();
	const numFiles = Math.ceil(totalCities / CITIES_PER_FILE);
	const now = new Date().toISOString();

	const sitemaps = Array.from(
		{ length: numFiles },
		(_, i) => `
    <sitemap>
      <loc>${SITE_URL}/api/sitemap/${i + 1}</loc>
      <lastmod>${now}</lastmod>
    </sitemap>
  `
	).join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
