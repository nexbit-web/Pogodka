import { loadCityPage } from '$lib/server/cityPage';
import type { PageServerLoad } from './$types';

// Основна сторінка населеного пункту — прогноз на 7 днів
export const load: PageServerLoad = (event) => loadCityPage(event, 'week');
