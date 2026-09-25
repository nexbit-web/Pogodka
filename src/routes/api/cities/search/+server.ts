import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import type { CitySearchResult } from '$lib/types';
import type { RequestHandler } from './$types';

const CITY_FIELDS = {
	id: true,
	slug: true,
	nameUa: true,
	nameRu: true,
	nameEn: true,
	region: true,
	latitude: true,
	longitude: true
} as const;

const POPULAR_SLUGS = [
	'kyiv',
	'kharkiv',
	'odesa',
	'dnipro',
	'donetsk',
	'zaporizhzhia',
	'lviv',
	'kryvyi-rih',
	'mykolaiv',
	'mariupol'
];

// Кешуємо популярні міста в пам'яті процесу на 1 годину
let popularCitiesCache: CitySearchResult[] | null = null;
let popularCacheTime = 0;

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim();

	// Без запиту — повертаємо популярні міста
	if (!query || query.length < 2) {
		const now = Date.now();

		if (!popularCitiesCache || now - popularCacheTime > 3_600_000) {
			const cities = await prisma.city.findMany({
				where: { slug: { in: POPULAR_SLUGS } },
				select: CITY_FIELDS
			});
			// Сортуємо в потрібному порядку
			cities.sort((a, b) => POPULAR_SLUGS.indexOf(a.slug) - POPULAR_SLUGS.indexOf(b.slug));

			popularCitiesCache = cities;
			popularCacheTime = now;
		}

		return json(popularCitiesCache, {
			headers: {
				'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
			}
		});
	}

	const cities = await prisma.city.findMany({
		where: {
			OR: [
				{ nameUa: { startsWith: query, mode: 'insensitive' } },
				{ nameRu: { startsWith: query, mode: 'insensitive' } },
				{ nameEn: { startsWith: query, mode: 'insensitive' } }
			]
		},
		select: CITY_FIELDS,
		take: 20,
		orderBy: { nameEn: 'asc' }
	});

	return json(cities, {
		headers: {
			// Короткий кеш для пошуку
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
		}
	});
};
