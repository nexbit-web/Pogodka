import { redisGet, redisSet } from './upstash';

/*
	Ліміти безкоштовного Open-Meteo: 600 викликів за хвилину, 5 000 за годину, 10 000 за добу.
	Коли ліміт вичерпано, Open-Meteo відповідає 429, і кожен наступний запит марний: він однаково
	отримає 429, а сторінка чекає на відповідь. Пошукові роботи після простою обходять до сотні
	сторінок за хвилину — без паузи кожна з них ще й смикала б API.
	Тож відповідь 429 запамʼятовується в Redis, спільно для всіх серверних функцій: до скидання
	ліміту сайт віддає збережений прогноз, а без нього — 503 «повернись пізніше», і роботи
	самі сповільнюють обхід. Сам запит до Redis — лише коли кеш застарів.
*/
const KEY = 'openmeteo:paused';

/** Чи стоїть пауза після 429 */
export async function meteoPaused(): Promise<boolean> {
	return (await redisGet(KEY)) !== null;
}

/**
 * Скільки секунд чекати за текстом відповіді Open-Meteo:
 * «Daily API request limit exceeded…» — до півночі за UTC, коли добовий ліміт скидається;
 * «Hourly…» — до наступної години; хвилинний чи невідомий — хвилину.
 */
export function pauseSeconds(reason: string, now = new Date()): number {
	const text = reason.toLowerCase();
	if (text.includes('daily')) {
		const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
		return Math.max(60, Math.ceil((midnight - now.getTime()) / 1000));
	}
	if (text.includes('hourly')) {
		return Math.max(60, 3600 - now.getUTCMinutes() * 60 - now.getUTCSeconds());
	}
	return 60;
}

/** Відповідь 429: пауза до скидання вичерпаного ліміту */
export async function pauseMeteo(res: Response): Promise<void> {
	const body = (await res.json().catch(() => null)) as { reason?: unknown } | null;
	const reason = typeof body?.reason === 'string' ? body.reason : '';
	const seconds = pauseSeconds(reason);
	console.warn(`[Open-Meteo] Ліміт вичерпано, пауза ${seconds} с: ${reason || res.status}`);
	await redisSet(KEY, reason.slice(0, 200) || String(res.status), seconds);
}
