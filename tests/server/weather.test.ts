import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { makeApiResponse, makeForecast } from '../fixtures/forecast';

const { prisma, redis } = vi.hoisted(() => ({
	prisma: { city: { findMany: vi.fn() } },
	redis: { get: vi.fn(), set: vi.fn() }
}));

vi.mock('$lib/server/prisma', () => ({ default: prisma }));
vi.mock('$lib/server/upstash', () => ({ redisGet: redis.get, redisSet: redis.set }));

const { buildOpenMeteoUrl, findCity, getCityWeather, isValidForecast, pickBestCity } =
	await import('$lib/server/weather');

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
		['Одеса', 'Одеська область'],
		['Суми', 'Сумська область'],
		['Рівне', 'Рівненська область'],
		['Дніпро', 'Дніпропетровська область'],
		['Запоріжжя', 'Запорізька область']
	])('%s — центр області «%s»', (name, region) => {
		const cities = [city(1, 'x', name, 'Волинська область'), city(2, 'x', name, region)];
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
	it('шукає за всіма назвами без урахування регістру і прибирає зайві поля', async () => {
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);

		const found = await findCity('  Lviv ');

		expect(found).toEqual({
			id: 11272,
			slug: 'lviv',
			nameUa: 'Львів',
			region: 'Львівська область',
			countryUa: 'Україна',
			latitude: 49.8,
			longitude: 24
		});
		const { where } = prisma.city.findMany.mock.calls[0][0];
		expect(where.OR).toHaveLength(4);
		expect(where.OR[0]).toEqual({ slug: { equals: 'Lviv', mode: 'insensitive' } });
	});

	it('на порожній запит не ходить у базу', async () => {
		expect(await findCity('   ')).toBeNull();
		expect(prisma.city.findMany).not.toHaveBeenCalled();
	});

	it('повертає null, якщо міста немає', async () => {
		prisma.city.findMany.mockResolvedValue([]);
		expect(await findCity('Атлантида')).toBeNull();
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

describe('getCityWeather', () => {
	it('віддає дані з кешу без запитів до бази й Open-Meteo', async () => {
		const cached = makeApiResponse();
		redis.get.mockResolvedValue(JSON.stringify(cached));

		expect(await getCityWeather('Kharkiv')).toEqual(cached);
		expect(redis.get).toHaveBeenCalledWith('v2:kharkiv');
		expect(prisma.city.findMany).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('без кешу — бере місто з бази, погоду з Open-Meteo і кешує на 50 годин', async () => {
		const forecast = makeForecast();
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response(JSON.stringify(forecast)));

		const data = await getCityWeather('lviv');

		expect(data).toEqual({
			misto: 'Львів',
			oblast: 'Львівська область',
			kraina: 'Україна',
			latitude: 49.8,
			longitude: 24,
			weather: forecast
		});
		expect(redis.set).toHaveBeenCalledWith('v2:lviv', JSON.stringify(data), 50 * 60 * 60);
		expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
	});

	it('пошкоджений кеш ігнорує і бере свіжі дані', async () => {
		redis.get.mockResolvedValue('{not json');
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		await expect(getCityWeather('lviv')).resolves.toMatchObject({ misto: 'Львів' });
	});

	it('кеш із неповними даними теж ігнорує', async () => {
		redis.get.mockResolvedValue(JSON.stringify(makeApiResponse(makeForecast({ days: 0 }))));
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response(JSON.stringify(makeForecast())));

		const data = await getCityWeather('lviv');
		expect(data.weather.daily.time).toHaveLength(7);
	});

	it('невідоме місто — 404', async () => {
		prisma.city.findMany.mockResolvedValue([]);
		await expectHttpError(getCityWeather('Атлантида'), 404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('Open-Meteo відповів помилкою — 502 і нічого не кешуємо', async () => {
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }));

		await expectHttpError(getCityWeather('lviv'), 502);
		expect(redis.set).not.toHaveBeenCalled();
	});

	it('Open-Meteo недоступний або завис — 502, а не 500', async () => {
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

		await expectHttpError(getCityWeather('lviv'), 502);
	});

	it('неповна відповідь Open-Meteo — 502 і не потрапляє в кеш на 50 годин', async () => {
		prisma.city.findMany.mockResolvedValue(LVIV_DUPLICATES);
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: true, reason: 'boom' })));

		await expectHttpError(getCityWeather('lviv'), 502);
		expect(redis.set).not.toHaveBeenCalled();
	});
});
