import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { makeApiResponse } from '../fixtures/forecast';

const { weather, cities, redis, ttl } = vi.hoisted(() => ({
	weather: { findCity: vi.fn(), getForecast: vi.fn() },
	cities: { nearbyCities: vi.fn() },
	redis: new Map<string, string>(),
	ttl: new Map<string, number>()
}));

vi.mock('$lib/server/weather', () => weather);
vi.mock('$lib/server/cities', () => cities);
// Redis у памʼяті тесту: видно, що й на скільки записано
vi.mock('$lib/server/upstash', () => ({
	redisGet: vi.fn(async (key: string) => redis.get(key) ?? null),
	redisSet: vi.fn(async (key: string, value: string, seconds: number) => {
		redis.set(key, value);
		ttl.set(key, seconds);
	})
}));

const { findPlace, getCityWeather } = await import('$lib/server/place');

const LVIV = {
	id: 11272,
	slug: 'lviv',
	nameUa: 'Львів',
	nameRu: 'Львов',
	region: 'Львівська область',
	countryUa: 'Україна',
	latitude: 49.84,
	longitude: 24.03,
	path: 'lviv'
};
const NEARBY = [
	{ id: 1, nameUa: 'Винники', region: 'Львівська область', path: 'vynnyky', distance: 8 }
];
const DAY = 24 * 60 * 60;

const dbDown = () => {
	weather.findCity.mockReset().mockRejectedValue(new Error('Neon: compute quota exceeded'));
	cities.nearbyCities.mockReset().mockRejectedValue(new Error('Neon: compute quota exceeded'));
};

beforeEach(() => {
	redis.clear();
	ttl.clear();
	weather.findCity.mockReset().mockResolvedValue(LVIV);
	weather.getForecast.mockReset().mockResolvedValue(makeApiResponse());
	cities.nearbyCities.mockReset().mockResolvedValue(NEARBY);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('findPlace — населений пункт з Redis, база лише для нових адрес', () => {
	it('перший перегляд — з бази, і запис потрапляє в Redis на 30 днів', async () => {
		await expect(findPlace('lviv')).resolves.toEqual({ city: LVIV, nearby: NEARBY });

		expect(weather.findCity).toHaveBeenCalledOnce();
		expect(JSON.parse(redis.get('place:v1:lviv')!)).toEqual({ city: LVIV, nearby: NEARBY });
		expect(ttl.get('place:v1:lviv')).toBe(30 * DAY);
	});

	it('далі назва й сусіди — з Redis, база не потрібна', async () => {
		await findPlace('lviv');
		weather.findCity.mockClear();
		cities.nearbyCities.mockClear();

		await expect(findPlace('lviv')).resolves.toMatchObject({ city: { nameUa: 'Львів' } });
		expect(weather.findCity).not.toHaveBeenCalled();
		expect(cities.nearbyCities).not.toHaveBeenCalled();
	});

	it('база впала — відомий населений пункт однаково відкривається', async () => {
		await findPlace('lviv');
		dbDown();

		await expect(findPlace('lviv')).resolves.toEqual({ city: LVIV, nearby: NEARBY });
	});

	it('база впала, а адреси ще немає в кеші — помилка, а не вигадані дані', async () => {
		dbDown();
		await expect(findPlace('lviv')).rejects.toThrow('compute quota');
		expect(redis.size).toBe(0);
	});

	it('інша адреса того ж міста (Львів, Lviv) — теж без бази наступного разу', async () => {
		await findPlace('Львів');
		dbDown();

		// Запис містить канонічну адресу — сторінка переадресує на /pohoda/lviv
		await expect(findPlace('Львів')).resolves.toMatchObject({ city: { path: 'lviv' } });
		await expect(findPlace('LVIV')).resolves.toMatchObject({ city: { path: 'lviv' } });
	});

	it('невідома адреса запамʼятовується на добу: боти не будять базу', async () => {
		weather.findCity.mockResolvedValue(null);

		await expect(findPlace('wp-admin')).resolves.toBeNull();
		expect(ttl.get('place:v1:wp-admin')).toBe(DAY);

		weather.findCity.mockClear();
		await expect(findPlace('wp-admin')).resolves.toBeNull();
		expect(weather.findCity).not.toHaveBeenCalled();
	});

	it('збій «Погоди поруч» — сторінка без сусідів, але неповний запис у кеш не йде', async () => {
		cities.nearbyCities.mockRejectedValue(new Error('timeout'));

		await expect(findPlace('lviv')).resolves.toEqual({ city: LVIV, nearby: [] });
		expect(redis.size).toBe(0);
	});

	it('пошкоджений запис у кеші — ідемо в базу і перезаписуємо його', async () => {
		redis.set('place:v1:lviv', '{"city":');

		await expect(findPlace('lviv')).resolves.toEqual({ city: LVIV, nearby: NEARBY });
		expect(weather.findCity).toHaveBeenCalledOnce();
		expect(JSON.parse(redis.get('place:v1:lviv')!).city.nameUa).toBe('Львів');
	});

	it('надто довга адреса не потрапляє в кеш', async () => {
		weather.findCity.mockResolvedValue(null);
		await findPlace('a'.repeat(101));
		expect(redis.size).toBe(0);
	});

	it('порожня адреса — null без бази', async () => {
		await expect(findPlace('  ')).resolves.toBeNull();
		expect(weather.findCity).not.toHaveBeenCalled();
	});
});

describe('getCityWeather', () => {
	it('знаходить місто і віддає його прогноз', async () => {
		await expect(getCityWeather('Lviv')).resolves.toMatchObject({ misto: 'Харків' });
		expect(weather.getForecast).toHaveBeenCalledWith(LVIV);
	});

	it('невідоме місто — 404 без запиту прогнозу', async () => {
		weather.findCity.mockResolvedValue(null);
		const err = await getCityWeather('Атлантида').catch((e: unknown) => e);

		expect(isHttpError(err) && err.status).toBe(404);
		expect(weather.getForecast).not.toHaveBeenCalled();
	});
});
