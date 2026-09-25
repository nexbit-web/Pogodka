import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { makeApiResponse, makeForecast, type HourOverrides } from '../fixtures/forecast';
import { buildForecastDays } from '$lib/weather';
import { describeDay } from '$lib/dayInsights';

/*
	Серверний рендер сторінки погоди: має бути швидким (це час до першого байта)
	і не падати на жодних даних, які може повернути Open-Meteo або старий кеш.
*/

vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

const WeatherLayout = (await import('$lib/components/shared/WeatherLayout.svelte')).default;

const renderPage = (weather = makeForecast()) =>
	render(WeatherLayout, { props: { data: makeApiResponse(weather) } }).body;

function timeIt(fn: () => void, runs: number) {
	for (let i = 0; i < 5; i++) fn(); // прогрів JIT
	const start = performance.now();
	for (let i = 0; i < runs; i++) fn();
	return (performance.now() - start) / runs;
}

describe('SSR сторінки погоди', () => {
	it('рендерить місто, 7 днів, таблицю, опис і рекламу', () => {
		const html = renderPage();

		expect(html).toContain('Харків');
		expect(html.match(/role="tab"/g)).toHaveLength(7);
		expect(html).toContain('<table');
		expect(html).toContain('<h3');
		expect(html).toContain('lilylook.store');
	});

	it.each<[string, (day: number, hr: number) => HourOverrides]>([
		['спека', () => ({ temp: 38, feels: 42, code: 0 })],
		['мороз і сніг', () => ({ temp: -25, feels: -32, code: 75, precip: 3 })],
		['гроза зі зливою', () => ({ code: 99, precip: 30, gusts: 28 })],
		['туман', () => ({ code: 48 })],
		['невідомий код погоди', () => ({ code: 42 })],
		['нульові значення', () => ({ temp: 0, feels: 0, wind: 0, gusts: 0, humidity: 0, pressure: 0 })]
	])('не падає на погоді «%s»', (_, hour) => {
		const html = renderPage(makeForecast({ hour }));
		expect(html).not.toMatch(/NaN|undefined|Infinity/);
	});

	it('не падає на старому кеші без необовʼязкових полів', () => {
		expect(renderPage(makeForecast({ legacy: true }))).not.toMatch(/NaN|undefined/);
	});

	it('не падає, коли прогноз застарів і сьогоднішнього дня в ньому немає', () => {
		const html = renderPage(makeForecast({ start: '2020-01-01' }));
		expect(html).not.toMatch(/NaN|undefined/);
		expect(html).not.toContain('Зараз');
	});

	it('не падає на короткому прогнозі', () => {
		expect(() => renderPage(makeForecast({ days: 1 }))).not.toThrow();
	});

	// Запас на повільні CI-машини та інструментування coverage; зазвичай 5–10 мс
	it('швидкий: сторінка рендериться в середньому до 30 мс', () => {
		const weather = makeForecast();
		const avg = timeIt(() => renderPage(weather), 50);
		expect(avg).toBeLessThan(30);
	});

	it('HTML компактний: сторінка погоди до 120 КБ', () => {
		expect(renderPage().length).toBeLessThan(120_000);
	});
});

describe('швидкість обробки даних', () => {
	// Зазвичай ~1 мс; запас — на паралельні потоки тестів і повільні CI-машини
	it('розбір тижневого прогнозу й опис усіх днів — до 5 мс', () => {
		const weather = makeForecast();
		const avg = timeIt(() => {
			const days = buildForecastDays(weather);
			days.forEach((day, i) => describeDay(day, 0, days[i - 1]));
		}, 200);
		expect(avg).toBeLessThan(5);
	});
});
