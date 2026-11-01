import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { makeForecast } from '../fixtures/forecast';
import { unpack } from '$lib/server/packed';

const { prisma, redis } = vi.hoisted(() => ({
	prisma: { city: { findMany: vi.fn() } },
	redis: { get: vi.fn(), set: vi.fn() }
}));

vi.mock('$lib/server/prisma', () => ({ default: prisma }));
vi.mock('$lib/server/upstash', () => ({ redisGet: redis.get, redisSet: redis.set }));
// Якість повітря — окремий модуль зі своїм запитом; тут перевіряємо лише прогноз
vi.mock('$lib/server/air', () => ({ getAirQuality: vi.fn().mockResolvedValue(null) }));

const {
	buildOpenMeteoUrl,
	findCity,
	isFresh,
	getForecast,
	completeForecast,
	withDailyFromHourly,
	pickBestCity
} = await import('$lib/server/weather');

const city = (id: number, slug: string, nameUa: string, region: string, extra = {}) => ({
	id,
	slug,
	nameUa,
	nameEn: slug,
	nameRu: nameUa,
	region,
	countryUa: 'Україна',
	latitude: 49.8,
	longitude: 24,
	...extra
});

// Реальні дублікати з бази
const LVIV_DUPLICATES = [
	city(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
	city(11272, 'lviv', 'Львів', 'Львівська область'),
	city(12473, 'lviv', 'Львів', 'Миколаївська область')
];

/** База: перший запит — пошук кандидатів, наступні — група однойменних за слагом */
function database(rows: ReturnType<typeof city>[]) {
	prisma.city.findMany.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
		if (typeof where.slug === 'string')
			return Promise.resolve(rows.filter((r) => r.slug === where.slug));
		const q = String(
			((where.OR as Record<string, { equals: string }>[])[0].slug as { equals: string }).equals
		).toLowerCase();
		return Promise.resolve(
			rows.filter((r) => [r.slug, r.nameUa, r.nameEn, r.nameRu].some((n) => n.toLowerCase() === q))
		);
	});
}

const fetchMock = vi.fn();

beforeEach(() => {
	prisma.city.findMany.mockReset();
	redis.get.mockReset().mockResolvedValue(null);
	redis.set.mockReset().mockResolvedValue(undefined);
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function expectHttpError(promise: Promise<unknown>, status: number) {
	const err = await promise.then(
		() => null,
		(e: unknown) => e
	);
	expect(isHttpError(err), `очікували HTTP ${status}`).toBe(true);
	expect((err as { status: number }).status).toBe(status);
}

describe('pickBestCity', () => {
	it('з трьох Львовів обирає обласний центр', () => {
		expect(pickBestCity(LVIV_DUPLICATES, 'lviv')?.id).toBe(11272);
		expect(pickBestCity([...LVIV_DUPLICATES].reverse(), 'lviv')?.id).toBe(11272);
	});

	it.each([
		['Луцьк', 'Волинська область'],
		['Ужгород', 'Закарпатська область'],
		['Кропивницький', 'Кіровоградська область'],
		['Рівне', 'Рівненська область'],
		['Дніпро', 'Дніпропетровська область']
	])('%s — центр області «%s», навіть якщо назви не співзвучні', (name, region) => {
		const cities = [city(1, 'x', name, 'Сумська область'), city(2, 'x', name, region)];
		expect(pickBestCity(cities, name)?.region).toBe(region);
	});

	it('точний збіг слагу важливіший за збіг назви', () => {
		const cities = [
			city(1, 'kyivske', 'lviv', 'Львівська область'),
			city(2, 'lviv', 'Львів', 'Миколаївська область')
		];
		expect(pickBestCity(cities, 'lviv')?.id).toBe(2);
	});

	it('серед рівних кандидатів порядок стабільний — за id', () => {
		const cities = [
			city(9, 'ivanivka', 'Іванівка', 'Сумська область'),
			city(3, 'ivanivka', 'Іванівка', 'Одеська область')
		];
		expect(pickBestCity(cities, 'ivanivka')?.id).toBe(3);
	});

	it('на порожньому списку повертає null', () => {
		expect(pickBestCity([], 'lviv')).toBeNull();
	});
});

describe('findCity', () => {
	it('обласний центр отримує коротку адресу', async () => {
		database(LVIV_DUPLICATES);
		expect(await findCity('lviv')).toEqual({
			id: 11272,
			slug: 'lviv',
			nameUa: 'Львів',
			nameRu: 'Львів',
			region: 'Львівська область',
			countryUa: 'Україна',
			latitude: 49.8,
			longitude: 24,
			path: 'lviv'
		});
	});

	it('знаходить за назвою будь-якою мовою і віддає канонічну адресу', async () => {
		database(LVIV_DUPLICATES);
		expect((await findCity('  Львів '))?.path).toBe('lviv');
		expect((await findCity('LVIV'))?.path).toBe('lviv');
	});

	it('однойменне село — за адресою з областю', async () => {
		database(LVIV_DUPLICATES);
		const found = await findCity('lviv-mykolaivska');
		expect(found).toMatchObject({
			id: 12473,
			region: 'Миколаївська область',
			path: 'lviv-mykolaivska'
		});
	});

	it('кілька однойменних в одній області — з номером', async () => {
		database([
			city(5, 'ivanivka', 'Іванівка', 'Одеська область'),
			city(7, 'ivanivka', 'Іванівка', 'Сумська область'),
			city(9, 'ivanivka', 'Іванівка', 'Сумська область')
		]);
		expect((await findCity('ivanivka-sumska'))?.id).toBe(7);
		expect((await findCity('ivanivka-sumska-2'))?.id).toBe(9);
		expect(await findCity('ivanivka-sumska-3')).toBeNull();
	});

	it('Київ — столиця, без запиту до бази, а не село в Миколаївській області', async () => {
		for (const name of ['kyiv', 'Київ', 'Kyiv', 'Киев']) {
			const found = await findCity(name);
			expect(found).toMatchObject({ nameUa: 'Київ', path: 'kyiv', latitude: 50.4501 });
		}
		expect(prisma.city.findMany).not.toHaveBeenCalled();
	});

	it('село Київ у Миколаївській області доступне за адресою з областю', async () => {
		database([city(12405, 'kyiv', 'Київ', 'Миколаївська область')]);
		expect(await findCity('kyiv-mykolaivska')).toMatchObject({
			id: 12405,
			path: 'kyiv-mykolaivska'
		});
	});

	it('на порожній запит не ходить у базу', async () => {
		expect(await findCity('   ')).toBeNull();
		expect(prisma.city.findMany).not.toHaveBeenCalled();
	});

	it('невідоме місто — null', async () => {
		database([]);
		expect(await findCity('Атлантида')).toBeNull();
		expect(await findCity('atlantyda-lvivska')).toBeNull();
	});
});

describe('buildOpenMeteoUrl', () => {
	const url = new URL(buildOpenMeteoUrl(49.84, 24.03));

	it('запитує 7 днів у київському часі й вітер у м/с', () => {
		expect(url.origin).toBe('https://api.open-meteo.com');
		expect(url.searchParams.get('latitude')).toBe('49.84');
		// 10 днів — для сторінки «на 10 днів»; решта бере перші 7
		expect(url.searchParams.get('forecast_days')).toBe('10');
		expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
		expect(url.searchParams.get('timezone')).toBe('Europe/Kyiv');
	});

	it('запитує всі поля, які показує сайт', () => {
		const hourly = url.searchParams.get('hourly')!.split(',');
		const daily = url.searchParams.get('daily')!.split(',');

		expect(hourly).toEqual(
			expect.arrayContaining([
				'temperature_2m',
				'apparent_temperature',
				'weathercode',
				'windspeed_10m',
				'windgusts_10m',
				'winddirection_10m',
				'relativehumidity_2m',
				'precipitation',
				'pressure_msl',
				'precipitation_probability'
			])
		);
		expect(daily).toEqual(
			expect.arrayContaining([
				'temperature_2m_max',
				'temperature_2m_min',
				'sunrise',
				'sunset',
				'uv_index_max'
			])
		);
	});

	it('не дорожчий за 1,5 виклику ліміту: 15 змінних, добові підсумки рахуємо самі', () => {
		const hourly = url.searchParams.get('hourly')!.split(',');
		const daily = url.searchParams.get('daily')!.split(',');

		expect(hourly.length + daily.length).toBe(15);
		expect(daily).not.toContain('precipitation_sum');
		expect(daily).not.toContain('precipitation_probability_max');
		expect(daily).not.toContain('weathercode');
	});
});

describe('withDailyFromHourly — добові підсумки з погодинних даних', () => {
	// Відповідь Open-Meteo без трьох добових полів, як її тепер повертає запит
	const response = (overrides: Parameters<typeof makeForecast>[0] = {}) => {
		const forecast = makeForecast({ days: 2, ...overrides });
		const daily: Record<string, unknown> = { ...forecast.daily };
		delete daily.precipitation_sum;
		delete daily.precipitation_probability_max;
		delete daily.weathercode;
		return { hourly: forecast.hourly, daily };
	};
	const derive = (data: unknown) => withDailyFromHourly(data) as ReturnType<typeof makeForecast>;

	it('сума опадів, найбільша ймовірність і найсильніший код — як в Open-Meteo', () => {
		const data = response({
			hour: (day, hr) =>
				day === 0 && hr >= 14 && hr <= 16
					? { code: hr === 15 ? 63 : 61, precip: hr === 15 ? 2.1 : 0.05, precipProb: 70 + hr }
					: { code: 2, precip: 0, precipProb: 10 }
		});
		const { daily } = derive(data);

		// 0,05 + 2,1 + 0,05 — без хвоста 2,2000000000000006
		expect(daily.precipitation_sum).toEqual([2.2, 0]);
		expect(daily.precipitation_probability_max).toEqual([86, 10]);
		expect(daily.weathercode).toEqual([63, 2]);
	});

	it('день із порожньою годиною — null: completeForecast обріже його, а не покаже неправду', () => {
		const data = response() as unknown as { hourly: Record<string, unknown[]> };
		data.hourly.precipitation[30] = null;
		const { daily } = derive(data);

		expect(daily.precipitation_sum).toEqual([0, null]);
		expect(completeForecast(derive(data))!.daily.time).toHaveLength(1);
	});

	it('без погодинної ймовірності добової теж немає', () => {
		const data = response({ legacy: true });
		expect(derive(data).daily.precipitation_probability_max).toBeUndefined();
	});

	it('зламана відповідь проходить як є — її відхилить completeForecast', () => {
		expect(withDailyFromHourly(null)).toBeNull();
		expect(withDailyFromHourly({ error: true })).toEqual({ error: true });
	});
});

describe('completeForecast', () => {
	it('повний прогноз і старий кеш повертає без змін', () => {
		const full = makeForecast();
		expect(completeForecast(full)).toBe(full);
		const legacy = makeForecast({ legacy: true });
		expect(completeForecast(legacy)).toBe(legacy);
	});

	it('порожнє значення наприкінці — прогноз обрізається до останнього повного дня', () => {
		const data = makeForecast({ days: 10 }) as unknown as {
			hourly: Record<string, unknown[]>;
			daily: Record<string, unknown[]>;
		};
		// Температура обірвалась о 05:00 дев'ятого дня
		data.hourly.temperature_2m[8 * 24 + 5] = null;
		const result = completeForecast(data)!;

		expect(result.daily.time).toHaveLength(8);
		expect(result.hourly.time).toHaveLength(8 * 24);
		// Обрізані всі масиви, разом із необовʼязковими
		expect(result.hourly.precipitation_probability).toHaveLength(8 * 24);
		expect(result.daily.sunrise).toHaveLength(8);
		expect(result.hourly.temperature_2m.every(Number.isFinite)).toBe(true);
	});

	it('день без погодинних даних відкидається', () => {
		const data = makeForecast({ days: 3 });
		data.daily.time.push('2099-01-01');
		data.daily.temperature_2m_max.push(10);
		data.daily.temperature_2m_min.push(5);
		data.daily.precipitation_sum.push(0);
		data.daily.weathercode.push(0);

		expect(completeForecast(data)!.daily.time).toHaveLength(3);
	});

	it('порожня ймовірність опадів прогноз не обрізає — поле необовʼязкове', () => {
		const data = makeForecast({ days: 2 }) as unknown as {
			hourly: Record<string, unknown[]>;
		};
		data.hourly.precipitation_probability[30] = null;
		expect(completeForecast(data)!.hourly.time).toHaveLength(48);
	});

	it('масиви різної довжини або дані зламані з першої години — null', () => {
		const short = makeForecast({ days: 2 });
		short.hourly.pressure_msl.pop();
		expect(completeForecast(short)).toBeNull();

		const broken = makeForecast({ days: 2 }) as unknown as { hourly: Record<string, unknown[]> };
		broken.hourly.weathercode[0] = null;
		expect(completeForecast(broken)).toBeNull();
	});

	it.each([
		['null', null],
		['помилку Open-Meteo', { error: true, reason: 'Invalid coordinates' }],
		['без hourly', { daily: makeForecast().daily }],
		['порожній прогноз', makeForecast({ days: 0 })]
	])('відхиляє %s', (_, data) => {
		expect(completeForecast(data)).toBeNull();
	});
});

describe('getForecast', () => {
	const LVIV = {
		id: 11272,
		slug: 'lviv',
		nameUa: 'Львів',
		region: 'Львівська область',
		countryUa: 'Україна',
		latitude: 49.8,
		longitude: 24,
		path: 'lviv'
	};
	const cacheOf = (ageMs: number, weather = makeForecast()) =>
		JSON.stringify({ weather, fetchedAt: Date.now() - ageMs });
	// Redis за ключами: прогноз Львова й, за потреби, пауза після 429
	const useRedis = (forecast: string | null, paused = false) =>
		redis.get.mockImplementation(async (key: string) =>
			key === 'v5:lviv' ? forecast : key === 'openmeteo:paused' && paused ? 'Daily limit' : null
		);
	const weatherWrites = () => redis.set.mock.calls.filter(([key]) => key === 'v5:lviv');

	it('свіжий кеш (до 2 годин) — без запиту до Open-Meteo', async () => {
		useRedis(cacheOf(30 * 60 * 1000));

		const data = await getForecast(LVIV);

		expect(data).toMatchObject({ misto: 'Львів', oblast: 'Львівська область', path: 'lviv' });
		expect(redis.get).toHaveBeenCalledWith('v5:lviv');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('без кешу — бере Open-Meteo і кешує з часом отримання', async () => {
		const forecast = makeForecast();
		fetchMock.mockResolvedValue(new Response(JSON.stringify(forecast)));

		const data = await getForecast(LVIV);

		expect(data.weather).toEqual(forecast);
		const [key, value, ttl] = redis.set.mock.calls[0];
		expect(key).toBe('v5:lviv');
		// Запис стиснутий — розпаковуємо, як це робить сайт
		const entry = unpack(value) as { fetchedAt: number; city: unknown };
		expect(entry.fetchedAt).toBeGreaterThan(Date.now() - 5000);
		// Назва населеного пункту — у Redis разом із погодою
		expect(entry.city).toEqual({
			nameUa: 'Львів',
			region: 'Львівська область',
			path: 'lviv'
		});
		// Дві доби: запас на добу вичерпаного ліміту Open-Meteo
		expect(ttl).toBe(48 * 60 * 60);
		expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
	});

	it('застарілий кеш оновлюється', async () => {
		useRedis(cacheOf(3 * 60 * 60 * 1000));
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await getForecast(LVIV);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(redis.set).toHaveBeenCalledTimes(1);
	});

	it('Open-Meteo недоступний — показує застарілий кеш замість помилки', async () => {
		const old = makeForecast({ start: '2026-01-01' });
		useRedis(cacheOf(10 * 60 * 60 * 1000, old));
		fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }));

		const data = await getForecast(LVIV);

		expect(data.weather.daily.time[0]).toBe('2026-01-01');
		expect(weatherWrites()).toHaveLength(0);
	});

	it('429 «добовий ліміт» — пауза в Redis до півночі за UTC', async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: true,
					reason: 'Daily API request limit exceeded. Please try again tomorrow.'
				}),
				{ status: 429 }
			)
		);

		await expectHttpError(getForecast(LVIV), 503);
		const [key, , seconds] = redis.set.mock.calls.find(([k]) => k === 'openmeteo:paused')!;
		expect(key).toBe('openmeteo:paused');
		expect(seconds).toBeGreaterThan(0);
		expect(seconds).toBeLessThanOrEqual(24 * 60 * 60);
	});

	it('пауза: застарілий кеш віддається без марного запиту до Open-Meteo', async () => {
		useRedis(cacheOf(5 * 60 * 60 * 1000), true);

		await expect(getForecast(LVIV)).resolves.toMatchObject({ misto: 'Львів' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('пауза і кешу немає — одразу 503, без запиту до Open-Meteo', async () => {
		useRedis(null, true);

		await expectHttpError(getForecast(LVIV), 503);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('пошкоджений кеш ігнорує і бере свіжі дані', async () => {
		useRedis('{not json');
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await expect(getForecast(LVIV)).resolves.toMatchObject({ misto: 'Львів' });
	});

	it('без кешу й без Open-Meteo — 503 «тимчасово», а не 500', async () => {
		fetchMock.mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));
		await expectHttpError(getForecast(LVIV), 503);
	});

	it('неповна відповідь Open-Meteo — 503 і не потрапляє в кеш', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: true, reason: 'boom' })));

		await expectHttpError(getForecast(LVIV), 503);
		expect(redis.set).not.toHaveBeenCalled();
	});
});

describe('isFresh — свіжість кешу прогнозу', () => {
	// Вересень: Київ = UTC+3
	const at = (iso: string) => new Date(iso).getTime();

	it('до 2 годин того самого дня — свіжий', () => {
		expect(isFresh(at('2026-09-25T10:00:00Z'), at('2026-09-25T11:30:00Z'))).toBe(true);
	});

	it('старший за 2 години — застарілий', () => {
		expect(isFresh(at('2026-09-25T08:00:00Z'), at('2026-09-25T10:30:00Z'))).toBe(false);
	});

	it('отриманий до півночі за Києвом — після півночі застарілий, навіть через 40 хвилин', () => {
		// 23:40 25-го → 00:20 26-го за Києвом
		expect(isFresh(at('2026-09-25T20:40:00Z'), at('2026-09-25T21:20:00Z'))).toBe(false);
	});
});
