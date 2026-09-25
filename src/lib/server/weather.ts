import { error } from '@sveltejs/kit';
import prisma from './prisma';
import { redisGet, redisSet } from './upstash';
import type { WeatherApiResponse } from '$lib/types';

// TTL кешу погоди — 50 годин
const TTL = 50 * 60 * 60;

/** Пошук міста за будь-якою з назв або слагом. */
export async function findCity(cityName: string) {
	return prisma.city.findFirst({
		where: {
			OR: [
				{ nameUa: { equals: cityName, mode: 'insensitive' } },
				{ nameRu: { equals: cityName, mode: 'insensitive' } },
				{ nameEn: { equals: cityName, mode: 'insensitive' } },
				{ slug: { equals: cityName, mode: 'insensitive' } }
			]
		},
		select: {
			nameUa: true,
			region: true,
			countryUa: true,
			latitude: true,
			longitude: true,
			slug: true
		}
	});
}

function buildOpenMeteoUrl(latitude: number, longitude: number) {
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
		`pressure_msl` +
		`&daily=` +
		`temperature_2m_max,` +
		`temperature_2m_min,` +
		`precipitation_sum,` +
		`weathercode` +
		`&forecast_days=7` +
		`&timezone=Europe/Kyiv`
	);
}

/**
 * Погода для міста: спершу Redis, потім БД + Open-Meteo.
 * Викликається напряму з load-функцій та з /api/pogoda — без HTTP-запиту до себе.
 */
export async function getCityWeather(cityName: string): Promise<WeatherApiResponse> {
	const key = cityName.toLowerCase().trim();

	const cached = await redisGet(key);
	if (cached) {
		try {
			return JSON.parse(cached) as WeatherApiResponse;
		} catch {
			// Пошкоджений кеш — просто йдемо далі за свіжими даними
			console.warn(`[Redis] Не вдалося розібрати кеш для ключа "${key}"`);
		}
	}

	const city = await findCity(cityName);
	if (!city) {
		error(404, 'Місто не знайдено');
	}

	const res = await fetch(buildOpenMeteoUrl(city.latitude, city.longitude), {
		cache: 'no-store'
	});
	if (!res.ok) {
		error(502, 'Не вийшло отримати дані погоди');
	}

	const data: WeatherApiResponse = {
		misto: city.nameUa,
		oblast: city.region,
		kraina: city.countryUa,
		latitude: city.latitude,
		longitude: city.longitude,
		weather: await res.json()
	};

	await redisSet(key, JSON.stringify(data), TTL);

	return data;
}
