import { loadCityPage } from '$lib/server/cityPage';
import type { ViewSlug } from '$lib/forecastViews';
import type { PageServerLoad } from './$types';

// /pohoda/kyiv/zavtra, /10-dniv, /vykhidni — адресу вже перевірив матчер src/params/view.ts
export const load: PageServerLoad = (event) => loadCityPage(event, event.params.view as ViewSlug);
