import { isWeekend } from './date';
import type { ForecastDay } from './types';

/*
	Сторінки прогнозу для одного населеного пункту — під те, як люди шукають погоду:
	«погода Київ», «…на завтра», «…на 10 днів», «…на вихідні».
	Дані ті самі (один запит і один кеш на місто), різниться лише, які дні показуємо і який обрано.
*/

export const VIEW_SLUGS = ['zavtra', '10-dniv', 'vykhidni'] as const;
export type ViewSlug = (typeof VIEW_SLUGS)[number];
export type ForecastView = 'week' | ViewSlug;

export const isViewSlug = (value: string): value is ViewSlug =>
	(VIEW_SLUGS as readonly string[]).includes(value);

/** Порядок перемикача над стрічкою днів; підписи — у словнику (i18n/messages: views) */
export const VIEWS: ForecastView[] = ['week', ...VIEW_SLUGS];

/** Кінцівка адреси: /pohoda/kyiv + /zavtra */
export const viewSuffix = (view: ForecastView) => (view === 'week' ? '' : `/${view}`);

/**
 * Які дні показати і який обрати одразу.
 * days — прогноз від сьогодні (до 10 днів).
 */
export function viewDays(
	days: ForecastDay[],
	view: ForecastView
): {
	days: ForecastDay[];
	initial: number;
} {
	switch (view) {
		case 'zavtra': {
			const week = days.slice(0, 7);
			return { days: week, initial: Math.min(1, week.length - 1) };
		}
		case '10-dniv':
			return { days: days.slice(0, 10), initial: 0 };
		case 'vykhidni': {
			// Найближчі вихідні й наступні: 2–4 дні, субота й неділя
			const weekend = days.slice(0, 10).filter((d) => isWeekend(d.date));
			return weekend.length > 0
				? { days: weekend, initial: 0 }
				: { days: days.slice(0, 7), initial: 0 };
		}
		default:
			return { days: days.slice(0, 7), initial: 0 };
	}
}
