/*
	Коди погоди WMO, які повертає Open-Meteo, — єдине місце, де живе знання про них:
	іконка, вид опадів і хмарність. Тексти — у словниках (weather.ts, i18n/ru.ts);
	`satisfies Record<WeatherCode, string>` там не дає пропустити жоден код.
*/

export type PrecipKind = 'storm' | 'snow' | 'drizzle' | 'rain';

/** id символу в /icons.svg (денна версія) */
export type WeatherIcon =
	| 'clear'
	| 'partly-cloudy'
	| 'cloudy'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'snow'
	| 'snowfall'
	| 'thunderstorm'
	| 'thunderstorm-hail';

interface WeatherCodeInfo {
	readonly icon: WeatherIcon;
	/** null — без опадів (зокрема туман) */
	readonly precip: PrecipKind | null;
	/** 0 ясно … 3 похмуро — для медіани хмарності дня; туман і опади — похмуро */
	readonly cloudiness: 0 | 1 | 2 | 3;
}

export const WEATHER_CODES = {
	0: { icon: 'clear', precip: null, cloudiness: 0 },
	1: { icon: 'partly-cloudy', precip: null, cloudiness: 1 },
	2: { icon: 'partly-cloudy', precip: null, cloudiness: 2 },
	3: { icon: 'cloudy', precip: null, cloudiness: 3 },
	// Туман і туман з памороззю
	45: { icon: 'fog', precip: null, cloudiness: 3 },
	48: { icon: 'fog', precip: null, cloudiness: 3 },
	// Мряка; 56, 57 — крижана мряка
	51: { icon: 'drizzle', precip: 'drizzle', cloudiness: 3 },
	53: { icon: 'drizzle', precip: 'drizzle', cloudiness: 3 },
	55: { icon: 'drizzle', precip: 'drizzle', cloudiness: 3 },
	56: { icon: 'drizzle', precip: 'drizzle', cloudiness: 3 },
	57: { icon: 'drizzle', precip: 'drizzle', cloudiness: 3 },
	// Дощ; 66, 67 — замерзаючий дощ
	61: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	63: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	65: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	66: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	67: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	// Сніг; 77 — сніжні зерна
	71: { icon: 'snow', precip: 'snow', cloudiness: 3 },
	73: { icon: 'snow', precip: 'snow', cloudiness: 3 },
	75: { icon: 'snow', precip: 'snow', cloudiness: 3 },
	77: { icon: 'snow', precip: 'snow', cloudiness: 3 },
	// Зливи
	80: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	81: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	82: { icon: 'rain', precip: 'rain', cloudiness: 3 },
	// Снігопади
	85: { icon: 'snowfall', precip: 'snow', cloudiness: 3 },
	86: { icon: 'snowfall', precip: 'snow', cloudiness: 3 },
	// Гроза; 96, 99 — з градом
	95: { icon: 'thunderstorm', precip: 'storm', cloudiness: 3 },
	96: { icon: 'thunderstorm-hail', precip: 'storm', cloudiness: 3 },
	99: { icon: 'thunderstorm-hail', precip: 'storm', cloudiness: 3 }
} as const satisfies Record<number, WeatherCodeInfo>;

export type WeatherCode = keyof typeof WEATHER_CODES;

export const isWeatherCode = (code: number): code is WeatherCode =>
	Object.hasOwn(WEATHER_CODES, code);

const info = (code: number): WeatherCodeInfo | undefined =>
	isWeatherCode(code) ? WEATHER_CODES[code] : undefined;

/** Іконка за кодом; невідомий код — 'unknown' */
export const weatherIcon = (code: number): WeatherIcon | 'unknown' => info(code)?.icon ?? 'unknown';

/** Вид опадів; null — без опадів або невідомий код */
export const precipKind = (code: number): PrecipKind | null => info(code)?.precip ?? null;

export const isFog = (code: number): boolean => info(code)?.icon === 'fog';

/** 0 ясно … 3 похмуро; невідомий код — похмуро */
export const cloudiness = (code: number): 0 | 1 | 2 | 3 => info(code)?.cloudiness ?? 3;
