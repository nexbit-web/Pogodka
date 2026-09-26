import { redisGet, redisSet } from './upstash';
import type { AirQualityData } from '$lib/types';

/*
	Якість повітря й пилок (Open-Meteo Air Quality, дані CAMS) — на 5 днів погодинно.
	Шість показників за 5 днів — один виклик API. Це доповнення до прогнозу:
	якщо сервіс недоступний, сторінка працює без нього, а блок просто не показується.
*/

const FRESH_MS = 2 * 60 * 60 * 1000;
const CACHE_TTL = 12 * 60 * 60;
const TIMEOUT_MS = 4000;

const VARIABLES = [
	'european_aqi',
	'alder_pollen',
	'birch_pollen',
	'grass_pollen',
	'mugwort_pollen',
	'ragweed_pollen'
] as const;

interface CachedAir {
	air: AirQualityData;
	fetchedAt: number;
}

const isValidAir = (value: unknown): value is AirQualityData => {
	const a = value as AirQualityData;
	return (
		Array.isArray(a?.time) &&
		a.time.length > 0 &&
		VARIABLES.every((v) => Array.isArray(a[v]) && a[v].length === a.time.length)
	);
};

async function fetchAir(latitude: number, longitude: number): Promise<AirQualityData> {
	const url =
		`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
		`&hourly=${VARIABLES.join(',')}&forecast_days=5&timezone=Europe/Kyiv`;
	const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) throw new Error(`Open-Meteo Air Quality повернув ${res.status}`);

	const body = (await res.json()) as { hourly?: unknown };
	if (!isValidAir(body.hourly)) throw new Error('Неповна відповідь Open-Meteo Air Quality');
	return body.hourly;
}

/** Якість повітря для населеного пункту; null — даних немає і блок не показуємо */
export async function getAirQuality(city: {
	path: string;
	latitude: number;
	longitude: number;
}): Promise<AirQualityData | null> {
	const key = `air:v1:${city.path}`;

	let cached: CachedAir | null = null;
	try {
		const raw = await redisGet(key);
		const parsed = raw ? (JSON.parse(raw) as CachedAir) : null;
		if (parsed && isValidAir(parsed.air)) cached = parsed;
	} catch {
		// Пошкоджений кеш — ідемо за свіжими даними
	}

	if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached.air;

	try {
		const air = await fetchAir(city.latitude, city.longitude);
		await redisSet(key, JSON.stringify({ air, fetchedAt: Date.now() }), CACHE_TTL);
		return air;
	} catch (err) {
		console.warn(`[Air Quality] Не вдалося оновити для "${city.path}":`, err);
		return cached?.air ?? null;
	}
}
