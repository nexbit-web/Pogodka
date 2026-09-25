import { getCityWeather } from '$lib/server/weather';
import type { PageServerLoad } from './$types';

// Головна сторінка — погода в Києві
export const load: PageServerLoad = async () => {
	return { weather: await getCityWeather('kyiv') };
};
