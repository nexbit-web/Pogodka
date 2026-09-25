import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const { redisGet, redisSet, redisIncrWithTTL } = await import('$lib/server/upstash');

const fetchMock = vi.fn();

function reply(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
	env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
	env.UPSTASH_REDIS_REST_TOKEN = 'secret';
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('без налаштувань Redis', () => {
	it('нічого не запитує і тихо повертає порожнє', async () => {
		env.UPSTASH_REDIS_REST_URL = undefined;

		expect(await redisGet('k')).toBeNull();
		await redisSet('k', 'v', 10);
		expect(await redisIncrWithTTL('k', 10)).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('redisGet', () => {
	it('повертає збережене значення з авторизацією', async () => {
		fetchMock.mockResolvedValue(reply({ result: '{"a":1}' }));

		expect(await redisGet('v2:київ')).toBe('{"a":1}');
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://redis.test/get/v2%3A%D0%BA%D0%B8%D1%97%D0%B2');
		expect(init.headers.Authorization).toBe('Bearer secret');
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});

	it('повертає null, коли ключа немає', async () => {
		fetchMock.mockResolvedValue(reply({ result: null }));
		expect(await redisGet('k')).toBeNull();
	});

	it('не ламає сторінку, коли Redis недоступний', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));
		expect(await redisGet('k')).toBeNull();
	});

	it('не ламає сторінку на помилці сервісу або битому JSON', async () => {
		fetchMock.mockResolvedValueOnce(reply({ error: 'boom' }, 500));
		expect(await redisGet('k')).toBeNull();

		fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
		expect(await redisGet('k')).toBeNull();
	});
});

describe('redisSet', () => {
	it('передає значення в тілі POST, а TTL — параметром', async () => {
		fetchMock.mockResolvedValue(reply({ result: 'OK' }));
		const big = JSON.stringify({ data: 'x'.repeat(50_000) });

		await redisSet('v2:lviv', big, 180000);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://redis.test/set/v2%3Alviv?EX=180000');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(big);
	});

	it('не кидає помилку, коли Redis недоступний або відповів помилкою', async () => {
		fetchMock.mockRejectedValueOnce(new Error('timeout'));
		await expect(redisSet('k', 'v', 1)).resolves.toBeUndefined();

		fetchMock.mockResolvedValueOnce(reply({ error: 'ERR' }, 400));
		await expect(redisSet('k', 'v', 1)).resolves.toBeUndefined();
	});
});

describe('redisIncrWithTTL', () => {
	it('на першому інкременті ставить TTL', async () => {
		fetchMock
			.mockResolvedValueOnce(reply({ result: 1 }))
			.mockResolvedValueOnce(reply({ result: 1 }));

		expect(await redisIncrWithTTL('hits', 60)).toBe(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1][0]).toBe('https://redis.test/expire/hits/60');
	});

	it('на наступних інкрементах TTL не чіпає', async () => {
		fetchMock.mockResolvedValueOnce(reply({ result: 5 }));

		expect(await redisIncrWithTTL('hits', 60)).toBe(5);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('при збої повертає 0', async () => {
		fetchMock.mockRejectedValue(new Error('down'));
		expect(await redisIncrWithTTL('hits', 60)).toBe(0);
	});
});
