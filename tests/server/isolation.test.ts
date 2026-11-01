import { describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/private';
import { redisGet } from '$lib/server/upstash';

// Тести ніколи не дістають до боєвого Redis чи бази, навіть коли .env лежить поруч
describe('ізоляція тестів від боєвих сервісів', () => {
	it('секрети з .env тестам не видно', () => {
		expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
		expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
		expect(env.DATABASE_URL).toBeUndefined();
	});

	it('Redis без налаштувань мовчки нічого не робить', async () => {
		await expect(redisGet('place:v1:lviv')).resolves.toBeNull();
	});
});
