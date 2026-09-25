import { describe, expect, it } from 'vitest';
import { daylight, describeDay, signed } from '$lib/dayInsights';
import { buildForecastDays } from '$lib/weather';
import { makeForecast, type HourOverrides } from '../fixtures/forecast';
import type { ForecastDay } from '$lib/types';

/** Один день прогнозу з потрібними погодинними умовами */
function day(hour: (hr: number) => HourOverrides = () => ({}), start = '2026-09-25'): ForecastDay {
	return buildForecastDays(makeForecast({ start, days: 1, hour: (_, hr) => hour(hr) }))[0];
}

/** Кілька днів поспіль — щоб перевірити різноманітність формулювань */
function days(count: number, hour: (hr: number) => HourOverrides = () => ({})) {
	return buildForecastDays(
		makeForecast({ start: '2026-01-01', days: count, hour: (_, hr) => hour(hr) })
	);
}

describe('signed', () => {
	it.each([
		[10, '+10°'],
		[0.4, '0°'],
		[-0.4, '0°'],
		[0, '0°'],
		[-3, '−3°'],
		[17.6, '+18°'],
		[-12.5, '−12°']
	])('%d → %s', (temp, text) => {
		expect(signed(temp)).toBe(text);
	});

	it('мінус — типографський, а не дефіс', () => {
		expect(signed(-5)).not.toContain('-');
	});
});

describe('daylight', () => {
	it('рахує тривалість світлового дня', () => {
		expect(daylight('2026-09-25T06:25', '2026-09-25T18:26')).toBe('12 год 1 хв');
		expect(daylight('2026-06-21T04:47', '2026-06-21T21:13')).toBe('16 год 26 хв');
	});
});

describe('describeDay', () => {
	it('завжди повертає заголовок і текст', () => {
		const story = describeDay(day());
		expect(story.title.length).toBeGreaterThan(5);
		expect(story.text.length).toBeGreaterThan(20);
		expect(story.title[0]).toBe(story.title[0].toUpperCase());
	});

	it('детермінований: той самий день — той самий текст (сервер і браузер збігаються)', () => {
		const d = day();
		expect(describeDay(d)).toEqual(describeDay(d));
	});

	it('сусідні дні звучать по-різному', () => {
		const texts = new Set(days(14).map((d) => describeDay(d).text));
		expect(texts.size).toBeGreaterThan(3);
	});

	it('ясний теплий день без вітру — сонячний і з порадою прогулятись', () => {
		const story = describeDay(day(() => ({ code: 0, temp: 22, feels: 22 })));
		expect(story.title).toMatch(/сонячний|ясний/);
		expect(story.text).toMatch(/Небо чисте|Сонце світитиме/);
		expect(story.text).toMatch(/прогулянки|побути надворі/);
		expect(story.text).toMatch(/Опадів не передбачається|без опадів|сухо/);
	});

	it('характер дня залежить від температури', () => {
		expect(describeDay(day(() => ({ temp: 33 }))).title).toMatch(/спекотний/i);
		expect(describeDay(day(() => ({ temp: -8 }))).title).toMatch(/^Морозний/);
		expect(describeDay(day(() => ({ temp: 2 }))).title).toMatch(/^Холодний/);
	});

	it('описує зміну погоди протягом дня', () => {
		const story = describeDay(
			day((hr) => ({ code: hr < 12 ? 3 : hr < 18 ? 0 : 63, precip: hr >= 18 ? 0.6 : 0 }))
		);
		expect(story.text).toMatch(/^Вночі та вранці/);
		expect(story.text).toContain('вдень розвидниться');
		expect(story.text).toMatch(/а ввечері (пройде дощ|дощитиме)/);
	});

	it('вказує, коли і скільки опадів, і радить парасольку', () => {
		const story = describeDay(day((hr) => (hr >= 14 && hr < 17 ? { code: 63, precip: 1.2 } : {})));
		expect(story.text).toContain('приблизно з 14:00 до 17:00');
		expect(story.text).toContain('до 3,6 мм');
		expect(story.text).toMatch(/парасольк/);
	});

	it('коротка злива близько однієї години', () => {
		const story = describeDay(day((hr) => (hr === 15 ? { code: 65, precip: 16 } : {})));
		expect(story.text).toContain('Злива очікується близько 15:00');
	});

	it('дощ до півночі пише «до 0:00», а не «до 24:00»', () => {
		const story = describeDay(day((hr) => (hr >= 21 ? { code: 61, precip: 0.3 } : {})));
		expect(story.text).toContain('до 0:00');
		expect(story.text).not.toContain('24:00');
	});

	it('сніг попереджає про слизькі дороги', () => {
		const story = describeDay(day(() => ({ code: 73, precip: 0.4, temp: -2 })));
		expect(story.text).toMatch(/Сніг|снігопад/);
		expect(story.text).toContain('Дороги можуть бути слизькими');
	});

	it('гроза називається грозою', () => {
		const story = describeDay(day((hr) => (hr >= 15 && hr < 18 ? { code: 95, precip: 2 } : {})));
		expect(story.text).toContain('Гроза');
	});

	it('мряку не міряє в міліметрах', () => {
		const story = describeDay(day((hr) => (hr < 10 ? { code: 51, precip: 0.1 } : {})));
		expect(story.text).toContain('Мряка очікується');
		expect(story.text).not.toMatch(/Мряка[^.]*мм/);
	});

	it('попереджає про сильний і поривчастий вітер', () => {
		expect(describeDay(day(() => ({ gusts: 18 }))).text).toContain('пориви до 18 м/с');
		expect(describeDay(day(() => ({ gusts: 12 }))).text).toMatch(/12 м\/с/);
	});

	it('пояснює, чому надворі холодніше, ніж на термометрі', () => {
		const windy = describeDay(day(() => ({ temp: 5, feels: 0, wind: 7 })));
		expect(windy.text).toContain('Через вітер');

		const damp = describeDay(day(() => ({ temp: 5, feels: 0, wind: 1 })));
		expect(damp.text).toContain('Через вологість');
	});

	it('порівнює з попереднім днем, якщо різниця помітна', () => {
		const [first, second] = buildForecastDays(
			makeForecast({ days: 2, hour: (d) => ({ temp: d === 0 ? 10 : 16 }) })
		);
		expect(describeDay(second, 0, first).text).toContain('на 6° тепліше, ніж напередодні');
		expect(describeDay(first, 0, second).text).toContain('на 6° холодніше');
	});

	it('незначну різницю з попереднім днем не згадує', () => {
		const [first, second] = buildForecastDays(
			makeForecast({ days: 2, hour: (d) => ({ temp: d === 0 ? 10 : 11 }) })
		);
		expect(describeDay(second, 0, first).text).not.toContain('напередодні');
	});

	it('попереджає про ранковий туман на дорогах', () => {
		const story = describeDay(day((hr) => (hr >= 5 && hr <= 9 ? { code: 45 } : { code: 0 })));
		expect(story.text).toContain('туман');
		expect(story.text).toContain('погана видимість');
	});

	it('попереджає про заморозки', () => {
		const story = describeDay(day((hr) => ({ temp: hr < 8 ? -1 : 6 })));
		expect(story.text).toContain('заморозки');
	});

	describe('сьогоднішній день', () => {
		it('враховує лише години, що попереду', () => {
			// Зранку дощ, після обіду ясно — о 15:00 про ранковий дощ говорити пізно
			const d = day((hr) => (hr < 12 ? { code: 63, precip: 1 } : { code: 0 }));
			const story = describeDay(d, 15);
			expect(story.text).not.toMatch(/Дощ|дощ/);
			expect(story.text).toContain('До ночі похолоднішає');
		});

		it('увечері пише «вечір», а не «сонячний вечір»', () => {
			const story = describeDay(
				day(() => ({ code: 0 })),
				19
			);
			expect(story.title).toMatch(/вечір$/);
			expect(story.title).not.toContain('сонячний');
		});

		it('не падає, коли день уже майже скінчився', () => {
			expect(() => describeDay(day(), 23)).not.toThrow();
			expect(() => describeDay(day(), 24)).not.toThrow();
		});
	});

	it('не падає на дні без погодинних даних', () => {
		const empty: ForecastDay = {
			date: '2026-09-25',
			code: 0,
			min: 5,
			max: 10,
			precipSum: 0,
			hours: []
		};
		expect(() => describeDay(empty)).not.toThrow();
	});

	it('жодних undefined, NaN чи подвійних пробілів у тексті за будь-якої погоди', () => {
		const codes = [0, 1, 2, 3, 45, 51, 61, 63, 65, 71, 73, 75, 80, 85, 95, 99];
		for (const code of codes) {
			for (const temp of [-15, 0, 12, 25, 34]) {
				for (const fromHour of [0, 10, 16, 20]) {
					const { title, text } = describeDay(
						day(() => ({ code, temp, precip: code >= 51 ? 1 : 0, gusts: 11 })),
						fromHour
					);
					const all = `${title} ${text}`;
					expect(all, `код ${code}, ${temp}°, з ${fromHour}:00`).not.toMatch(
						/undefined|NaN|null|\{|\s{2}/
					);
					expect(text.trim().endsWith('.')).toBe(true);
				}
			}
		}
	});
});
