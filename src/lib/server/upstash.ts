import { env } from '$env/dynamic/private';

const url = () => env.UPSTASH_REDIS_REST_URL;
const token = () => env.UPSTASH_REDIS_REST_TOKEN;

const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

function configured() {
	return Boolean(url() && token());
}

export async function redisGet(key: string): Promise<string | null> {
	if (!configured()) return null;

	const res = await fetch(`${url()}/get/${encodeURIComponent(key)}`, {
		headers: authHeaders()
	});
	const json = await res.json();

	if (json.result) {
		console.log(`[Redis GET] Кеш знайдено для ключа "${key}"`);
	} else {
		console.log(`[Redis GET] Кешу немає для ключа "${key}"`);
	}
	return json.result ?? null;
}

export async function redisSet(key: string, value: string, ttl: number): Promise<void> {
	if (!configured()) return;

	const res = await fetch(
		`${url()}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttl}`,
		{ headers: authHeaders() }
	);

	if (res.ok) {
		console.log(`[Redis SET] Дані збережено для ключа "${key}" на ${ttl} сек`);
	} else {
		console.log(`[Redis SET] Помилка збереження ключа "${key}": ${await res.text()}`);
	}
}

export async function redisIncrWithTTL(key: string, ttl: number): Promise<number> {
	if (!configured()) return 0;

	const incrRes = await fetch(`${url()}/incr/${encodeURIComponent(key)}`, {
		method: 'POST',
		headers: authHeaders()
	});
	const count = (await incrRes.json()).result as number;

	// TTL ставимо лише на першому інкременті
	if (count === 1) {
		await fetch(`${url()}/expire/${encodeURIComponent(key)}?seconds=${ttl}`, {
			method: 'POST',
			headers: authHeaders()
		});
	}

	return count;
}
