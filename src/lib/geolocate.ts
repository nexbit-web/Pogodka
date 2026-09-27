/*
	«Погода там, де я зараз»: координати пристрою → найближчий населений пункт.
	Спільне для рядка в пошуку і плашки при першому візиті. Координати не зберігаються.
*/

import { messagesFor } from './i18n/messages';
import type { Lang } from './i18n';

const PROMPT_KEY = 'pogodka-geo-prompt';

/** Помилка з текстом, який можна показати людині як є */
export class GeoError extends Error {
	constructor(
		message: string,
		/** Людина заборонила доступ — пропонувати знову немає сенсу */
		readonly denied = false
	) {
		super(message);
	}
}

const position = () =>
	new Promise<GeolocationPosition>((resolve, reject) =>
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			// Для погоди досить точності до кількох кілометрів: швидше й економніше для батареї
			enableHighAccuracy: false,
			timeout: 10_000,
			maximumAge: 10 * 60_000
		})
	);

/** Адреса сторінки найближчого населеного пункту (path для /pohoda/{path}) */
export async function locateNearestCity(lang: Lang = 'uk'): Promise<string> {
	const t = messagesFor(lang);
	let coords: GeolocationCoordinates;
	try {
		coords = (await position()).coords;
	} catch (err) {
		if ((err as GeolocationPositionError).code === 1) {
			throw new GeoError(t.geoDenied, true);
		}
		throw new GeoError(t.geoRetry);
	}

	const res = await fetch(
		`/api/cities/nearest?lat=${coords.latitude.toFixed(4)}&lon=${coords.longitude.toFixed(4)}`
	).catch(() => null);

	if (res?.status === 404) throw new GeoError(t.geoNone);
	if (!res?.ok) throw new GeoError(t.geoCityFailed);
	return ((await res.json()) as { path: string }).path;
}

/** Плашку пропонуємо один раз і лише там, де геолокація можлива й не заборонена */
export async function shouldOfferGeolocation(): Promise<boolean> {
	try {
		if (!('geolocation' in navigator) || localStorage.getItem(PROMPT_KEY)) return false;
		const status = await navigator.permissions?.query({ name: 'geolocation' });
		return status?.state !== 'denied';
	} catch {
		return false;
	}
}

export function markGeoPromptSeen(): void {
	try {
		localStorage.setItem(PROMPT_KEY, '1');
	} catch {
		// Без сховища плашка просто зʼявиться ще раз
	}
}
