import { error, redirect } from '@sveltejs/kit';
import { findCity, getForecast } from '$lib/server/weather';
import { nearbyCities } from '$lib/server/cities';
import { buildWeeklyDays, findCurrentHourIndex, getCurrentWeather } from '$lib/weather';
import {
	breadcrumbLd,
	cityDescription,
	cityPageLd,
	cityTitle,
	graph,
	shortRegion,
	type CitySeoInput
} from '$lib/seo';
import type { PageServerLoad } from './$types';

// Сторінку кешує CDN: 5 хвилин свіжа, ще пів години віддається, поки оновлюється у фоні.
// Швидка відповідь сервера — пряма вимога Core Web Vitals і краулінгового бюджету.
const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const city = await findCity(params.city);
	if (!city) error(404, 'Населений пункт не знайдено');

	// Одна сторінка — одна адреса: /pohoda/Lviv і /pohoda/Львів ведуть на /pohoda/lviv
	if (params.city !== city.path) redirect(301, `/pohoda/${encodeURIComponent(city.path)}`);

	const [weather, nearby] = await Promise.all([
		getForecast(city),
		// Блок «Погода поруч» — не критичний: без нього сторінка все одно має відкритися
		nearbyCities(city).catch((err) => {
			console.error(`[nearby] Не вдалося знайти сусідів для "${city.path}":`, err);
			return [];
		})
	]);

	setHeaders({ 'cache-control': CACHE });

	const current = getCurrentWeather(weather.weather, findCurrentHourIndex(weather.weather));
	const tomorrow = buildWeeklyDays(weather.weather)[1];

	const seoInput: CitySeoInput = {
		name: city.nameUa,
		region: city.region,
		path: city.path,
		slug: city.slug,
		now: { temp: current.temp, feels: current.feels, code: current.code },
		tomorrow: tomorrow && { min: tomorrow.day.mintemp_c, max: tomorrow.day.maxtemp_c }
	};
	const title = cityTitle(seoInput);
	const description = cityDescription(seoInput);

	const jsonLd = graph(
		breadcrumbLd([
			{ name: 'Прогноз погоди', path: '/' },
			{ name: `Погода ${city.nameUa}`, path: `/pohoda/${city.path}` }
		]),
		cityPageLd({
			name: city.nameUa,
			region: city.region,
			path: city.path,
			title,
			description,
			latitude: city.latitude,
			longitude: city.longitude,
			updated: new Date().toISOString()
		})
	);

	return {
		weather,
		city: { name: city.nameUa, region: city.region, path: city.path },
		nearby: nearby.map((c) => ({
			name: c.nameUa,
			path: c.path,
			note: c.region === city.region ? `${c.distance} км` : shortRegion(c.region)
		})),
		seo: { title, description, jsonLd }
	};
};
