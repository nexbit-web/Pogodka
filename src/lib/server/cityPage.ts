import { error, redirect } from '@sveltejs/kit';
import { findCity, getForecast } from './weather';
import { nearbyCities } from './cities';
import {
	buildForecastDays,
	buildWeeklyDays,
	findCurrentHourIndex,
	getCurrentWeather
} from '$lib/weather';
import { kyivNow } from '$lib/date';
import { viewDays, viewSuffix, type ForecastView } from '$lib/forecastViews';
import { langFromPath, localize } from '$lib/i18n';
import { placeName, regionName } from '$lib/i18n/places';
import {
	breadcrumbLd,
	cityDescription,
	cityPageLd,
	cityTitle,
	crumbForecast,
	graph,
	shortRegion,
	viewDescription,
	viewPeriod,
	viewTitle,
	type CitySeoInput
} from '$lib/seo';

// Сторінку кешує CDN: 5 хвилин свіжа, ще пів години віддається, поки оновлюється у фоні.
// Швидка відповідь сервера — пряма вимога Core Web Vitals і краулінгового бюджету.
const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800';

/**
 * Дані сторінки населеного пункту: /pohoda/kyiv і /pohoda/kyiv/zavtra, /10-dniv, /vykhidni,
 * а також їхні російські версії під /ru.
 * Прогноз один на всі сторінки й мови — окремих запитів до Open-Meteo вони не додають.
 */
export async function loadCityPage(
	{
		params,
		url,
		setHeaders
	}: {
		params: { city: string };
		url: URL;
		setHeaders: (h: Record<string, string>) => void;
	},
	view: ForecastView
) {
	const lang = langFromPath(url.pathname);
	const city = await findCity(params.city);
	if (!city)
		error(404, lang === 'ru' ? 'Населённый пункт не найден' : 'Населений пункт не знайдено');

	const suffix = viewSuffix(view);
	const path = localize(`/pohoda/${city.path}${suffix}`, lang);

	// Одна сторінка — одна адреса: /pohoda/Lviv і /pohoda/Львів ведуть на /pohoda/lviv
	if (params.city !== city.path) {
		redirect(301, localize(`/pohoda/${encodeURIComponent(city.path)}${suffix}`, lang));
	}

	// Назви мовою сторінки: «Київ, Київська область» або «Киев, Киевская область»
	const name = placeName(city, lang);
	const region = regionName(city.region, lang);

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
		name,
		region,
		lang,
		path: city.path,
		slug: city.slug,
		now: { temp: current.temp, feels: current.feels, code: current.code },
		tomorrow: tomorrow && { min: tomorrow.day.mintemp_c, max: tomorrow.day.maxtemp_c }
	};

	let title: string;
	let description: string;
	if (view === 'week') {
		title = cityTitle(seoInput);
		description = cityDescription(seoInput);
	} else {
		const today = kyivNow().date;
		const upcoming = buildForecastDays(weather.weather).filter((d) => d.date >= today);
		title = viewTitle(seoInput, view);
		description = viewDescription(seoInput, view, viewDays(upcoming, view).days);
	}

	const crumbs = [
		{ name: crumbForecast(lang), path: localize('/', lang) },
		{ name: `Погода ${name}`, path: localize(`/pohoda/${city.path}`, lang) }
	];
	if (view !== 'week') {
		const period = viewPeriod(view, lang);
		crumbs.push({ name: period.charAt(0).toUpperCase() + period.slice(1), path });
	}

	const jsonLd = graph(
		breadcrumbLd(crumbs),
		cityPageLd({
			name,
			region,
			pagePath: path,
			lang,
			title,
			description,
			latitude: city.latitude,
			longitude: city.longitude,
			updated: new Date().toISOString()
		})
	);

	return {
		// Назва й область у шапці та підвалі — мовою сторінки
		weather: { ...weather, misto: name, oblast: region },
		view,
		city: { name, region, path: city.path },
		nearby: nearby.map((c) => ({
			name: placeName(c, lang),
			path: c.path,
			note: c.region === city.region ? `${c.distance} км` : shortRegion(regionName(c.region, lang))
		})),
		seo: { title, description, path, jsonLd }
	};
}
