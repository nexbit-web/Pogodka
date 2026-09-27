import { findCity, getForecast } from '$lib/server/weather';
import { REGIONS } from '$lib/server/regions';
import { langFromPath, localize, type Lang } from '$lib/i18n';
import { centreName, placeName, regionName } from '$lib/i18n/places';
import { graph, homeDescription, homeTitle, organizationLd, websiteLd } from '$lib/seo';
import type { PageServerLoad } from './$types';

const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800';

// Посилання на столицю й обласні центри: головна — вхідна точка для людей і роботів.
// Столиця першою, далі за абеткою мови сторінки. Область не підписуємо:
// «Вінниця — Вінницька обл.» нічого не додає
const centres = (lang: Lang) => [
	{ name: centreName('Київ', lang), path: 'kyiv' },
	...REGIONS.filter((r) => r.centre !== 'Київ')
		.map((r) => ({ name: centreName(r.centre, lang), path: r.centreSlug }))
		.sort((a, b) => a.name.localeCompare(b.name, lang))
];

// Головна сторінка — погода в Києві; /ru — те саме російською
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const lang = langFromPath(url.pathname);
	// Столиця описана в коді, тож запиту до бази тут немає
	const city = (await findCity('kyiv'))!;
	const weather = await getForecast(city);

	setHeaders({ 'cache-control': CACHE });

	return {
		weather: {
			...weather,
			misto: placeName(city, lang),
			oblast: regionName(city.region, lang)
		},
		centres: centres(lang),
		seo: { title: homeTitle(lang), description: homeDescription(lang), path: localize('/', lang) },
		jsonLd: graph(organizationLd(), websiteLd())
	};
};
