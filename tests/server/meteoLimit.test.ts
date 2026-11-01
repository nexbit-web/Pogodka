import { describe, expect, it, vi } from 'vitest';

const { redis } = vi.hoisted(() => ({ redis: new Map<string, [string, number]>() }));

vi.mock('$lib/server/upstash', () => ({
	redisGet: vi.fn(async (key: string) => redis.get(key)?.[0] ?? null),
	redisSet: vi.fn(
		async (key: string, value: string, ttl: number) => void redis.set(key, [value, ttl])
	)
}));

const { meteoPaused, pauseMeteo, pauseSeconds } = await import('$lib/server/meteoLimit');

describe('pauseSeconds — скільки чекати після 429', () => {
	const at = new Date('2026-11-01T21:15:30Z');

	it('добовий ліміт — до півночі за UTC', () => {
		const seconds = pauseSeconds(
			'Daily API request limit exceeded. Please try again tomorrow.',
			at
		);
		expect(seconds).toBe(2 * 3600 + 44 * 60 + 30);
	});

	it('годинний — до наступної години', () => {
		expect(pauseSeconds('Hourly API request limit exceeded.', at)).toBe(44 * 60 + 30);
	});

	it('хвилинний чи незрозумілий — хвилина', () => {
		expect(pauseSeconds('Minutely API request limit exceeded.', at)).toBe(60);
		expect(pauseSeconds('', at)).toBe(60);
	});

	it('ніколи не менше хвилини, навіть за секунду до скидання', () => {
		expect(pauseSeconds('Daily limit', new Date('2026-11-01T23:59:59Z'))).toBe(60);
	});
});

describe('pauseMeteo / meteoPaused', () => {
	it('відповідь 429 ставить паузу, і всі функції її бачать', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		await expect(meteoPaused()).resolves.toBe(false);

		await pauseMeteo(
			new Response(
				JSON.stringify({ error: true, reason: 'Minutely API request limit exceeded.' }),
				{
					status: 429
				}
			)
		);

		await expect(meteoPaused()).resolves.toBe(true);
		expect(redis.get('openmeteo:paused')).toEqual(['Minutely API request limit exceeded.', 60]);
	});
});
