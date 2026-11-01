import { redisGet, redisSet } from './upstash';
import { pack, unpack } from './packed';
import { meteoPaused, pauseMeteo } from './meteoLimit';
import type { AirQualityData } from '$lib/types';

/*
	Якість повітря й пилок (Open-Meteo Air Quality, дані CAMS) — на 5 днів погодинно.
	Шість показників за 5 днів — один виклик API. Це доповнення до прогнозу:
	якщо сервіс недоступний, сторінка працює без нього, а блок просто не показується.
*/

// Прогноз CAMS оновлюється раз-двічі на добу, тож частіше ніж раз на 6 годин питати марно
const FRESH_MS = 6 * 60 * 60 * 1000;
// Дві доби — як і прогноз: запас на добу вичерпаного ліміту (стиснутий запис ~0,5 КБ)
const CACHE_TTL = 48 * 60 * 60;
const TIMEOUT_MS = 4000;

/*
	Дані CAMS — сітка 0,1° (~11 км): усі села в одній клітинці мають ті самі значення.
	Тож і кеш, і запит — на клітинку, а не на населений пункт: тисячі сіл діляться кількома
	сотнями записів, і ліміт Open-Meteo витрачається в рази повільніше без втрати точності.
*/
const GRID = 0.1;

/** Найближчий вузол сітки: «50.5» — і для ключа кешу, і для запиту */
export const gridPoint = (value: number) => (Math.round(value / GRID) * GRID).toFixed(1);

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
	if (res.status === 429) await pauseMeteo(res);
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
	const lat = gridPoint(city.latitude);
	const lon = gridPoint(city.longitude);
	const key = `air:v2:${lat},${lon}`;

	// Запис стиснутий (packed.ts); пошкоджений — ідемо за свіжими даними
	const raw = await redisGet(key);
	const parsed = raw ? (unpack(raw) as CachedAir | undefined) : undefined;
	const cached = parsed && isValidAir(parsed.air) ? parsed : null;

	if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached.air;
	// Ліміт Open-Meteo вичерпано (meteoLimit.ts): збережене або без блоку, але без марного запиту
	if (await meteoPaused()) return cached?.air ?? null;

	try {
		const air = await fetchAir(Number(lat), Number(lon));
		await redisSet(key, pack({ air, fetchedAt: Date.now() }), CACHE_TTL);
		return air;
	} catch (err) {
		console.warn(`[Air Quality] Не вдалося оновити для "${city.path}":`, err);
		return cached?.air ?? null;
	}
}
