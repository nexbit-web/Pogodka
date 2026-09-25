import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { makeForecast } from '../fixtures/forecast';

const { prisma, redis } = vi.hoisted(() => ({
	prisma: { city: { findMany: vi.fn() } },
	redis: { get: vi.fn(), set: vi.fn() }
}));

vi.mock('$lib/server/prisma', () => ({ default: prisma }));
vi.mock('$lib/server/upstash', () => ({ redisGet: redis.get, redisSet: redis.set }));

const {
	buildOpenMeteoUrl,
	findCity,
	isFresh,
	getCityWeather,
	getForecast,
	isValidForecast,
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
		expect(url.searchParams.get('forecast_days')).toBe('7');
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
});

describe('isValidForecast', () => {
	it('приймає повний прогноз і старий кеш', () => {
		expect(isValidForecast(makeForecast())).toBe(true);
		expect(isValidForecast(makeForecast({ legacy: true }))).toBe(true);
	});

	it.each([
		['null', null],
		['помилку Open-Meteo', { error: true, reason: 'Invalid coordinates' }],
		['без hourly', { daily: makeForecast().daily }],
		['порожній прогноз', makeForecast({ days: 0 })]
	])('відхиляє %s', (_, data) => {
		expect(isValidForecast(data)).toBe(false);
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

	it('свіжий кеш (до 2 годин) — без запиту до Open-Meteo', async () => {
		redis.get.mockResolvedValue(cacheOf(30 * 60 * 1000));

		const data = await getForecast(LVIV);

		expect(data).toMatchObject({ misto: 'Львів', oblast: 'Львівська область', path: 'lviv' });
		expect(redis.get).toHaveBeenCalledWith('v3:lviv');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('без кешу — бере Open-Meteo і кешує з часом отримання', async () => {
		const forecast = makeForecast();
		fetchMock.mockResolvedValue(new Response(JSON.stringify(forecast)));

		const data = await getForecast(LVIV);

		expect(data.weather).toEqual(forecast);
		const [key, value, ttl] = redis.set.mock.calls[0];
		expect(key).toBe('v3:lviv');
		expect(JSON.parse(value).fetchedAt).toBeGreaterThan(Date.now() - 5000);
		expect(ttl).toBe(50 * 60 * 60);
		expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
	});

	it('застарілий кеш оновлюється', async () => {
		redis.get.mockResolvedValue(cacheOf(3 * 60 * 60 * 1000));
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await getForecast(LVIV);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(redis.set).toHaveBeenCalledTimes(1);
	});

	it('Open-Meteo недоступний — показує застарілий кеш замість помилки', async () => {
		const old = makeForecast({ start: '2026-01-01' });
		redis.get.mockResolvedValue(cacheOf(10 * 60 * 60 * 1000, old));
		fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }));

		const data = await getForecast(LVIV);

		expect(data.weather.daily.time[0]).toBe('2026-01-01');
		expect(redis.set).not.toHaveBeenCalled();
	});

	it('пошкоджений кеш ігнорує і бере свіжі дані', async () => {
		redis.get.mockResolvedValue('{not json');
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await expect(getForecast(LVIV)).resolves.toMatchObject({ misto: 'Львів' });
	});

	it('без кешу й без Open-Meteo — 502, а не 500', async () => {
		fetchMock.mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));
		await expectHttpError(getForecast(LVIV), 502);
	});

	it('неповна відповідь Open-Meteo — 502 і не потрапляє в кеш', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: true, reason: 'boom' })));

		await expectHttpError(getForecast(LVIV), 502);
		expect(redis.set).not.toHaveBeenCalled();
	});
});

describe('getCityWeather', () => {
	it('знаходить місто і віддає його прогноз', async () => {
		database(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await expect(getCityWeather('Lviv')).resolves.toMatchObject({ misto: 'Львів', path: 'lviv' });
	});

	it('невідоме місто — 404 без запиту до Open-Meteo', async () => {
		database([]);
		await expectHttpError(getCityWeather('Атлантида'), 404);
		expect(fetchMock).not.toHaveBeenCalled();
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
