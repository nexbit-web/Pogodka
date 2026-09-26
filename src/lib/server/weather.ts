import { error } from '@sveltejs/kit';
import prisma from './prisma';
import { redisGet, redisSet } from './upstash';
import { getAirQuality } from './air';
import { importance } from './cityRank';
import { assignPaths, parseRegionalPath } from './cityUrl';
import { KYIV, isKyivQuery } from './regions';
import { kyivNow } from '$lib/date';
import type { OpenMeteoWeather, WeatherApiResponse } from '$lib/types';

// Кеш живе 50 годин як запас на випадок збою Open-Meteo, але оновлюється, щойно старший за 2 години
const CACHE_TTL = 50 * 60 * 60;
const FRESH_MS = 2 * 60 * 60 * 1000;

/**
 * Кеш свіжий, якщо йому менше 2 годин і він отриманий сьогодні (за Києвом).
 * Прогноз, узятий до півночі, починається з учорашнього дня — після півночі його оновлюємо.
 */
export const isFresh = (fetchedAt: number, now = Date.now()) =>
	now - fetchedAt < FRESH_MS && kyivNow(new Date(fetchedAt)).date === kyivNow(new Date(now)).date;

const CITY_SELECT = {
	id: true,
	nameUa: true,
	nameEn: true,
	nameRu: true,
	region: true,
	countryUa: true,
	latitude: true,
	longitude: true,
	slug: true
} as const;

export interface CityRecord {
	id: number;
	nameUa: string;
	region: string;
	countryUa: string;
	latitude: number;
	longitude: number;
	slug: string;
	/** Канонічна адреса сторінки: /pohoda/{path} */
	path: string;
}

type Candidate = Omit<CityRecord, 'path'> & { nameEn?: string; nameRu?: string };

/*
	Назви й слаги в базі не унікальні: «Львів» є у трьох областях, «Рівне» — у чотирнадцяти.
	Щоб один і той самий запит завжди давав той самий, найочікуваніший результат:
	1. точний збіг слагу, потім української, англійської, російської назви;
	2. серед рівних — столиця, потім обласний центр;
	3. далі — найменший id, щоб порядок був стабільним.
	Той самий порядок визначає, кому дістається коротка адреса (див. cityUrl.ts).
*/
export function pickBestCity<T extends Omit<Candidate, 'countryUa' | 'latitude' | 'longitude'>>(
	cities: T[],
	query: string
): T | null {
	const q = query.trim().toLowerCase();

	const matchRank = (c: T) => {
		if (c.slug.toLowerCase() === q) return 0;
		if (c.nameUa.toLowerCase() === q) return 1;
		if (c.nameEn?.toLowerCase() === q) return 2;
		if (c.nameRu?.toLowerCase() === q) return 3;
		return 4;
	};

	return [...cities].sort((a, b) => matchRank(a) - matchRank(b) || importance(a, b))[0] ?? null;
}

/** Усі населені пункти з цим слагом (разом зі столицею, якщо слаг «kyiv») */
async function slugGroup(slug: string): Promise<Candidate[]> {
	const rows = await prisma.city.findMany({
		where: { slug },
		select: CITY_SELECT,
		orderBy: { id: 'asc' }
	});
	return slug === KYIV.slug ? [{ ...KYIV }, ...rows] : rows;
}

function withPath(city: Candidate, group: Candidate[]): CityRecord {
	return {
		id: city.id,
		nameUa: city.nameUa,
		region: city.region,
		countryUa: city.countryUa,
		latitude: city.latitude,
		longitude: city.longitude,
		slug: city.slug,
		path: assignPaths(group).get(city.id) ?? city.slug
	};
}

/**
 * Пошук населеного пункту за адресою сторінки, слагом або будь-якою з назв.
 * Повертає і канонічну адресу — сторінка переадресує на неї всі інші варіанти.
 */
export async function findCity(query: string): Promise<CityRecord | null> {
	const name = query.trim();
	if (!name) return null;

	// Столиця — без запиту до бази
	if (isKyivQuery(name)) return { ...KYIV, path: KYIV.slug };

	const candidates: Candidate[] = await prisma.city.findMany({
		where: {
			OR: [
				{ slug: { equals: name, mode: 'insensitive' } },
				{ nameUa: { equals: name, mode: 'insensitive' } },
				{ nameEn: { equals: name, mode: 'insensitive' } },
				{ nameRu: { equals: name, mode: 'insensitive' } }
			]
		},
		select: CITY_SELECT,
		orderBy: { id: 'asc' },
		take: 50
	});

	const best = pickBestCity(candidates, name);
	if (best) return withPath(best, await slugGroup(best.slug));

	// Адреса з областю: /pohoda/lviv-mykolaivska, /pohoda/ivanivka-sumska-2
	const regional = parseRegionalPath(name);
	if (!regional) return null;

	const group = await slugGroup(regional.slug);
	const paths = assignPaths(group);
	const match = group.find((city) => paths.get(city.id) === name.toLowerCase());
	return match ? withPath(match, group) : null;
}

// Open-Meteo зазвичай відповідає за 100–300 мс; довше 8 с — вважаємо недоступним
const OPEN_METEO_TIMEOUT_MS = 8000;

/** Відповідь Open-Meteo придатна для показу: є всі масиви, з якими працює сайт */
export function isValidForecast(data: unknown): data is OpenMeteoWeather {
	const d = data as OpenMeteoWeather | null;
	return Boolean(
		d &&
		Array.isArray(d.hourly?.time) &&
		d.hourly.time.length > 0 &&
		Array.isArray(d.hourly.temperature_2m) &&
		Array.isArray(d.hourly.weathercode) &&
		Array.isArray(d.daily?.time) &&
		d.daily.time.length > 0 &&
		Array.isArray(d.daily.temperature_2m_max) &&
		Array.isArray(d.daily.temperature_2m_min)
	);
}

export function buildOpenMeteoUrl(latitude: number, longitude: number) {
	return (
		`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
		`&hourly=` +
		`temperature_2m,` +
		`apparent_temperature,` +
		`weathercode,` +
		`windspeed_10m,` +
		`windgusts_10m,` +
		`winddirection_10m,` +
		`relativehumidity_2m,` +
		`dewpoint_2m,` +
		`visibility,` +
		`precipitation,` +
		`pressure_msl,` +
		`precipitation_probability` +
		`&daily=` +
		`temperature_2m_max,` +
		`temperature_2m_min,` +
		`precipitation_sum,` +
		`precipitation_probability_max,` +
		`weathercode,` +
		`sunrise,` +
		`sunset,` +
		`uv_index_max` +
		`&forecast_days=7` +
		// Без цього Open-Meteo віддає вітер у км/год, а сайт підписує м/с
		`&wind_speed_unit=ms` +
		`&timezone=Europe/Kyiv`
	);
}

interface CachedForecast {
	weather: OpenMeteoWeather;
	fetchedAt: number;
}

async function fetchForecast(city: CityRecord): Promise<OpenMeteoWeather> {
	const res = await fetch(buildOpenMeteoUrl(city.latitude, city.longitude), {
		cache: 'no-store',
		signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS)
	});
	if (!res.ok) throw new Error(`Open-Meteo повернув ${res.status}`);

	const weather: unknown = await res.json();
	if (!isValidForecast(weather)) throw new Error('Неповна відповідь Open-Meteo');
	return weather;
}

/**
 * Прогноз для вже знайденого населеного пункту.
 * Свіжий кеш (до 2 год) віддається одразу. Старіший — оновлюється, а якщо Open-Meteo
 * саме зараз недоступний, показуємо збережений прогноз замість помилки:
 * для людей і пошукових роботів це краще, ніж сторінка 502.
 */
export async function getForecast(city: CityRecord): Promise<WeatherApiResponse> {
	// Префікс версії: після зміни набору полів чи адрес старий кеш не підмішується
	const key = `v3:${city.path}`;

	// Якість повітря — паралельно з прогнозом, тож сторінка від неї не повільнішає
	const airPromise = getAirQuality(city);

	let cached: CachedForecast | null = null;
	const raw = await redisGet(key);
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as CachedForecast;
			if (isValidForecast(parsed?.weather)) cached = parsed;
		} catch {
			// Пошкоджений кеш — просто йдемо за свіжими даними
		}
		if (!cached) console.warn(`[Redis] Пошкоджений кеш для ключа "${key}", беремо свіжі дані`);
	}

	let weather: OpenMeteoWeather;
	if (cached && isFresh(cached.fetchedAt)) {
		weather = cached.weather;
	} else {
		try {
			weather = await fetchForecast(city);
			await redisSet(key, JSON.stringify({ weather, fetchedAt: Date.now() }), CACHE_TTL);
		} catch (err) {
			console.error(`[Open-Meteo] Не вдалося оновити погоду для "${city.path}":`, err);
			if (!cached) error(502, 'Не вийшло отримати дані погоди');
			weather = cached.weather;
		}
	}

	return {
		misto: city.nameUa,
		oblast: city.region,
		kraina: city.countryUa,
		latitude: city.latitude,
		longitude: city.longitude,
		path: city.path,
		weather,
		air: await airPromise
	};
}

/** Погода за назвою чи адресою — для /api/pogoda. Невідоме місто — 404. */
export async function getCityWeather(cityName: string): Promise<WeatherApiResponse> {
	const city = await findCity(cityName);
	if (!city) error(404, 'Місто не знайдено');
	return getForecast(city);
}
