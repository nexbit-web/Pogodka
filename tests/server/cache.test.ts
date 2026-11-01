import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redis, ttl } = vi.hoisted(() => ({
	redis: new Map<string, string>(),
	ttl: new Map<string, number>()
}));

vi.mock('$lib/server/upstash', () => ({
	redisGet: vi.fn(async (key: string) => redis.get(key) ?? null),
	redisSet: vi.fn(async (key: string, value: string, seconds: number) => {
		redis.set(key, value);
		ttl.set(key, seconds);
	})
}));

const { cachedJson, isStringArray, REFERENCE_TTL } = await import('$lib/server/cache');

const fromDb = vi.fn();

beforeEach(() => {
	redis.clear();
	ttl.clear();
	fromDb.mockReset().mockResolvedValue(['kyiv', 'lviv']);
});

describe('cachedJson — довідкові дані з Redis, база лише на перший запит', () => {
	it('перший запит — з бази, і результат лягає в Redis на тиждень', async () => {
		await expect(cachedJson('k', REFERENCE_TTL, fromDb, isStringArray)).resolves.toEqual([
			'kyiv',
			'lviv'
		]);
		expect(fromDb).toHaveBeenCalledOnce();
		expect(ttl.get('k')).toBe(7 * 24 * 60 * 60);
	});

	it('далі — з Redis, база не потрібна навіть коли впала', async () => {
		await cachedJson('k', REFERENCE_TTL, fromDb, isStringArray);
		fromDb.mockReset().mockRejectedValue(new Error('db down'));

		await expect(cachedJson('k', REFERENCE_TTL, fromDb, isStringArray)).resolves.toEqual([
			'kyiv',
			'lviv'
		]);
		expect(fromDb).not.toHaveBeenCalled();
	});

	it('пошкоджений чи чужий запис — обчислює заново й перезаписує', async () => {
		redis.set('broken', '{oops');
		redis.set('wrong', JSON.stringify({ not: 'a list' }));

		await cachedJson('broken', REFERENCE_TTL, fromDb, isStringArray);
		await cachedJson('wrong', REFERENCE_TTL, fromDb, isStringArray);

		expect(fromDb).toHaveBeenCalledTimes(2);
		expect(JSON.parse(redis.get('wrong')!)).toEqual(['kyiv', 'lviv']);
	});

	it('порожній результат теж кешується: вигадані запити не будять базу', async () => {
		fromDb.mockResolvedValue([]);
		await cachedJson('search:v1:qqqq', REFERENCE_TTL, fromDb, isStringArray);
		await cachedJson('search:v1:qqqq', REFERENCE_TTL, fromDb, isStringArray);

		expect(fromDb).toHaveBeenCalledOnce();
	});

	it('помилка бази без кешу — летить далі й нічого не записує', async () => {
		fromDb.mockRejectedValue(new Error('db down'));
		await expect(cachedJson('k', REFERENCE_TTL, fromDb, isStringArray)).rejects.toThrow('db down');
		expect(redis.size).toBe(0);
	});
});
