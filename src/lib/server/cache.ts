import { redisGet, redisSet } from './upstash';

/** Довідкові дані, що змінюються хіба що з новим імпортом бази: тоді досить змінити префікс ключа */
export const REFERENCE_TTL = 7 * 24 * 60 * 60;

/**
 * Значення з Redis, а якщо його там немає чи запис пошкоджений — обчислене й одразу збережене.
 * Для довідкових даних з бази (адреси для карти сайту, підказки пошуку): база прокидається
 * лише на перший запит, а не на кожен. Redis недоступний — просто обчислюємо, як раніше.
 */
export async function cachedJson<T>(
	key: string,
	ttl: number,
	compute: () => Promise<T>,
	isValid: (value: unknown) => value is T
): Promise<T> {
	const raw = await redisGet(key);
	if (raw !== null) {
		try {
			const value: unknown = JSON.parse(raw);
			if (isValid(value)) return value;
		} catch {
			// Пошкоджений запис — обчислюємо заново й перезаписуємо
		}
	}

	const value = await compute();
	await redisSet(key, JSON.stringify(value), ttl);
	return value;
}

export const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((v) => typeof v === 'string');
