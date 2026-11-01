import { error, json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { rankSearchResults } from '$lib/server/cityRank';
import { attachPaths } from '$lib/server/cities';
import { REFERENCE_TTL, cachedJson } from '$lib/server/cache';
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

// Популярні міста — у памʼяті процесу на годину, а між процесами — у Redis
let popularCitiesCache: CitySearchResult[] | null = null;
let popularCacheTime = 0;

const isResults = (value: unknown): value is CitySearchResult[] =>
	Array.isArray(value) &&
	value.every((c) => typeof c?.path === 'string' && typeof c?.nameUa === 'string');

/*
	Підказки пошуку — з Redis: список населених пунктів змінюється хіба що з новим імпортом бази,
	а ті самі запити («ки», «київ», «льв») люди набирають щодня. База прокидається лише
	для запиту, якого цього тижня ще не було.
*/
async function popularCities(): Promise<CitySearchResult[]> {
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
	return picked.map((city) => ({ ...city, path: city.slug }));
}

async function searchCities(query: string): Promise<CitySearchResult[]> {
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
	return attachPaths(rankSearchResults(candidates, query));
}

// База недоступна, а запиту ще немає в кеші — «тимчасово», а не 500 (Retry-After додає hooks.server)
function unavailable(err: unknown): never {
	console.error('[search] База недоступна:', err);
	error(503, 'Пошук тимчасово недоступний');
}

export const GET: RequestHandler = async ({ url }) => {
	// Довжина обмежена: назв довших за 64 символи немає, а довгий рядок — зайве навантаження на БД
	const query = url.searchParams.get('q')?.trim().slice(0, 64);

	// Без запиту — популярні міста
	if (!query || query.length < 2) {
		const now = Date.now();

		if (!popularCitiesCache || now - popularCacheTime > 3_600_000) {
			popularCitiesCache = await cachedJson(
				'search:v1:popular',
				REFERENCE_TTL,
				popularCities,
				isResults
			).catch(unavailable);
			popularCacheTime = now;
		}

		return json(popularCitiesCache, {
			headers: {
				'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
			}
		});
	}

	// Регістр не важливий: база шукає без нього, тож «Київ» і «київ» — один запис
	const cities = await cachedJson(
		`search:v1:${query.toLowerCase()}`,
		REFERENCE_TTL,
		() => searchCities(query),
		isResults
	).catch(unavailable);

	return json(cities, {
		headers: {
			// Короткий кеш для пошуку
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
		}
	});
};
