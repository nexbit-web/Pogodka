import { DateTime } from 'luxon';
import type { OpenMeteoWeather, WeatherApiResponse } from '$lib/types';

export interface HourOverrides {
	temp?: number;
	feels?: number;
	code?: number;
	precip?: number;
	precipProb?: number;
	wind?: number;
	gusts?: number;
	windDir?: number;
	humidity?: number;
	pressure?: number;
}

export interface ForecastOptions {
	/** Перший день прогнозу, YYYY-MM-DD (за замовчуванням — сьогодні в Києві) */
	start?: string;
	days?: number;
	/** Підміна значень конкретної години: (день, година) → поля */
	hour?: (day: number, hour: number) => HourOverrides;
	/** Без необовʼязкових полів — як у старому кеші */
	legacy?: boolean;
}

export const todayKyiv = () => DateTime.now().setZone('Europe/Kyiv').toISODate()!;

/**
 * Реалістичний прогноз у форматі Open-Meteo: добовий хід температури,
 * схід о 06:30, захід о 18:30. Будь-яку годину можна перевизначити.
 */
export function makeForecast(options: ForecastOptions = {}): OpenMeteoWeather {
	const {
		start = todayKyiv(),
		days = 7,
		hour = (): HourOverrides => ({}),
		legacy = false
	} = options;
	const first = DateTime.fromISO(start, { zone: 'Europe/Kyiv' });

	const h = {
		time: [] as string[],
		temperature_2m: [] as number[],
		apparent_temperature: [] as number[],
		weathercode: [] as number[],
		windspeed_10m: [] as number[],
		windgusts_10m: [] as number[],
		winddirection_10m: [] as number[],
		relativehumidity_2m: [] as number[],
		dewpoint_2m: [] as number[],
		visibility: [] as number[],
		precipitation: [] as number[],
		pressure_msl: [] as number[],
		precipitation_probability: [] as number[]
	};
	const d = {
		time: [] as string[],
		temperature_2m_max: [] as number[],
		temperature_2m_min: [] as number[],
		precipitation_sum: [] as number[],
		precipitation_probability_max: [] as number[],
		weathercode: [] as number[],
		sunrise: [] as string[],
		sunset: [] as string[],
		uv_index_max: [] as number[]
	};

	for (let day = 0; day < days; day++) {
		const date = first.plus({ days: day }).toISODate()!;
		const temps: number[] = [];
		let precipSum = 0;
		let probMax = 0;
		let dayCode = 0;

		for (let hr = 0; hr < 24; hr++) {
			// Мінімум о 5:00, максимум о 15:00
			const base = 12 + 6 * Math.sin(((hr - 9) / 24) * 2 * Math.PI);
			const o = hour(day, hr);
			const temp = o.temp ?? Math.round(base * 10) / 10;
			const code = o.code ?? 2;
			const precip = o.precip ?? 0;
			const prob = o.precipProb ?? 0;

			h.time.push(`${date}T${String(hr).padStart(2, '0')}:00`);
			h.temperature_2m.push(temp);
			h.apparent_temperature.push(o.feels ?? temp - 1);
			h.weathercode.push(code);
			h.windspeed_10m.push(o.wind ?? 3);
			h.windgusts_10m.push(o.gusts ?? 6);
			h.winddirection_10m.push(o.windDir ?? 270);
			h.relativehumidity_2m.push(o.humidity ?? 70);
			h.dewpoint_2m.push(temp - 5);
			h.visibility.push(20000);
			h.precipitation.push(precip);
			h.pressure_msl.push(o.pressure ?? 1013);
			h.precipitation_probability.push(prob);

			temps.push(temp);
			precipSum += precip;
			probMax = Math.max(probMax, prob);
			dayCode = Math.max(dayCode, code);
		}

		d.time.push(date);
		d.temperature_2m_max.push(Math.max(...temps));
		d.temperature_2m_min.push(Math.min(...temps));
		d.precipitation_sum.push(Math.round(precipSum * 10) / 10);
		d.precipitation_probability_max.push(probMax);
		d.weathercode.push(dayCode);
		d.sunrise.push(`${date}T06:30`);
		d.sunset.push(`${date}T18:30`);
		d.uv_index_max.push(3);
	}

	if (legacy) {
		const hourly: OpenMeteoWeather['hourly'] = { ...h };
		delete hourly.precipitation_probability;
		return {
			hourly,
			daily: {
				time: d.time,
				temperature_2m_max: d.temperature_2m_max,
				temperature_2m_min: d.temperature_2m_min,
				precipitation_sum: d.precipitation_sum,
				weathercode: d.weathercode
			}
		};
	}

	return { hourly: h, daily: d };
}

export function makeApiResponse(
	weather: OpenMeteoWeather = makeForecast(),
	overrides: Partial<WeatherApiResponse> = {}
): WeatherApiResponse {
	return {
		misto: 'Харків',
		oblast: 'Харківська область',
		kraina: 'Україна',
		latitude: 49.99,
		longitude: 36.23,
		path: 'kharkiv',
		weather,
		...overrides
	};
}
