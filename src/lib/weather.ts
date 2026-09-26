import { KYIV_TZ, kyivNow } from './date';
import type {
	AirQualityData,
	CurrentWeather,
	DayHour,
	ForecastDay,
	OpenMeteoWeather,
	WeeklyDay
} from './types';

export { KYIV_TZ };

/** Індекс години в масиві hourly, що відповідає поточній годині у Києві. */
export function findCurrentHourIndex(
	weather: OpenMeteoWeather,
	{ date, hour }: { date: string; hour: number } = kyivNow()
): number {
	// Час Open-Meteo вже київський: «2026-09-25T14:00»
	return weather.hourly.time.indexOf(`${date}T${String(hour).padStart(2, '0')}:00`);
}

export function getCurrentWeather(weather: OpenMeteoWeather, hourIndex: number): CurrentWeather {
	const index = hourIndex >= 0 ? hourIndex : 0;

	const {
		temperature_2m,
		apparent_temperature,
		dewpoint_2m,
		weathercode,
		relativehumidity_2m,
		windspeed_10m,
		windgusts_10m,
		winddirection_10m,
		visibility,
		precipitation,
		surface_pressure,
		pressure_msl
	} = weather.hourly;

	return {
		temp: temperature_2m[index] ?? 0, // Поточна температура (°C)
		feels: apparent_temperature[index] ?? 0, // "Відчувається як" температура (°C)
		dewPoint: dewpoint_2m?.[index] ?? 0, // Точка роси (°C)
		code: weathercode[index] ?? 0, // Код погоди (для іконок)
		humidity: relativehumidity_2m[index] ?? 0, // Відносна вологість (%)
		wind: windspeed_10m[index] ?? 0, // Швидкість вітру (м/с)
		windDir: winddirection_10m?.[index] ?? 0, // Напрямок вітру (градуси)
		gusts: windgusts_10m[index] ?? 0, // Пориви вітру (м/с)
		visibility: (visibility?.[index] ?? 0) / 1000, // Видимість (км)
		precipitation: precipitation?.[index] ?? 0, // Опади (мм)
		pressure: surface_pressure?.[index] ?? pressure_msl?.[index] ?? 0 // Тиск (гПа)
	};
}

/** 7-денний прогноз у форматі, зручному для компонентів. */
export function buildWeeklyDays(weather: OpenMeteoWeather): WeeklyDay[] {
	return weather.daily.time.map((date, idx) => ({
		date,
		day: {
			code: weather.daily.weathercode[idx] ?? 0,
			mintemp_c: weather.daily.temperature_2m_min[idx] ?? 0,
			maxtemp_c: weather.daily.temperature_2m_max[idx] ?? 0
		}
	}));
}

const WEATHER_TEXT: Record<number, string> = {
	0: 'Ясно',
	1: 'Майже ясно',
	2: 'Частково хмарно',
	3: 'Похмуро',
	45: 'Туман',
	48: 'Інеєвий туман',
	51: 'Легка мряка',
	53: 'Мряка',
	55: 'Сильна мряка',
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
};

export function getWeatherText(code: number): string {
	return WEATHER_TEXT[code] || 'Невідомо';
}

// Іконки, в яких є сонце: вночі замість нього малюємо місяць
const NIGHT_ICONS = new Set(['clear', 'partly-cloudy', 'drizzle']);

/** id символу в /icons.svg за кодом Open-Meteo. Вночі — версія з місяцем. */
export function getWeatherIconId(code: number, night = false): string {
	const id = dayIconId(code);
	return night && NIGHT_ICONS.has(id) ? `${id}-night` : id;
}

function dayIconId(code: number): string {
	// 0 — повністю ясне небо
	if (code === 0) return 'clear';
	// 1,2 — малохмарно / змінна хмарність
	if ([1, 2].includes(code)) return 'partly-cloudy';
	// 3 — суцільна хмарність
	if (code === 3) return 'cloudy';
	// 45,48 — туман або туман з паморозню
	if ([45, 48].includes(code)) return 'fog';
	// 51,53,55 — мряка
	if ([51, 53, 55].includes(code)) return 'drizzle';
	// 56,57 крижана мряка; 61-67 дощ; 80-82 зливи — одна іконка "дощ"
	if ([56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
	// 71,73,75 — сніг; 77 — сніжні зерна
	if ([71, 73, 75, 77].includes(code)) return 'snow';
	// 85,86 — снігопади
	if ([85, 86].includes(code)) return 'snowfall';
	// 95 — гроза без граду
	if (code === 95) return 'thunderstorm';
	// 96,99 — гроза з градом
	if ([96, 99].includes(code)) return 'thunderstorm-hail';
	return 'unknown';
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
export function representativeDayCode(
	apiCode: number,
	hours: DayHour[],
	precipSum: number,
	precipProbMax?: number,
	sunrise?: string,
	sunset?: string
): number {
	const notable = precipSum >= NOTABLE_PRECIP_MM || (precipProbMax ?? 0) >= NOTABLE_PRECIP_PROB;
	if (apiCode >= 51 && notable) return apiCode;

	if (hours.length === 0) return apiCode >= 51 ? 3 : apiCode;
	// Світлова частина дня; для вечора, коли вона вже минула, — усі години
	const light = hours.filter((h) => !isNightHour(h.time, sunrise, sunset));
	const daytime = light.length ? light : hours;

	// Туман — лише якщо тримався хоча б пів світлового дня
	const fog = daytime.filter((h) => h.code === 45 || h.code === 48);
	if (fog.length * 2 >= daytime.length) return fog[0].code;

	// Інакше — медіана хмарності (0 ясно … 3 похмуро): «середина» дня, а не його частина.
	// Туман і години з незначними опадами рахуються як похмурі
	const sky = daytime.map((h) => (h.code <= 3 ? h.code : 3)).sort((x, y) => x - y);
	return sky[Math.floor(sky.length / 2)];
}

/** Дні прогнозу з погодинними даними, згруповані за датою (час Open-Meteo вже київський). */
export function buildForecastDays(weather: OpenMeteoWeather): ForecastDay[] {
	const h = weather.hourly;
	const d = weather.daily;
	const byDate = new Map<string, DayHour[]>();

	h.time.forEach((time, i) => {
		const date = time.slice(0, 10);
		const hour: DayHour = {
			time,
			hour: Number(time.slice(11, 13)),
			temp: h.temperature_2m[i] ?? 0,
			feels: h.apparent_temperature[i] ?? 0,
			code: h.weathercode[i] ?? 0,
			precip: h.precipitation?.[i] ?? 0,
			precipProb: h.precipitation_probability?.[i],
			wind: h.windspeed_10m?.[i] ?? 0,
			gusts: h.windgusts_10m?.[i] ?? 0,
			windDir: h.winddirection_10m?.[i] ?? 0,
			humidity: h.relativehumidity_2m?.[i] ?? 0,
			pressure: h.pressure_msl?.[i] ?? 0
		};
		const list = byDate.get(date) ?? [];
		list.push(hour);
		byDate.set(date, list);
	});

	return d.time.map((date, i) => {
		const hours = byDate.get(date) ?? [];
		const precipSum = d.precipitation_sum?.[i] ?? 0;
		const precipProbMax = d.precipitation_probability_max?.[i];
		const sunrise = d.sunrise?.[i];
		const sunset = d.sunset?.[i];

		return {
			date,
			code: representativeDayCode(
				d.weathercode[i] ?? 0,
				hours,
				precipSum,
				precipProbMax,
				sunrise,
				sunset
			),
			min: d.temperature_2m_min[i] ?? 0,
			max: d.temperature_2m_max[i] ?? 0,
			precipSum,
			precipProbMax,
			sunrise,
			sunset,
			uvMax: d.uv_index_max?.[i],
			hours
		};
	});
}

// Назва опадів за кодом погоди — для рядка «Дощ почнеться близько 15:00»
function precipWord(code: number): string {
	if (code >= 95) return 'Гроза';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Сніг';
	if (code >= 51 && code <= 57) return 'Мряка';
	return 'Дощ';
}

/**
 * Найближчі опади на кілька годин уперед — щоб одразу знати, чи брати парасольку:
 * «Дощ почнеться близько 15:00», «Дощ закінчиться близько 17:00».
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
): string | null {
	const { time, precipitation, weathercode } = weather.hourly;
	if (hourIndex < 0 || !precipitation) return null;

	const wet = (i: number) => (precipitation[i] ?? 0) > 0 && (weathercode[i] ?? 0) >= 51;
	// «15:00» без нуля попереду, як у таблиці
	const at = (i: number) => time[i]?.slice(11, 16).replace(/^0/, '');
	const now = hourIndex + 1;
	const last = Math.min(hourIndex + horizon, time.length - 1);

	if (wet(now)) {
		const word = precipWord(weathercode[now]);
		for (let i = now + 1; i <= last; i++) {
			if (!wet(i)) return `${word} закінчиться близько ${at(i - 1)}`;
		}
		return `${word} триватиме ще кілька годин`;
	}

	for (let i = now + 1; i <= last; i++) {
		if (wet(i)) return `${precipWord(weathercode[i])} почнеться близько ${at(i - 1)}`;
	}
	return null;
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

			const probs = period.flatMap((h) => (h.precipProb === undefined ? [] : [h.precipProb]));
			// Коди опадів ідуть за зростанням сили: 51 мряка … 65 сильний дощ … 99 гроза з градом
			const wetCodes = period.filter((h) => h.precip > 0 && h.code >= 51).map((h) => h.code);

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
export function aqiText(aqi: number): string {
	if (aqi <= 20) return 'добра';
	if (aqi <= 40) return 'задовільна';
	if (aqi <= 60) return 'помірна';
	if (aqi <= 80) return 'погана';
	if (aqi <= 100) return 'дуже погана';
	return 'надзвичайно погана';
}

const hoursOf = (air: AirQualityData, date: string) =>
	air.time.flatMap((t, i) => (t.startsWith(date) ? [i] : []));

/**
 * Індекс якості повітря для дня: сьогодні — поточна година, інші дні — найгірша година.
 * null — даних на цей день немає (прогноз якості повітря лише на 5 днів).
 */
export function dayAqi(air: AirQualityData, date: string, currentTime?: string): number | null {
	if (currentTime) {
		const value = air.european_aqi[air.time.indexOf(currentTime)];
		if (value != null) return Math.round(value);
	}
	const values = hoursOf(air, date).flatMap((i) => air.european_aqi[i] ?? []);
	return values.length ? Math.round(Math.max(...values)) : null;
}

// Пилок: назва і пороги «помірний» / «високий», зерен/м³. Пороги обережні —
// показуємо лише помітний пилок, щоб не лякати дрібницями
const POLLEN = [
	{ key: 'ragweed_pollen', name: 'Амброзія', moderate: 10, high: 50 },
	{ key: 'birch_pollen', name: 'Береза', moderate: 10, high: 100 },
	{ key: 'alder_pollen', name: 'Вільха', moderate: 10, high: 100 },
	{ key: 'grass_pollen', name: 'Злаки', moderate: 10, high: 50 },
	{ key: 'mugwort_pollen', name: 'Полин', moderate: 10, high: 50 }
] as const;

/** Найпомітніший пилок дня або null, якщо жодного не багато */
export function dayPollen(
	air: AirQualityData,
	date: string
): { name: string; level: 'помірний' | 'високий' } | null {
	const hours = hoursOf(air, date);
	let best: { name: string; level: 'помірний' | 'високий'; ratio: number } | null = null;

	for (const p of POLLEN) {
		const values = hours.flatMap((i) => air[p.key][i] ?? []);
		const max = values.length ? Math.max(...values) : 0;
		if (max < p.moderate) continue;
		// Порівнюємо відносно порогу: 60 зерен амброзії важать більше, ніж 60 берези
		const ratio = max / p.high;
		if (!best || ratio > best.ratio) {
			best = { name: p.name, level: max >= p.high ? 'високий' : 'помірний', ratio };
		}
	}
	return best && { name: best.name, level: best.level };
}

/** гПа → мм рт. ст. (так тиск звично показують в Україні) */
export const hpaToMmHg = (hpa: number) => Math.round(hpa * 0.750062);

/** Напрямок вітру словами: звідки дме */
export function windDirectionText(deg: number) {
	const directions = ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'];
	return directions[Math.round(deg / 45) % 8];
}

/** Оцінка УФ-індексу за шкалою ВООЗ */
export function uvText(uv: number) {
	if (uv < 3) return 'низький';
	if (uv < 6) return 'помірний';
	if (uv < 8) return 'високий';
	if (uv < 11) return 'дуже високий';
	return 'екстремальний';
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
