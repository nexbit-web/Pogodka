import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { rankSearchResults } from '$lib/server/cityRank';
import { attachPaths } from '$lib/server/cities';
import { KYIV, kyivMatchesPrefix } from '$lib/server/regions';
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

type City = Omit<CitySearchResult, 'path'>;

const CAPITAL: City = {
	id: KYIV.id,
	slug: KYIV.slug,
	nameUa: KYIV.nameUa,
	nameRu: KYIV.nameRu,
	nameEn: KYIV.nameEn,
	region: KYIV.region,
	latitude: KYIV.latitude,
	longitude: KYIV.longitude
};

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
	// Довжина обмежена: назв довших за 64 символи немає, а довгий рядок — зайве навантаження на БД
	const query = url.searchParams.get('q')?.trim().slice(0, 64);

	// Без запиту — популярні міста
	if (!query || query.length < 2) {
		const now = Date.now();

		if (!popularCitiesCache || now - popularCacheTime > 3_600_000) {
			const rows: City[] = await prisma.city.findMany({
				where: { slug: { in: POPULAR_SLUGS } },
				select: CITY_FIELDS
			});
			const cities = [CAPITAL, ...rows];

			// Слаги в базі не унікальні (сім «zaporizhzhia», село «kyiv»): лишаємо по одному
			// місту на слаг — столицю чи обласний центр — і сортуємо в заданому порядку
			const picked = POPULAR_SLUGS.flatMap((slug) =>
				rankSearchResults(
					cities.filter((c) => c.slug === slug),
					'',
					1
				)
			);
			popularCitiesCache = picked.map((city) => ({ ...city, path: city.slug }));
			popularCacheTime = now;
		}

		return json(popularCitiesCache, {
			headers: {
				'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
			}
		});
	}

	const rows: City[] = await prisma.city.findMany({
		where: {
			OR: [
				{ nameUa: { startsWith: query, mode: 'insensitive' } },
				{ nameRu: { startsWith: query, mode: 'insensitive' } },
				{ nameEn: { startsWith: query, mode: 'insensitive' } }
			]
		},
		select: CITY_FIELDS,
		// Беремо із запасом: «Оде» має понад 20 збігів, а Одеса мусить потрапити в підказки
		take: 200,
		orderBy: { id: 'asc' }
	});

	const candidates = kyivMatchesPrefix(query) ? [CAPITAL, ...rows] : rows;
	const cities = await attachPaths(rankSearchResults(candidates, query));

	return json(cities, {
		headers: {
			// Короткий кеш для пошуку
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
		}
	});
};
