import type { Handle } from '@sveltejs/kit';

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

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}

	// Службовий JSON не повинен потрапляти в пошук, навіть якщо на нього хтось послався
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('X-Robots-Tag', 'noindex');
	}

	return response;
};
