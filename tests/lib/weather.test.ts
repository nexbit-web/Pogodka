import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildForecastDays,
	buildWeeklyDays,
	findCurrentHourIndex,
	getConditionTint,
	getCurrentWeather,
	getTempColor,
	getWeatherIconId,
	getWeatherText,
	hpaToMmHg,
	isNightHour,
	uvText,
	windDirectionText,
	buildTableSlots
} from '$lib/weather';
import { makeForecast } from '../fixtures/forecast';

// Усі коди погоди, які описує WMO і повертає Open-Meteo
const WMO_CODES = [
	0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
	95, 96, 99
];

describe('findCurrentHourIndex', () => {
	afterEach(() => vi.useRealTimers());

	it('знаходить поточну годину за київським часом', () => {
		// 25 вересня, 14:20 у Києві (UTC+3)
		vi.useFakeTimers({ now: new Date('2026-09-25T11:20:00Z') });
		const weather = makeForecast({ start: '2026-09-25' });

		const idx = findCurrentHourIndex(weather);
		expect(weather.hourly.time[idx]).toBe('2026-09-25T14:00');
	});

	it('враховує перехід через північ у Києві, коли в UTC ще вчора', () => {
		// 23:30 UTC 25-го = 02:30 26-го в Києві
		vi.useFakeTimers({ now: new Date('2026-09-25T23:30:00Z') });
		const weather = makeForecast({ start: '2026-09-25' });

		expect(weather.hourly.time[findCurrentHourIndex(weather)]).toBe('2026-09-26T02:00');
	});

	it('повертає -1, якщо прогноз застарів і сьогоднішнього дня в ньому немає', () => {
		vi.useFakeTimers({ now: new Date('2026-09-25T11:00:00Z') });
		const weather = makeForecast({ start: '2026-09-01', days: 3 });

		expect(findCurrentHourIndex(weather)).toBe(-1);
	});
});

describe('getCurrentWeather', () => {
	const weather = makeForecast({
		start: '2026-09-25',
		hour: (day, hr) =>
			day === 0 && hr === 10 ? { temp: 17.4, feels: 15, code: 61, humidity: 55 } : {}
	});

	it('бере значення потрібної години', () => {
		const current = getCurrentWeather(weather, 10);
		expect(current).toMatchObject({ temp: 17.4, feels: 15, code: 61, humidity: 55 });
	});

	it('переводить видимість у кілометри', () => {
		expect(getCurrentWeather(weather, 10).visibility).toBe(20);
	});

	it('при індексі -1 не падає, а бере першу годину', () => {
		expect(getCurrentWeather(weather, -1).temp).toBe(weather.hourly.temperature_2m[0]);
	});

	it('віддає нулі, а не undefined, коли масиви порожні', () => {
		const empty = makeForecast({ days: 0 });
		const current = getCurrentWeather(empty, 5);
		for (const value of Object.values(current)) expect(value).toBe(0);
	});
});

describe('buildWeeklyDays', () => {
	it('збирає 7 днів з кодом і мін/макс', () => {
		const weather = makeForecast({ start: '2026-09-25' });
		const days = buildWeeklyDays(weather);

		expect(days).toHaveLength(7);
		expect(days[0]).toEqual({
			date: '2026-09-25',
			day: {
				code: weather.daily.weathercode[0],
				mintemp_c: weather.daily.temperature_2m_min[0],
				maxtemp_c: weather.daily.temperature_2m_max[0]
			}
		});
	});
});

describe('getWeatherText', () => {
	it('має український опис для кожного коду WMO, крім 56/57', () => {
		for (const code of WMO_CODES.filter((c) => c !== 56 && c !== 57)) {
			expect(getWeatherText(code), `код ${code}`).not.toBe('Невідомо');
		}
	});

	it('для невідомого коду пише «Невідомо»', () => {
		expect(getWeatherText(1234)).toBe('Невідомо');
	});
});

describe('getWeatherIconId', () => {
	it('для кожного коду WMO є іконка', () => {
		for (const code of WMO_CODES) {
			expect(getWeatherIconId(code), `код ${code}`).not.toBe('unknown');
		}
	});

	it.each([
		[0, 'clear'],
		[1, 'partly-cloudy'],
		[3, 'cloudy'],
		[45, 'fog'],
		[53, 'drizzle'],
		[63, 'rain'],
		[81, 'rain'],
		[73, 'snow'],
		[86, 'snowfall'],
		[95, 'thunderstorm'],
		[99, 'thunderstorm-hail']
	])('код %i → %s', (code, id) => {
		expect(getWeatherIconId(code)).toBe(id);
	});

	it('вночі замість сонця — місяць', () => {
		expect(getWeatherIconId(0, true)).toBe('clear-night');
		expect(getWeatherIconId(2, true)).toBe('partly-cloudy-night');
		expect(getWeatherIconId(51, true)).toBe('drizzle-night');
	});

	it('іконки без сонця вночі не змінюються', () => {
		for (const code of [3, 45, 63, 73, 86, 95, 99]) {
			expect(getWeatherIconId(code, true)).toBe(getWeatherIconId(code));
		}
	});
});

describe('getConditionTint', () => {
	it('кольорові лише ясне небо і дощ, решта — сіра', () => {
		expect(getConditionTint(0)).toBe('var(--w-sun)');
		expect(getConditionTint(0, true)).toBe('var(--w-moon)');
		expect(getConditionTint(63)).toBe('var(--primary)');
		expect(getConditionTint(53, true)).toBe('var(--primary)');

		for (const code of [1, 2, 3, 45, 73, 86, 95, 99]) {
			expect(getConditionTint(code), `код ${code}`).toBe('var(--w-cloud)');
		}
	});
});

describe('getTempColor', () => {
	it('обрізає значення за межами шкали', () => {
		expect(getTempColor(-50)).toBe(getTempColor(-30));
		expect(getTempColor(60)).toBe(getTempColor(35));
	});

	it('на опорних точках дає точний колір', () => {
		expect(getTempColor(0)).toBe('rgb(100 210 255)');
		expect(getTempColor(35)).toBe('rgb(255 69 58)');
	});

	it('між опорними точками інтерполює', () => {
		expect(getTempColor(5)).toBe('rgb(98 212 208)');
	});

	it('завжди повертає валідний rgb()', () => {
		for (let t = -40; t <= 45; t += 0.5) {
			expect(getTempColor(t)).toMatch(/^rgb\(\d{1,3} \d{1,3} \d{1,3}\)$/);
		}
	});
});

describe('buildForecastDays', () => {
	it('групує години за днями та переносить добові підсумки', () => {
		const weather = makeForecast({ start: '2026-09-25' });
		const days = buildForecastDays(weather);

		expect(days).toHaveLength(7);
		for (const day of days) {
			expect(day.hours).toHaveLength(24);
			expect(day.hours.every((h) => h.time.startsWith(day.date))).toBe(true);
		}
		expect(days[0]).toMatchObject({
			date: '2026-09-25',
			sunrise: '2026-09-25T06:30',
			sunset: '2026-09-25T18:30',
			uvMax: 3
		});
		expect(days[0].hours[13].hour).toBe(13);
	});

	it('працює зі старим кешем без необовʼязкових полів', () => {
		const days = buildForecastDays(makeForecast({ legacy: true }));

		expect(days[0].sunrise).toBeUndefined();
		expect(days[0].precipProbMax).toBeUndefined();
		expect(days[0].hours[0].precipProb).toBeUndefined();
		expect(days[0].hours).toHaveLength(24);
	});

	it('день без погодинних даних отримує порожній список, а не падає', () => {
		const weather = makeForecast({ days: 2 });
		weather.daily.time.push('2099-01-01');
		const days = buildForecastDays(weather);

		expect(days.at(-1)?.hours).toEqual([]);
	});
});

describe('hpaToMmHg', () => {
	it('переводить гПа в мм рт. ст.', () => {
		expect(hpaToMmHg(1013.25)).toBe(760);
		expect(hpaToMmHg(1000)).toBe(750);
	});
});

describe('windDirectionText', () => {
	it.each([
		[0, 'Пн'],
		[44, 'ПнСх'],
		[90, 'Сх'],
		[180, 'Пд'],
		[270, 'Зх'],
		[337, 'ПнЗх'],
		[359, 'Пн'],
		[360, 'Пн']
	])('%i° → %s', (deg, text) => {
		expect(windDirectionText(deg)).toBe(text);
	});
});

describe('uvText', () => {
	it.each([
		[0, 'низький'],
		[2.9, 'низький'],
		[3, 'помірний'],
		[6, 'високий'],
		[8, 'дуже високий'],
		[11, 'екстремальний']
	])('УФ %d → %s', (uv, text) => {
		expect(uvText(uv)).toBe(text);
	});
});

describe('isNightHour', () => {
	const sunrise = '2026-09-25T06:48';
	const sunset = '2026-09-25T18:50';

	it('до сходу і після заходу — ніч', () => {
		expect(isNightHour('2026-09-25T03:00', sunrise, sunset)).toBe(true);
		expect(isNightHour('2026-09-25T06:00', sunrise, sunset)).toBe(true);
		expect(isNightHour('2026-09-25T21:00', sunrise, sunset)).toBe(true);
	});

	it('між сходом і заходом — день', () => {
		expect(isNightHour('2026-09-25T09:00', sunrise, sunset)).toBe(false);
		expect(isNightHour('2026-09-25T18:00', sunrise, sunset)).toBe(false);
	});

	it('без даних про сонце вважає ніччю 21:00–6:00', () => {
		expect(isNightHour('2026-09-25T05:00')).toBe(true);
		expect(isNightHour('2026-09-25T06:00')).toBe(false);
		expect(isNightHour('2026-09-25T20:00')).toBe(false);
		expect(isNightHour('2026-09-25T21:00')).toBe(true);
	});
});

describe('buildTableSlots — колонки погодинної таблиці', () => {
	// Реальний випадок (Роздільна, 25.09): дощ 0,1 мм лише о 16:00, між колонками 15:00 і 18:00
	const hours = () =>
		buildForecastDays(
			makeForecast({
				start: '2026-09-25',
				days: 1,
				hour: (_, hr) =>
					hr === 16
						? { code: 61, precip: 0.1, precipProb: 5 }
						: hr === 17
							? { code: 3, precipProb: 10 }
							: { code: 3, precip: 0, precipProb: 0 }
			})
		)[0].hours;

	it('кожні 3 години, 8 колонок', () => {
		expect(buildTableSlots(hours()).map((s) => s.hour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
	});

	it('опади між колонками не губляться: сума, найбільша ймовірність і іконка дощу', () => {
		const at15 = buildTableSlots(hours()).find((s) => s.hour === 15)!;

		expect(at15.precip).toBe(0.1);
		expect(at15.precipProb).toBe(10);
		expect(at15.code).toBe(61);
		// Сусідня колонка лишається сухою
		expect(buildTableSlots(hours()).find((s) => s.hour === 18)!.precip).toBe(0);
	});

	it('колонка «Зараз» — саме поточна година, ті самі дані, що й у шапці', () => {
		const list = hours();
		const slots = buildTableSlots(list, 20);
		const now = slots.find((s) => s.now)!;
		const hour20 = list.find((h) => h.hour === 20)!;

		expect(slots.filter((s) => s.now)).toHaveLength(1);
		expect(now.time).toBe('2026-09-25T20:00');
		expect(now.temp).toBe(hour20.temp);
		expect(now.feels).toBe(hour20.feels);
		// Порядок колонок не порушується: 15:00 → зараз (20:00) → 21:00
		expect(slots.map((s) => s.hour)).toEqual([0, 3, 6, 9, 12, 15, 20, 21]);
	});

	it('опади колонки «Зараз» рахуються від поточної години, минулі не підмішуються', () => {
		const now = buildTableSlots(hours(), 17).find((s) => s.now)!;
		// 16:00 з дощем уже минула: у колонці лише 17:00
		expect(now.hour).toBe(17);
		expect(now.precip).toBe(0);
		expect(now.code).toBe(3);
	});

	it('без поточної години (інший день) колонки «Зараз» немає', () => {
		expect(buildTableSlots(hours()).some((s) => s.now)).toBe(false);
	});
});

describe('findCurrentHourIndex — явна година', () => {
	it('бере передану годину, а не системний час', () => {
		const weather = makeForecast({ start: '2026-09-25' });
		const idx = findCurrentHourIndex(weather, { date: '2026-09-26', hour: 7 });
		expect(weather.hourly.time[idx]).toBe('2026-09-26T07:00');
	});
});
