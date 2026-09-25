import { env } from '$env/dynamic/private';

/*
	Мінімальний клієнт Upstash Redis REST.
	Кеш — лише прискорення: будь-яка помилка Redis (мережа, таймаут, збій сервісу)
	не повинна ламати сторінку, тому всі функції тихо деградують.
*/

// Redis відповідає за мілісекунди; якщо довше — краще піти по свіжі дані
const TIMEOUT_MS = 1500;

const url = () => env.UPSTASH_REDIS_REST_URL;
const token = () => env.UPSTASH_REDIS_REST_TOKEN;

function configured() {
	return Boolean(url() && token());
}

function request(path: string, init: RequestInit = {}) {
	return fetch(`${url()}${path}`, {
		...init,
		headers: { Authorization: `Bearer ${token()}`, ...init.headers },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
}

export async function redisGet(key: string): Promise<string | null> {
	if (!configured()) return null;

	try {
		const res = await request(`/get/${encodeURIComponent(key)}`);
		if (!res.ok) return null;
		const json = (await res.json()) as { result?: string | null };
		return typeof json.result === 'string' ? json.result : null;
	} catch (err) {
		console.warn(`[Redis GET] Кеш недоступний для "${key}":`, err);
		return null;
	}
}

export async function redisSet(key: string, value: string, ttl: number): Promise<void> {
	if (!configured()) return;

	try {
		// Значення — в тілі запиту: прогноз важить десятки КБ і не влазить в URL
		const res = await request(`/set/${encodeURIComponent(key)}?EX=${ttl}`, {
			method: 'POST',
			body: value
		});
		if (!res.ok) {
			console.warn(`[Redis SET] Помилка збереження "${key}": ${res.status}`);
		}
	} catch (err) {
		console.warn(`[Redis SET] Кеш недоступний для "${key}":`, err);
	}
}

export async function redisIncrWithTTL(key: string, ttl: number): Promise<number> {
	if (!configured()) return 0;

	try {
		const res = await request(`/incr/${encodeURIComponent(key)}`, { method: 'POST' });
		const count = Number(((await res.json()) as { result?: unknown }).result) || 0;

		// TTL ставимо лише на першому інкременті
		if (count === 1) {
			await request(`/expire/${encodeURIComponent(key)}/${ttl}`, { method: 'POST' });
		}

		return count;
	} catch (err) {
		console.warn(`[Redis INCR] Лічильник недоступний для "${key}":`, err);
		return 0;
	}
}
