import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';

/*
	Великі записи кешу — прогноз (~15 КБ) і якість повітря (~4 КБ) — лежать у Redis стиснутими:
	~4 КБ і ~0,5 КБ. Безкоштовний Redis — 256 МБ, а нестиснуті прогнози для всіх 24 тисяч
	населених пунктів зайняли б ~360 МБ. Коли місце закінчується, запис у кеш мовчки перестає
	працювати, і кожен перегляд іде в Open-Meteo, витрачаючи денний ліміт.
	Стиснення без втрат, ~1–2 мс; Redis при цьому ще й віддає вчетверо менше даних.
*/
const PREFIX = 'br:';

export function pack(value: unknown): string {
	const json = JSON.stringify(value);
	const compressed = brotliCompressSync(json, {
		params: {
			// Якість 6 — майже той самий розмір, що й максимальна 11, але в рази швидше
			[constants.BROTLI_PARAM_QUALITY]: 6,
			[constants.BROTLI_PARAM_SIZE_HINT]: json.length
		}
	});
	return PREFIX + compressed.toString('base64');
}

/** Розпакований запис. Старі нестиснуті (звичайний JSON) теж читаються; пошкоджений — undefined */
export function unpack(raw: string): unknown {
	try {
		const json = raw.startsWith(PREFIX)
			? brotliDecompressSync(Buffer.from(raw.slice(PREFIX.length), 'base64')).toString()
			: raw;
		return JSON.parse(json);
	} catch {
		return undefined;
	}
}
