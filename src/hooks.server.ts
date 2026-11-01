import type { Handle } from '@sveltejs/kit';
import { langFromPath } from '$lib/i18n';
import { registerRu } from '$lib/i18n/pack';
import { RU_PACK } from '$lib/i18n/ru';

// Сервер рендерить обидві мови, тож російські тексти підключаємо одразу
registerRu(RU_PACK);

/*
	Заголовки безпеки для кожної відповіді. Пошуковики враховують безпечність сайту,
	а браузери з ними не дають вбудувати сторінку чужим сайтам і вгадувати типи файлів.
*/
const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'SAMEORIGIN',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
	'Strict-Transport-Security': 'max-age=31536000'
};

/*
	Тимчасова недоступність (база чи Open-Meteo лежать, а в кеші сторінки ще немає).
	Retry-After каже пошуковикам «повернись пізніше» — сторінка лишається в індексі,
	тоді як дні помилок 500 Google сприймає як зниклий сайт.
	CDN тримає таку відповідь хвилину: шквал запитів під час збою не доходить до сервера,
	а після відновлення сторінка оживає щонайпізніше за хвилину.
*/
const UNAVAILABLE_HEADERS: Record<string, string> = {
	'Retry-After': '300',
	'Cache-Control': 'public, max-age=0, s-maxage=60'
};

export const handle: Handle = async ({ event, resolve }) => {
	// Мова сторінки — з адреси: /ru/… — російська, решта — українська
	const lang = langFromPath(event.url.pathname);
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});

	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}

	if (response.status === 503) {
		for (const [name, value] of Object.entries(UNAVAILABLE_HEADERS)) {
			response.headers.set(name, value);
		}
	}

	// Службовий JSON не повинен потрапляти в пошук, навіть якщо на нього хтось послався
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('X-Robots-Tag', 'noindex');
	}

	return response;
};
