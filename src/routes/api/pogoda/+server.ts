import { json } from '@sveltejs/kit';
import { getCityWeather } from '$lib/server/weather';
import type { RequestHandler } from './$types';

// Публічний ендпоінт погоди. Сторінки використовують getCityWeather напряму,
// цей роут лишається для зовнішніх споживачів.
export const GET: RequestHandler = async ({ url }) => {
	const cityName = url.searchParams.get('city');

	if (!cityName) {
		return json({ error: 'Не вказано місто' }, { status: 400 });
	}

	return json(await getCityWeather(cityName));
};
