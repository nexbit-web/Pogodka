import { error } from '@sveltejs/kit';
import { findCity, getForecast, type CityRecord } from './weather';
import { nearbyCities, type NearbyCity } from './cities';
import { redisGet, redisSet } from './upstash';
import type { WeatherApiResponse } from '$lib/types';

/*
	Населений пункт для сторінки — назва, координати, адреса й блок «Погода поруч» —
	береться з Redis, а база потрібна лише для адреси, якої там ще немає.

	Раніше кожен перегляд сторінки робив до чотирьох запитів до бази. Пошукові роботи
	щодня обходять тисячі сторінок, тож Neon жодного разу не встигав заснути, вичерпав
	безкоштовні години посеред місяця і вимкнувся — а без бази не відкривалась жодна сторінка.
	Тепер база прокидається лише для нових адрес, а вже відомі населені пункти
	відкриваються, навіть коли вона недоступна.

	Окремий запис, а не всередині прогнозу: прогноз живе добу, і після доби без відвідувань
	сторінка знову йшла б у базу. Назви й сусіди змінюються хіба що з новим імпортом бази —
	тоді досить змінити префікс ключа (v1 → v2).
*/
const PLACE_TTL = 30 * 24 * 60 * 60;
// Невідома адреса теж запамʼятовується, щоб боти з вигаданими адресами не будили базу.
// Лише на добу: населений пункт можуть додати
const MISSING_TTL = 24 * 60 * 60;
// Таких довгих назв немає — не засмічуємо кеш сміттєвими адресами
const MAX_QUERY_LENGTH = 100;

export interface Place {
	city: CityRecord;
	nearby: NearbyCity[];
}

// Регістр не важливий: /pohoda/Lviv і /pohoda/lviv — той самий населений пункт
const placeKey = (query: string) => `place:v1:${query.trim().toLowerCase()}`;

function isPlace(value: unknown): value is Place {
	const place = value as Place | null;
	return Boolean(
		place &&
		typeof place.city?.path === 'string' &&
		typeof place.city.nameUa === 'string' &&
		typeof place.city.region === 'string' &&
		Number.isFinite(place.city.latitude) &&
		Number.isFinite(place.city.longitude) &&
		Array.isArray(place.nearby)
	);
}

/** Запис кешу: Place, null — «такої адреси немає», undefined — запису немає або він пошкоджений */
function parseCached(raw: string | null): Place | null | undefined {
	if (raw === null) return undefined;
	try {
		const value: unknown = JSON.parse(raw);
		if (value === null) return null;
		if (isPlace(value)) return value;
	} catch {
		// Пошкоджений запис — просто йдемо в базу
	}
	return undefined;
}

/**
 * Населений пункт за адресою сторінки, слагом або назвою — спершу з Redis, потім з бази.
 * null — такого немає. Помилка — бази немає, а в кеші адреси ще немає.
 */
export async function findPlace(query: string): Promise<Place | null> {
	const q = query.trim();
	if (!q) return null;

	const cacheable = q.length <= MAX_QUERY_LENGTH;
	const key = placeKey(q);

	if (cacheable) {
		const cached = parseCached(await redisGet(key));
		if (cached !== undefined) return cached;
	}

	const city = await findCity(q);
	if (!city) {
		if (cacheable) await redisSet(key, 'null', MISSING_TTL);
		return null;
	}

	// «Погода поруч» не критична: без неї сторінка відкривається, але такий неповний запис
	// у кеш не йде — наступний перегляд спробує ще раз
	let nearby: NearbyCity[];
	try {
		nearby = await nearbyCities(city);
	} catch (err) {
		console.error(`[nearby] Не вдалося знайти сусідів для "${city.path}":`, err);
		return { city, nearby: [] };
	}

	const place: Place = { city, nearby };
	const value = JSON.stringify(place);
	const canonical = placeKey(city.path);
	// Під канонічною адресою і під тією, якою прийшли (Львів, Lviv): обидві далі без бази
	await Promise.all([
		redisSet(canonical, value, PLACE_TTL),
		cacheable && key !== canonical ? redisSet(key, value, PLACE_TTL) : undefined
	]);
	return place;
}

/** Погода за назвою чи адресою — для /api/pogoda. Невідоме місто — 404. */
export async function getCityWeather(cityName: string): Promise<WeatherApiResponse> {
	const place = await findPlace(cityName);
	if (!place) error(404, 'Місто не знайдено');
	return getForecast(place.city);
}
