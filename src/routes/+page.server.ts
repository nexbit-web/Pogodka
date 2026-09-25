import { findCity, getForecast } from '$lib/server/weather';
import { REGIONS } from '$lib/server/regions';
import { graph, organizationLd, shortRegion, websiteLd } from '$lib/seo';
import type { PageServerLoad } from './$types';

const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800';

// Посилання на столицю й обласні центри: головна — вхідна точка для людей і роботів
const CENTRES = [
	{ name: 'Київ', path: 'kyiv', note: 'столиця' },
	...REGIONS.filter((r) => r.centre !== 'Київ').map((r) => ({
		name: r.centre,
		path: r.centreSlug,
		note: shortRegion(r.name)
	}))
];

// Головна сторінка — погода в Києві
export const load: PageServerLoad = async ({ setHeaders }) => {
	// Столиця описана в коді, тож запиту до бази тут немає
	const city = (await findCity('kyiv'))!;
	const weather = await getForecast(city);

	setHeaders({ 'cache-control': CACHE });

	return {
		weather,
		centres: CENTRES,
		jsonLd: graph(organizationLd(), websiteLd())
	};
};
