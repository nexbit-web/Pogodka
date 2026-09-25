import { error } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { SITE_URL } from '$lib/config';
import type { RequestHandler } from './$types';

const CITIES_PER_FILE = 5000;

// Одна сторінка мапи сайту з URL міст
export const GET: RequestHandler = async ({ params }) => {
	const fileIndex = Number(params.index) - 1;

	if (!Number.isInteger(fileIndex) || fileIndex < 0) {
		error(404, 'Невідома сторінка мапи сайту');
	}

	const cities = await prisma.city.findMany({
		select: { slug: true },
		skip: fileIndex * CITIES_PER_FILE,
		take: CITIES_PER_FILE,
		orderBy: { id: 'asc' }
	});

	const now = new Date().toISOString();

	const urls = cities
		.map(
			(city) => `
  <url>
    <loc>${SITE_URL}/pohoda/${city.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
		)
		.join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
