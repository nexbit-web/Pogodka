import { KYIV_TZ, kyivNow } from './date';
import type { AirQualityData, DayHour, ForecastDay, OpenMeteoWeather, WeeklyDay } from './types';
import type { Lang } from './i18n';
import { ruPack } from './i18n/pack';
import {
	cloudiness,
	isFog,
	isWeatherCode,
	precipKind,
	weatherIcon,
	type PrecipKind,
	type WeatherCode
} from './weatherCodes';

export { KYIV_TZ };

/** Індекс години в масиві hourly, що відповідає поточній годині у Києві. */
export function findCurrentHourIndex(
	weather: OpenMeteoWeather,
	{ date, hour }: { date: string; hour: number } = kyivNow()
): number {
	// Час Open-Meteo вже київський: «2026-09-25T14:00»
	return weather.hourly.time.indexOf(`${date}T${String(hour).padStart(2, '0')}:00`);
}

/** Одна година прогнозу без перевірки меж: масиви вже перевірені на сервері (server/weather.ts) */
function readHour(h: OpenMeteoWeather['hourly'], i: number): DayHour {
	const time = h.time[i];
	return {
		time,
		hour: Number(time.slice(11, 13)),
		temp: h.temperature_2m[i],
		feels: h.apparent_temperature[i],
		code: h.weathercode[i],
		precip: h.precipitation[i],
		precipProb: h.precipitation_probability?.[i] ?? undefined,
		wind: h.windspeed_10m[i],
		gusts: h.windgusts_10m[i],
		windDir: h.winddirection_10m[i],
		humidity: h.relativehumidity_2m[i],
		pressure: h.pressure_msl[i]
	};
}

/**
 * Година прогнозу за індексом; null — такої години в прогнозі немає.
 * «Зараз» у шапці — це саме вона, без підміни на іншу годину: краще чесне «—»,
 * ніж давня година під виглядом поточної. Таблиця будує години тією ж функцією,
 * тож числа в шапці й у колонці «Зараз» збігаються за побудовою.
 */
export function hourAt(weather: OpenMeteoWeather, i: number): DayHour | null {
	return i >= 0 && i < weather.hourly.time.length ? readHour(weather.hourly, i) : null;
}

/** 7-денний прогноз у форматі, зручному для компонентів. */
export function buildWeeklyDays(weather: OpenMeteoWeather): WeeklyDay[] {
	return weather.daily.time.map((date, idx) => ({
		date,
		day: {
			code: weather.daily.weathercode[idx],
			mintemp_c: weather.daily.temperature_2m_min[idx],
			maxtemp_c: weather.daily.temperature_2m_max[idx]
		}
	}));
}

const WEATHER_TEXT_UK = {
	0: 'Ясно',
	1: 'Майже ясно',
	2: 'Частково хмарно',
	3: 'Похмуро',
	45: 'Туман',
	48: 'Інеєвий туман',
	51: 'Легка мряка',
	53: 'Мряка',
	55: 'Сильна мряка',
	56: 'Легка крижана мряка',
	57: 'Сильна крижана мряка',
	61: 'Легкий дощ',
	63: 'Помірний дощ',
	65: 'Сильний дощ',
	66: 'Легкий замерзаючий дощ',
	67: 'Сильний замерзаючий дощ',
	71: 'Легкий сніг',
	73: 'Сніг',
	75: 'Сильний сніг',
	77: 'Сніжинки',
	80: 'Легкі зливи',
	81: 'Помірні зливи',
	82: 'Сильні зливи',
	85: 'Легкий снігопад',
	86: 'Сильний снігопад',
	95: 'Гроза',
	96: 'Гроза з невеликим градом',
	99: 'Гроза з великим градом'
} satisfies Record<WeatherCode, string>;

export function getWeatherText(code: number, lang: Lang = 'uk'): string {
	const ru = lang === 'ru' ? ruPack() : undefined;
	if (!isWeatherCode(code)) return ru?.unknown ?? 'Невідомо';
	return (ru?.weatherText ?? WEATHER_TEXT_UK)[code];
}

// Іконки, в яких є сонце: вночі замість нього малюємо місяць
const NIGHT_ICONS = new Set(['clear', 'partly-cloudy', 'drizzle']);

/** id символу в /icons.svg за кодом Open-Meteo. Вночі — версія з місяцем. */
export function getWeatherIconId(code: number, night = false): string {
	const id = weatherIcon(code);
	return night && NIGHT_ICONS.has(id) ? `${id}-night` : id;
}

/**
 * Колір іконки. Палітра навмисно стримана: кольорові лише ясне небо (сонце або місяць)
 * і дощ (primary), решта — спокійний сірий.
 */
export function getConditionTint(code: number, night = false): string {
	switch (getWeatherIconId(code, night)) {
		case 'clear':
			return 'var(--w-sun)';
		case 'clear-night':
			return 'var(--w-moon)';
		case 'drizzle':
		case 'drizzle-night':
		case 'rain':
			return 'var(--primary)';
		default:
			return 'var(--w-cloud)';
	}
}

// Опорні точки температурної шкали: від морозу (синій) до спеки (червоний)
const TEMP_STOPS: Array<[number, [number, number, number]]> = [
	[-30, [111, 124, 240]],
	[-10, [74, 168, 255]],
	[0, [100, 210, 255]],
	[10, [95, 214, 160]],
	[18, [255, 214, 10]],
	[26, [255, 159, 10]],
	[35, [255, 69, 58]]
];

/** Колір, що відповідає температурі. Використовується у смужках 10-денного прогнозу. */
export function getTempColor(temp: number): string {
	const stops = TEMP_STOPS;

	if (temp <= stops[0][0]) return `rgb(${stops[0][1].join(' ')})`;

	const last = stops[stops.length - 1];
	if (temp >= last[0]) return `rgb(${last[1].join(' ')})`;

	for (let i = 0; i < stops.length - 1; i++) {
		const [t1, c1] = stops[i];
		const [t2, c2] = stops[i + 1];

		if (temp >= t1 && temp <= t2) {
			const ratio = (temp - t1) / (t2 - t1);
			const mix = c1.map((c, idx) => Math.round(c + (c2[idx] - c) * ratio));
			return `rgb(${mix.join(' ')})`;
		}
	}

	return `rgb(${last[1].join(' ')})`;
}

// Осадки вважаються помітними від 0,5 мм за день або з імовірністю від 30%
const NOTABLE_PRECIP_MM = 0.5;
const NOTABLE_PRECIP_PROB = 30;

/**
 * Іконка дня — яким день був насправді, а не найгірша його година.
 * Open-Meteo віддає за добу найсильнішу погоду: 0,1 мм дощу за одну годину
 * перетворюють сухий день на «дощовий». Тому опади показуємо, лише якщо вони помітні,
 * а інакше — типовий стан неба світлового дня.
 */
export function representativeDayCode({
	apiCode,
	hours,
	precipSum,
	precipProbMax,
	sunrise,
	sunset
}: {
	/** Код дня від Open-Meteo — найсильніша погода доби */
	apiCode: number;
	hours: DayHour[];
	precipSum: number;
	precipProbMax?: number;
	sunrise?: string;
	sunset?: string;
}): number {
	const wet = precipKind(apiCode) !== null;
	const notable = precipSum >= NOTABLE_PRECIP_MM || (precipProbMax ?? 0) >= NOTABLE_PRECIP_PROB;
	if (wet && notable) return apiCode;

	if (hours.length === 0) return wet ? 3 : apiCode;
	// Світлова частина дня; для вечора, коли вона вже минула, — усі години
	const light = hours.filter((h) => !isNightHour(h.time, sunrise, sunset));
	const daytime = light.length ? light : hours;

	// Туман — лише якщо тримався хоча б пів світлового дня
	const fog = daytime.filter((h) => isFog(h.code));
	if (fog.length > 0 && fog.length * 2 >= daytime.length) return fog[0].code;

	// Інакше — медіана хмарності (0 ясно … 3 похмуро): «середина» дня, а не його частина.
	// Туман і години з незначними опадами рахуються як похмурі
	const sky = daytime.map((h) => cloudiness(h.code)).sort((x, y) => x - y);
	return sky[Math.floor(sky.length / 2)];
}

/** Дні прогнозу з погодинними даними, згруповані за датою (час Open-Meteo вже київський). */
export function buildForecastDays(weather: OpenMeteoWeather): ForecastDay[] {
	const h = weather.hourly;
	const d = weather.daily;
	const byDate = new Map<string, DayHour[]>();

	h.time.forEach((time, i) => {
		const date = time.slice(0, 10);
		const list = byDate.get(date) ?? [];
		list.push(readHour(h, i));
		byDate.set(date, list);
	});

	return d.time.map((date, i) => {
		const hours = byDate.get(date) ?? [];
		const precipSum = d.precipitation_sum[i];
		const precipProbMax = d.precipitation_probability_max?.[i] ?? undefined;
		const sunrise = d.sunrise?.[i];
		const sunset = d.sunset?.[i];

		return {
			date,
			code: representativeDayCode({
				apiCode: d.weathercode[i],
				hours,
				precipSum,
				precipProbMax,
				sunrise,
				sunset
			}),
			min: d.temperature_2m_min[i],
			max: d.temperature_2m_max[i],
			precipSum,
			precipProbMax,
			sunrise,
			sunset,
			uvMax: d.uv_index_max?.[i] ?? undefined,
			hours
		};
	});
}

export type { PrecipKind };

/** Найближчі опади: що почнеться чи закінчиться і о котрій — без жодного слова інтерфейсу */
export type PrecipOutlook =
	{ event: 'starts' | 'ends'; kind: PrecipKind; at: string } | { event: 'lasts'; kind: PrecipKind };

/**
 * Найближчі опади на кілька годин уперед — щоб одразу знати, чи брати парасольку.
 * null — у найближчі години сухо, і рядка не буде.
 *
 * Опади Open-Meteo — сума за годину, що закінчується в указаний час:
 * значення о 16:00 означає дощ з 15:00 до 16:00. Тому поточна година — наступний запис,
 * а початок опадів — година перед першим мокрим записом.
 */
export function precipOutlook(
	weather: OpenMeteoWeather,
	hourIndex: number,
	horizon = 6
): PrecipOutlook | null {
	const { time, precipitation, weathercode } = weather.hourly;
	if (hourIndex < 0) return null;

	// Вид опадів у цьому записі; null — сухо. Туман із краплями (45 і 0,1 мм) опадами не рахуємо
	const wetKind = (i: number) =>
		i < time.length && precipitation[i] > 0 ? precipKind(weathercode[i]) : null;
	// «15:00» без нуля попереду, як у таблиці
	const at = (i: number) => time[i].slice(11, 16).replace(/^0/, '');
	const now = hourIndex + 1;
	const last = Math.min(hourIndex + horizon, time.length - 1);

	const current = wetKind(now);
	if (current) {
		for (let i = now + 1; i <= last; i++) {
			if (!wetKind(i)) return { event: 'ends', kind: current, at: at(i - 1) };
		}
		return { event: 'lasts', kind: current };
	}

	for (let i = now + 1; i <= last; i++) {
		const kind = wetKind(i);
		if (kind) return { event: 'starts', kind, at: at(i - 1) };
	}
	return null;
}

// Слово й дієслова — разом: російській потрібен рід («дождь начнётся», «морось закончится»)
export interface Outlook {
	/** «близько 15:00» */
	about: string;
	/** «Дощ триватиме ще кілька годин» */
	longer: string;
	kinds: Record<PrecipKind, { word: string; starts: string; ends: string; lasts: string }>;
}

const OUTLOOK_UK: Outlook = {
	about: 'близько',
	longer: 'ще кілька годин',
	kinds: {
		storm: { word: 'Гроза', starts: 'почнеться', ends: 'закінчиться', lasts: 'триватиме' },
		snow: { word: 'Сніг', starts: 'почнеться', ends: 'закінчиться', lasts: 'триватиме' },
		drizzle: { word: 'Мряка', starts: 'почнеться', ends: 'закінчиться', lasts: 'триватиме' },
		rain: { word: 'Дощ', starts: 'почнеться', ends: 'закінчиться', lasts: 'триватиме' }
	}
};

/** Рядок під температурою: «Дощ почнеться близько 15:00», «Сніг триватиме ще кілька годин» */
export function outlookText(outlook: PrecipOutlook, lang: Lang = 'uk'): string {
	const t = (lang === 'ru' && ruPack()?.outlook) || OUTLOOK_UK;
	const { word, ...verbs } = t.kinds[outlook.kind];
	return outlook.event === 'lasts'
		? `${word} ${verbs.lasts} ${t.longer}`
		: `${word} ${verbs[outlook.event]} ${t.about} ${outlook.at}`;
}

/** Колонка погодинної таблиці */
export interface TableSlot extends DayHour {
	/** Колонка «Зараз»: дані поточної години, ті самі, що й у шапці */
	now: boolean;
}

/**
 * Колонки погодинної таблиці: кожні 3 години. Колонка відповідає проміжку [h, h+3),
 * тож нічого між ними не губиться: опади за проміжок сумуються, ймовірність і пориви —
 * найбільші, а якщо в проміжку пройшов дощ чи сніг, іконка показує саме його.
 * Сьогодні проміжок із поточною годиною показує саме її — ті самі числа, що й у шапці,
 * а опади рахує від неї до кінця проміжку.
 */
export function buildTableSlots(hours: DayHour[], currentHour?: number): TableSlot[] {
	const byHour = new Map(hours.map((h) => [h.hour, h]));

	return hours
		.filter((h) => h.hour % 3 === 0)
		.map((start) => {
			const end = start.hour + 3;
			const isNow =
				currentHour !== undefined &&
				currentHour >= start.hour &&
				currentHour < end &&
				byHour.has(currentHour);
			const from = isNow ? currentHour : start.hour;
			const base = isNow ? byHour.get(currentHour)! : start;
			const period = hours.filter((h) => h.hour >= from && h.hour < end);

			const probs = period.map((h) => h.precipProb).filter((p) => p !== undefined);
			// Коди опадів ідуть за зростанням сили: 51 мряка … 65 сильний дощ … 99 гроза з градом
			const wetCodes = period
				.filter((h) => h.precip > 0 && precipKind(h.code) !== null)
				.map((h) => h.code);

			return {
				...base,
				code: wetCodes.length ? Math.max(base.code, ...wetCodes) : base.code,
				precip: Math.round(period.reduce((sum, h) => sum + h.precip, 0) * 10) / 10,
				precipProb: probs.length ? Math.max(...probs) : undefined,
				gusts: Math.max(...period.map((h) => h.gusts)),
				now: isNow
			};
		});
}

// ——— Якість повітря й пилок ———

/** Європейський індекс якості повітря словами (шкала EEA) */
const AQI_TEXT_UK = [
	'добра',
	'задовільна',
	'помірна',
	'погана',
	'дуже погана',
	'надзвичайно погана'
];

export function aqiText(aqi: number, lang: Lang = 'uk'): string {
	const level = aqi <= 20 ? 0 : aqi <= 40 ? 1 : aqi <= 60 ? 2 : aqi <= 80 ? 3 : aqi <= 100 ? 4 : 5;
	return ((lang === 'ru' && ruPack()?.aqi) || AQI_TEXT_UK)[level];
}

/** Значення за години дня; години без даних пропускаються */
const valuesOf = (values: (number | null)[], air: AirQualityData, date: string): number[] =>
	values.filter((v, i): v is number => v !== null && air.time[i].startsWith(date));

/**
 * Індекс якості повітря для дня: сьогодні — поточна година, інші дні — найгірша година.
 * null — даних на цей день немає (прогноз якості повітря лише на 5 днів).
 */
export function dayAqi(air: AirQualityData, date: string, currentTime?: string): number | null {
	if (currentTime) {
		const value = air.european_aqi[air.time.indexOf(currentTime)];
		if (value != null) return Math.round(value);
	}
	const values = valuesOf(air.european_aqi, air, date);
	return values.length ? Math.round(Math.max(...values)) : null;
}

// Пилок: рослина і пороги «помірний» / «високий», зерен/м³. Пороги обережні —
// показуємо лише помітний пилок, щоб не лякати дрібницями. Назви — в описі дня (dayInsights)
export type PollenPlant = 'ragweed' | 'birch' | 'alder' | 'grass' | 'mugwort';
export type PollenLevel = 'moderate' | 'high';

const POLLEN = [
	{ key: 'ragweed_pollen', plant: 'ragweed', moderate: 10, high: 50 },
	{ key: 'birch_pollen', plant: 'birch', moderate: 10, high: 100 },
	{ key: 'alder_pollen', plant: 'alder', moderate: 10, high: 100 },
	{ key: 'grass_pollen', plant: 'grass', moderate: 10, high: 50 },
	{ key: 'mugwort_pollen', plant: 'mugwort', moderate: 10, high: 50 }
] as const;

/** Найпомітніший пилок дня або null, якщо жодного не багато */
export function dayPollen(
	air: AirQualityData,
	date: string
): { plant: PollenPlant; level: PollenLevel } | null {
	let best: { plant: PollenPlant; level: PollenLevel; ratio: number } | null = null;

	for (const p of POLLEN) {
		const values = valuesOf(air[p.key], air, date);
		const max = values.length ? Math.max(...values) : 0;
		if (max < p.moderate) continue;
		// Порівнюємо відносно порогу: 60 зерен амброзії важать більше, ніж 60 берези
		const ratio = max / p.high;
		if (!best || ratio > best.ratio) {
			best = { plant: p.plant, level: max >= p.high ? 'high' : 'moderate', ratio };
		}
	}
	return best && { plant: best.plant, level: best.level };
}

/** гПа → мм рт. ст. (так тиск звично показують в Україні) */
export const hpaToMmHg = (hpa: number) => Math.round(hpa * 0.750062);

/** Напрямок вітру словами: звідки дме */
const DIRECTIONS_UK = ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'];

export function windDirectionText(deg: number, lang: Lang = 'uk'): string {
	// Нормалізація: і −30°, і 390° дають коректний сектор 0…7
	const sector = ((Math.round(deg / 45) % 8) + 8) % 8;
	return ((lang === 'ru' && ruPack()?.directions) || DIRECTIONS_UK)[sector];
}

/** Оцінка УФ-індексу за шкалою ВООЗ */
const UV_TEXT_UK = ['низький', 'помірний', 'високий', 'дуже високий', 'екстремальний'];

export function uvText(uv: number, lang: Lang = 'uk'): string {
	return ((lang === 'ru' && ruPack()?.uv) || UV_TEXT_UK)[
		uv < 3 ? 0 : uv < 6 ? 1 : uv < 8 ? 2 : uv < 11 ? 3 : 4
	];
}

/**
 * Чи ця година темна: до сходу або після заходу сонця.
 * Час Open-Meteo в одному форматі (YYYY-MM-DDTHH:mm, Київ), тож рядки порівнюються напряму.
 */
export function isNightHour(time: string, sunrise?: string, sunset?: string): boolean {
	if (!sunrise || !sunset) {
		const hour = Number(time.slice(11, 13));
		return hour < 6 || hour >= 21;
	}
	return time < sunrise || time >= sunset;
}
