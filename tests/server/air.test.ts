import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redis } = vi.hoisted(() => ({ redis: new Map<string, string>() }));

vi.mock('$lib/server/upstash', () => ({
	redisGet: vi.fn(async (key: string) => redis.get(key) ?? null),
	redisSet: vi.fn(async (key: string, value: string) => void redis.set(key, value))
}));

const { getAirQuality, gridPoint } = await import('$lib/server/air');

const fetchMock = vi.fn();

const HOURS = 5 * 24;
const airResponse = (aqi = 30) => {
	const series = (value: number) => Array.from({ length: HOURS }, () => value);
	return new Response(
		JSON.stringify({
			hourly: {
				time: Array.from({ length: HOURS }, (_, i) => `2026-11-0${1 + Math.floor(i / 24)}T00:00`),
				european_aqi: series(aqi),
				alder_pollen: series(0),
				birch_pollen: series(0),
				grass_pollen: series(0),
				mugwort_pollen: series(0),
				ragweed_pollen: series(0)
			}
		})
	);
};

// Два села за 3 км одне від одного — одна клітинка CAMS
const VYNNYKY = { path: 'vynnyky', latitude: 49.8158, longitude: 24.1297 };
const LYSYNYCHI = { path: 'lysynychi', latitude: 49.8326, longitude: 24.1105 };

beforeEach(() => {
	redis.clear();
	// unstubGlobals повертає справжній fetch перед кожним тестом — підміняємо щоразу
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockReset().mockImplementation(async () => airResponse());
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getAirQuality — якість повітря на клітинку сітки CAMS 0,1°', () => {
	it('вузол сітки — найближчий, з одним знаком', () => {
		expect(gridPoint(49.8158)).toBe('49.8');
		expect(gridPoint(24.1297)).toBe('24.1');
		expect(gridPoint(50.46)).toBe('50.5');
	});

	it('запит — за координатами вузла, кеш — на клітинку', async () => {
		await getAirQuality(VYNNYKY);

		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.searchParams.get('latitude')).toBe('49.8');
		expect(url.searchParams.get('longitude')).toBe('24.1');
		expect([...redis.keys()]).toEqual(['air:v2:49.8,24.1']);
	});

	it('сусіднє село в тій самій клітинці — без нового запиту до API', async () => {
		const first = await getAirQuality(VYNNYKY);
		const second = await getAirQuality(LYSYNYCHI);

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(second).toEqual(first);
	});

	it('сервіс недоступний — застарілий кеш, а без кешу — null (блок просто не показується)', async () => {
		redis.set(
			'air:v2:49.8,24.1',
			JSON.stringify({ air: (await airResponse(55).json()).hourly, fetchedAt: 0 })
		);
		fetchMock.mockRejectedValue(new Error('timeout'));

		expect((await getAirQuality(VYNNYKY))?.european_aqi[0]).toBe(55);
		redis.clear();
		await expect(getAirQuality(VYNNYKY)).resolves.toBeNull();
	});

	it('пауза після 429 — без запиту до API: збережене або без блоку', async () => {
		redis.set('openmeteo:paused', 'Daily API request limit exceeded');

		await expect(getAirQuality(VYNNYKY)).resolves.toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('неповна відповідь не потрапляє в кеш', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ hourly: { time: [] } })));

		await expect(getAirQuality(VYNNYKY)).resolves.toBeNull();
		expect(redis.size).toBe(0);
	});
});
