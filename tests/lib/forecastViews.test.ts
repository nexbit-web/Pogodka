import { describe, expect, it } from 'vitest';
import { isViewSlug, viewDays, viewSuffix } from '$lib/forecastViews';
import { match } from '../../src/params/view';
import { buildForecastDays } from '$lib/weather';
import { makeForecast } from '../fixtures/forecast';

// 27 вересня 2026 — неділя
const days = buildForecastDays(makeForecast({ start: '2026-09-27', days: 10 }));

describe('сторінки прогнозу', () => {
	it('лише три адреси другого рівня', () => {
		expect(['zavtra', '10-dniv', 'vykhidni'].every((v) => match(v))).toBe(true);
		expect(match('week')).toBe(false);
		expect(match('foo')).toBe(false);
		expect(isViewSlug('ZAVTRA')).toBe(false);
	});

	it('адреса сторінки', () => {
		expect(viewSuffix('week')).toBe('');
		expect(viewSuffix('zavtra')).toBe('/zavtra');
	});

	it('7 днів і «на завтра» — перші 7, завтра обране', () => {
		expect(viewDays(days, 'week').days).toHaveLength(7);
		expect(viewDays(days, 'week').initial).toBe(0);
		expect(viewDays(days, 'zavtra').days).toHaveLength(7);
		expect(viewDays(days, 'zavtra').initial).toBe(1);
	});

	it('10 днів — усі десять', () => {
		expect(viewDays(days, '10-dniv').days).toHaveLength(10);
	});

	it('вихідні — лише субота й неділя з найближчих 10 днів', () => {
		expect(viewDays(days, 'vykhidni').days.map((d) => d.date)).toEqual([
			'2026-09-27',
			'2026-10-03',
			'2026-10-04'
		]);
	});

	it('короткий прогноз не ламає вибір', () => {
		expect(viewDays(days.slice(0, 1), 'zavtra').initial).toBe(0);
		expect(viewDays([], 'zavtra').days).toEqual([]);
		// Без вихідних у прогнозі — звичайний тиждень, а не порожня сторінка
		expect(viewDays(days.slice(1, 5), 'vykhidni').days).toHaveLength(4);
	});
});
