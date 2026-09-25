import { error } from '@sveltejs/kit';
import prisma from './prisma';
import { redisGet, redisSet } from './upstash';
import { isRegionCentre } from './cityRank';
import type { OpenMeteoWeather, WeatherApiResponse } from '$lib/types';

// TTL кешу погоди — 50 годин
const TTL = 50 * 60 * 60;

const CITY_SELECT = {
	id: true,
	nameUa: true,
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
}

/*
	Назви й слаги в базі не унікальні: «Львів» є у трьох областях, «Іванівка» — у двадцяти двох.
	Щоб один і той самий запит завжди давав той самий, найочікуваніший результат:
	1. точний збіг слагу, потім української, англійської, російської назви;
	2. серед рівних — місто, чия назва збігається з назвою області (Львів → Львівська,
	   Одеса → Одеська): це обласні центри, які й шукають найчастіше;
	3. далі — найменший id, щоб порядок був стабільним.
*/
export function pickBestCity<
	T extends Omit<CityRecord, 'countryUa' | 'latitude' | 'longitude'> & {
		nameEn?: string;
		nameRu?: string;
	}
>(cities: T[], query: string): T | null {
	const q = query.trim().toLowerCase();

	const matchRank = (c: T) => {
		if (c.slug.toLowerCase() === q) return 0;
		if (c.nameUa.toLowerCase() === q) return 1;
		if (c.nameEn?.toLowerCase() === q) return 2;
		if (c.nameRu?.toLowerCase() === q) return 3;
		return 4;
	};

	return (
		[...cities].sort(
			(a, b) =>
				matchRank(a) - matchRank(b) ||
				Number(isRegionCentre(b)) - Number(isRegionCentre(a)) ||
				a.id - b.id
		)[0] ?? null
	);
}

/** Пошук міста за будь-якою з назв або слагом. */
export async function findCity(cityName: string): Promise<CityRecord | null> {
	const name = cityName.trim();
	if (!name) return null;

	const candidates = await prisma.city.findMany({
		where: {
			OR: [
				{ slug: { equals: name, mode: 'insensitive' } },
				{ nameUa: { equals: name, mode: 'insensitive' } },
				{ nameEn: { equals: name, mode: 'insensitive' } },
				{ nameRu: { equals: name, mode: 'insensitive' } }
			]
		},
		select: { ...CITY_SELECT, nameEn: true, nameRu: true },
		orderBy: { id: 'asc' },
		take: 50
	});

	const best = pickBestCity(candidates, name);
	if (!best) return null;

	return {
		id: best.id,
		nameUa: best.nameUa,
		region: best.region,
		countryUa: best.countryUa,
		latitude: best.latitude,
		longitude: best.longitude,
		slug: best.slug
	};
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

/**
 * Погода для міста: спершу Redis, потім БД + Open-Meteo.
 * Викликається напряму з load-функцій та з /api/pogoda — без HTTP-запиту до себе.
 */
export async function getCityWeather(cityName: string): Promise<WeatherApiResponse> {
	// Префікс версії: після зміни набору полів старий кеш не підмішується
	const key = `v2:${cityName.toLowerCase().trim()}`;

	const cached = await redisGet(key);
	if (cached) {
		try {
			const parsed = JSON.parse(cached) as WeatherApiResponse;
			if (isValidForecast(parsed?.weather)) return parsed;
		} catch {
			// Пошкоджений кеш — просто йдемо далі за свіжими даними
		}
		console.warn(`[Redis] Пошкоджений кеш для ключа "${key}", беремо свіжі дані`);
	}

	const city = await findCity(cityName);
	if (!city) {
		error(404, 'Місто не знайдено');
	}

	let weather: unknown;
	try {
		const res = await fetch(buildOpenMeteoUrl(city.latitude, city.longitude), {
			cache: 'no-store',
			signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`Open-Meteo повернув ${res.status}`);
		weather = await res.json();
	} catch (err) {
		console.error(`[Open-Meteo] Не вдалося отримати погоду для "${city.slug}":`, err);
		error(502, 'Не вийшло отримати дані погоди');
	}

	// Некоректну відповідь не показуємо і, головне, не кладемо в кеш на 50 годин
	if (!isValidForecast(weather)) {
		console.error(`[Open-Meteo] Неповна відповідь для "${city.slug}"`);
		error(502, 'Не вийшло отримати дані погоди');
	}

	const data: WeatherApiResponse = {
		misto: city.nameUa,
		oblast: city.region,
		kraina: city.countryUa,
		latitude: city.latitude,
		longitude: city.longitude,
		weather
	};

	await redisSet(key, JSON.stringify(data), TTL);

	return data;
}
