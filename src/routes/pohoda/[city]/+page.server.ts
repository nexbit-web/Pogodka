import { DateTime } from 'luxon';
import { findCity, getCityWeather } from '$lib/server/weather';
import { buildWeeklyDays, findCurrentHourIndex, getCurrentWeather, KYIV_TZ } from '$lib/weather';
import { SITE_URL } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const cityName = decodeURIComponent(params.city);

	// getCityWeather сам кине 404, якщо міста немає в БД
	const [weather, cityRecord] = await Promise.all([getCityWeather(cityName), findCity(cityName)]);

	const titleCity = cityRecord?.nameUa ?? cityName;
	const slug = cityRecord?.slug ?? cityName;

	// JSON-LD для пошукових систем
	const kievNow = DateTime.now().setZone(KYIV_TZ);
	const currentWeather = getCurrentWeather(weather.weather, findCurrentHourIndex(weather.weather));
	const weeklyDays = buildWeeklyDays(weather.weather);

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'City',
		name: weather.misto,
		url: `${SITE_URL}/pohoda/${slug}`,

		// Поточна погода
		weather: {
			'@type': 'WeatherForecast',
			datePosted: kievNow.toISO(),
			description: `Поточний прогноз погоди в місті ${weather.misto}`,
			temperature: {
				'@type': 'QuantitativeValue',
				value: currentWeather.temp,
				unitCode: 'CEL',
				name: 'Температура'
			},
			windSpeed: {
				'@type': 'QuantitativeValue',
				value: currentWeather.wind,
				unitCode: 'KMH',
				name: 'Швидкість вітру'
			},
			humidity: {
				'@type': 'QuantitativeValue',
				value: currentWeather.humidity,
				unitCode: 'P1',
				name: 'Вологість'
			},
			feelsLike: {
				'@type': 'QuantitativeValue',
				value: currentWeather.feels,
				unitCode: 'CEL',
				name: 'Відчувається як'
			}
		},

		// Прогноз на 7 днів
		dailyForecast: weeklyDays.map((day) => ({
			'@type': 'WeatherForecast',
			datePosted: day.date,
			description: `Прогноз погоди на ${day.date} в місті ${weather.misto}`,
			temperature: {
				'@type': 'QuantitativeValue',
				minValue: day.day.mintemp_c,
				maxValue: day.day.maxtemp_c,
				unitCode: 'CEL',
				name: 'Температура (мін/макс)'
			},
			weatherCode: day.day.code
		}))
	};

	return { weather, titleCity, slug, jsonLd };
};
