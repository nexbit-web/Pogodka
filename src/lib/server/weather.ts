import { error } from '@sveltejs/kit';
import prisma from './prisma';
import { redisGet, redisSet } from './upstash';
import { pack, unpack } from './packed';
import { meteoPaused, pauseMeteo } from './meteoLimit';
import { getAirQuality } from './air';
import { importance } from './cityRank';
import { assignPaths, parseRegionalPath } from './cityUrl';
import { KYIV, isKyivQuery } from './regions';
import { kyivNow } from '$lib/date';
import type { OpenMeteoWeather, WeatherApiResponse } from '$lib/types';

/*
	Кеш оновлюється, щойно старший за 2 години: моделі прогнозу оновлюються кожні 1–6 годин.
	Живе 48 годин — запас на випадок збою чи вичерпаного денного ліміту Open-Meteo
	(ліміт скидається опівночі за UTC): поки свіжого немає, сторінка показує вчорашній прогноз
	на наступні години, а не помилку. Запис стиснутий (~4 КБ, packed.ts), тож навіть усі
	24 тисячі населених пунктів за дві доби вміщаються в безкоштовні 256 МБ Redis.
*/
const CACHE_TTL = 48 * 60 * 60;
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
	/** Російська назва для /ru; може бути порожньою — тоді українська */
	nameRu?: string;
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
		nameRu: city.nameRu,
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

// Поля, без яких сторінку не показати: кожне значення має бути числом
const HOURLY_REQUIRED = [
	'temperature_2m',
	'apparent_temperature',
	'weathercode',
	'windspeed_10m',
	'windgusts_10m',
	'winddirection_10m',
	'relativehumidity_2m',
	'precipitation',
	'pressure_msl'
] as const;
const DAILY_REQUIRED = [
	'temperature_2m_max',
	'temperature_2m_min',
	'precipitation_sum',
	'weathercode'
] as const;

type Series = Record<string, unknown>;

const isSeries = (value: unknown): value is Series & { time: string[] } =>
	typeof value === 'object' &&
	value !== null &&
	Array.isArray((value as Series).time) &&
	(value as { time: unknown[] }).time.every((t) => typeof t === 'string');

/** Скільки записів поспіль від початку мають усі поля числами */
function completeRun(series: Series & { time: string[] }, fields: readonly string[]): number {
	const columns = fields.map((f) => series[f]);
	if (!columns.every((c) => Array.isArray(c) && c.length === series.time.length)) return 0;
	const broken = series.time.findIndex(
		(_, i) => !columns.every((c) => Number.isFinite((c as unknown[])[i]))
	);
	return broken === -1 ? series.time.length : broken;
}

const sliceSeries = <T extends Series>(series: T, n: number): T =>
	Object.fromEntries(
		Object.entries(series).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, n) : v])
	) as T;

/**
 * Прогноз, придатний для показу, або null.
 * Усередині сайту дані читаються без запасних нулів: 0 °C чи 0 м/с — правдоподібні значення,
 * і підмінений ними пропуск виглядав би як справжній прогноз. Тому перевіряємо тут, один раз:
 * обовʼязкові масиви однакової довжини й без порожніх значень. Якщо дані обриваються
 * (Open-Meteo віддав null наприкінці), прогноз обрізається до останнього повного дня —
 * краще 9 чесних днів, ніж 10 із вигаданим. Не лишилось жодного дня — null.
 */
export function completeForecast(data: unknown): OpenMeteoWeather | null {
	const d = data as { hourly?: unknown; daily?: unknown } | null;
	if (!d || !isSeries(d.hourly) || !isSeries(d.daily)) return null;
	const { hourly, daily } = d;

	const hours = completeRun(hourly, HOURLY_REQUIRED);
	let days = completeRun(daily, DAILY_REQUIRED);
	// День лишається, лише якщо його години є і всі цілі
	const hoursThrough = (date: string) => {
		const next = hourly.time.findIndex((t) => t.slice(0, 10) > date);
		return next === -1 ? hourly.time.length : next;
	};
	const lastHourDate = hours > 0 ? hourly.time[hours - 1].slice(0, 10) : '';
	const complete = (date: string) => date <= lastHourDate && hoursThrough(date) <= hours;
	while (days > 0 && !complete(daily.time[days - 1])) days--;
	if (days === 0) return null;

	const keepHours = hoursThrough(daily.time[days - 1]);
	if (days === daily.time.length && keepHours === hourly.time.length) {
		return data as OpenMeteoWeather;
	}
	return {
		hourly: sliceSeries(hourly, keepHours),
		daily: sliceSeries(daily, days)
	} as unknown as OpenMeteoWeather;
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
		`precipitation,` +
		`pressure_msl,` +
		`precipitation_probability` +
		// Суму опадів, найбільшу ймовірність і код дня рахуємо самі (див. withDailyFromHourly)
		`&daily=` +
		`temperature_2m_max,` +
		`temperature_2m_min,` +
		`sunrise,` +
		`sunset,` +
		`uv_index_max` +
		// 10 днів — для сторінки «на 10 днів»; решта сторінок бере перші 7
		`&forecast_days=10` +
		// Без цього Open-Meteo віддає вітер у км/год, а сайт підписує м/с
		`&wind_speed_unit=ms` +
		`&timezone=Europe/Kyiv`
	);
}

interface CachedForecast {
	/**
	 * Для якого населеного пункту прогноз — назва лежить у Redis разом із погодою.
	 * Сторінка бере назву з запису населеного пункту (place.ts, теж Redis, живе 30 днів),
	 * а тут вона — щоб запис погоди був зрозумілий сам по собі.
	 */
	city: { nameUa: string; nameRu?: string; region: string; path: string };
	weather: OpenMeteoWeather;
	fetchedAt: number;
}

/*
	Open-Meteo рахує ліміт за змінними: понад 10 змінних — дробові виклики (15 змінних = 1,5).
	Три добові величини він сам виводить із погодинних даних — суму опадів, найбільшу
	ймовірність і найсильніший код погоди. Звірено на живих даних (Київ, Львів, Яремче, Одеса,
	Харків): ймовірність і код збігаються завжди, сума — до сотих мм. Open-Meteo додає неокруглені
	години, а ми — ті самі округлені, що показує таблиця, тож добова сума дорівнює сумі годин
	на сторінці (так само сайт і раніше рахував «сьогодні» — dayInsights). Тож рахуємо їх тут,
	і кожне оновлення прогнозу коштує 1,5 виклику замість 1,8 — на шосту частину більше міст
	у тому ж денному ліміті.
	Максимум і мінімум температури так не виходять: модель знає їх точніше, ніж погодинні
	точки (розбіжність до 1,5 °C), тож їх і далі беремо з Open-Meteo.
*/
type RawSeries = Record<string, unknown> & { time?: unknown };

export function withDailyFromHourly(data: unknown): unknown {
	const d = data as { hourly?: RawSeries; daily?: RawSeries } | null;
	const hourly = d?.hourly;
	const daily = d?.daily;
	if (!hourly || !daily || !Array.isArray(hourly.time) || !Array.isArray(daily.time)) return data;

	const column = (name: string) => (Array.isArray(hourly[name]) ? (hourly[name] as unknown[]) : []);
	const precipitation = column('precipitation');
	const probability = column('precipitation_probability');
	const codes = column('weathercode');
	const numbers = (values: unknown[]) => values.filter((v): v is number => Number.isFinite(v));

	const byDate = new Map<string, number[]>();
	(hourly.time as unknown[]).forEach((t, i) => {
		if (typeof t !== 'string') return;
		const list = byDate.get(t.slice(0, 10)) ?? [];
		list.push(i);
		byDate.set(t.slice(0, 10), list);
	});

	const sums: (number | null)[] = [];
	const probMax: (number | null)[] = [];
	const dayCodes: (number | null)[] = [];
	for (const date of daily.time as unknown[]) {
		const hours = typeof date === 'string' ? (byDate.get(date) ?? []) : [];
		// Сума й код — лише з повного дня: порожня година дала б неправду, а не менше число
		const precip = numbers(hours.map((i) => precipitation[i]));
		const code = numbers(hours.map((i) => codes[i]));
		const prob = numbers(hours.map((i) => probability[i]));
		const complete = (values: number[]) => hours.length > 0 && values.length === hours.length;

		// До сотих, як в Open-Meteo, — без хвоста дробів: 0,05 + 0,1 дає 0,15000000000000002
		sums.push(complete(precip) ? Math.round(precip.reduce((s, v) => s + v, 0) * 100) / 100 : null);
		dayCodes.push(complete(code) ? Math.max(...code) : null);
		probMax.push(prob.length > 0 ? Math.max(...prob) : null);
	}

	return {
		...d,
		daily: {
			...daily,
			precipitation_sum: sums,
			weathercode: dayCodes,
			...(probability.length > 0 && { precipitation_probability_max: probMax })
		}
	};
}

async function fetchForecast(city: CityRecord): Promise<OpenMeteoWeather> {
	const res = await fetch(buildOpenMeteoUrl(city.latitude, city.longitude), {
		cache: 'no-store',
		signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS)
	});
	if (res.status === 429) await pauseMeteo(res);
	if (!res.ok) throw new Error(`Open-Meteo повернув ${res.status}`);

	const weather = completeForecast(withDailyFromHourly(await res.json()));
	if (!weather) throw new Error('Неповна відповідь Open-Meteo');
	return weather;
}

/**
 * Прогноз для вже знайденого населеного пункту.
 * Свіжий кеш (до 2 год) віддається одразу. Старіший — оновлюється, а якщо Open-Meteo
 * саме зараз недоступний, показуємо збережений прогноз замість помилки:
 * для людей і пошукових роботів це краще, ніж сторінка з помилкою.
 */
export async function getForecast(city: CityRecord): Promise<WeatherApiResponse> {
	// Префікс версії: після зміни набору полів чи адрес старий кеш не підмішується
	const key = `v5:${city.path}`;

	// Якість повітря — паралельно з прогнозом, тож сторінка від неї не повільнішає
	const airPromise = getAirQuality(city);

	let cached: CachedForecast | null = null;
	const raw = await redisGet(key);
	if (raw) {
		// Запис стиснутий (packed.ts); пошкоджений — просто йдемо за свіжими даними
		const parsed = unpack(raw) as CachedForecast | undefined;
		const weather = completeForecast(parsed?.weather);
		if (parsed && weather) cached = { ...parsed, weather };
		if (!cached) console.warn(`[Redis] Пошкоджений кеш для ключа "${key}", беремо свіжі дані`);
	}

	let weather: OpenMeteoWeather;
	if (cached && isFresh(cached.fetchedAt)) {
		weather = cached.weather;
	} else if (await meteoPaused()) {
		// Ліміт Open-Meteo вичерпано (meteoLimit.ts): збережений прогноз або 503 без марного запиту
		if (!cached) error(503, 'Не вийшло отримати дані погоди');
		weather = cached.weather;
	} else {
		try {
			weather = await fetchForecast(city);
			const entry: CachedForecast = {
				city: { nameUa: city.nameUa, nameRu: city.nameRu, region: city.region, path: city.path },
				weather,
				fetchedAt: Date.now()
			};
			await redisSet(key, pack(entry), CACHE_TTL);
		} catch (err) {
			console.error(`[Open-Meteo] Не вдалося оновити погоду для "${city.path}":`, err);
			// 503 — «тимчасово»: пошуковики не викидають сторінку з індексу й повертаються пізніше
			if (!cached) error(503, 'Не вийшло отримати дані погоди');
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
