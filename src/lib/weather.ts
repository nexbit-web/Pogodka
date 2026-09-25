import { DateTime } from 'luxon';
import type { CurrentWeather, OpenMeteoWeather, WeeklyDay } from './types';

export const KYIV_TZ = 'Europe/Kyiv';

/** Індекс години в масиві hourly, що відповідає поточній годині у Києві. */
export function findCurrentHourIndex(weather: OpenMeteoWeather): number {
	const kievNow = DateTime.now().setZone(KYIV_TZ);
	const today = kievNow.toISODate()!;
	const currentHour = kievNow.hour;

	return weather.hourly.time.findIndex((time) => {
		const hour = DateTime.fromISO(time, { zone: KYIV_TZ }).hour;
		return time.startsWith(today) && hour === currentHour;
	});
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
	3: 'Пасмурно',
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

/** id символу в /icons.svg за кодом Open-Meteo. */
export function getWeatherIconId(code: number): string {
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

/** CSS-змінна з кольором іконки для конкретних погодних умов. */
export function getConditionTint(code: number): string {
	const id = getWeatherIconId(code);

	switch (id) {
		case 'clear':
			return 'var(--w-sun)';
		case 'partly-cloudy':
			return 'var(--w-sun)';
		case 'cloudy':
			return 'var(--w-cloud)';
		case 'fog':
			return 'var(--w-fog)';
		case 'drizzle':
		case 'rain':
			return 'var(--w-rain)';
		case 'snow':
		case 'snowfall':
			return 'var(--w-snow)';
		case 'thunderstorm':
		case 'thunderstorm-hail':
			return 'var(--w-storm)';
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
