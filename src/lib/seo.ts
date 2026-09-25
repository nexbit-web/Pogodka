import { SITE_NAME, SITE_URL, OG_IMAGE } from './config';
import { signed } from './dayInsights';
import { getWeatherText } from './weather';

/*
	Тексти для пошукових систем і соцмереж.
	Заголовок — до ~60 символів, головне слово на початку: «Погода Харків».
	Опис — живий: поточна погода робить сніпет помітнішим у видачі й підвищує CTR.
*/

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

/** «Сумська область» → «Сумська обл.» */
export const shortRegion = (region: string) => region.replace(/ область$/, ' обл.');

/** Сторінка однойменного населеного пункту має адресу з областю — тоді назву уточнюємо */
const needsRegion = (path: string, slug: string) => path !== slug;

export interface CitySeoInput {
	name: string;
	region: string;
	path: string;
	slug: string;
	now: { temp: number; feels: number; code: number };
	tomorrow?: { min: number; max: number };
}

export function cityTitle({ name, region, path, slug }: CitySeoInput): string {
	return needsRegion(path, slug)
		? `Погода ${name} (${shortRegion(region)}) — прогноз на 7 днів | ${SITE_NAME}`
		: `Погода ${name}: прогноз на сьогодні, завтра і 7 днів | ${SITE_NAME}`;
}

export function cityDescription({ name, region, path, slug, now, tomorrow }: CitySeoInput): string {
	const place = needsRegion(path, slug) ? `${name} (${shortRegion(region)})` : name;
	const current = `Погода ${place} зараз: ${signed(now.temp)}, ${getWeatherText(now.code).toLowerCase()}, відчувається як ${signed(now.feels)}.`;
	const next = tomorrow ? ` Завтра від ${signed(tomorrow.min)} до ${signed(tomorrow.max)}.` : '';
	return `${current}${next} Точний прогноз на 7 днів по годинах: температура, опади, вітер, тиск і вологість.`;
}

export const HOME_TITLE = `Погода в Україні — точний прогноз погоди на 7 днів | ${SITE_NAME}`;
export const HOME_DESCRIPTION =
	'Прогноз погоди для кожного міста й села України: погода зараз, на сьогодні, завтра і 7 днів по годинах — температура, опади, вітер, тиск, вологість, схід і захід сонця.';

// ——— Структуровані дані schema.org ———

type Ld = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationLd(): Ld {
	return {
		'@type': 'Organization',
		'@id': ORGANIZATION_ID,
		name: SITE_NAME,
		url: SITE_URL,
		logo: {
			'@type': 'ImageObject',
			url: absoluteUrl('/icon-512x512.png'),
			width: 512,
			height: 512
		},
		sameAs: ['https://www.youtube.com/@Pogodka-UA']
	};
}

export function websiteLd(): Ld {
	return {
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		name: SITE_NAME,
		alternateName: 'Погодка',
		url: SITE_URL,
		inLanguage: 'uk',
		publisher: { '@id': ORGANIZATION_ID },
		// Сторінка /pohoda/{назва} знаходить населений пункт за будь-якою назвою
		potentialAction: {
			'@type': 'SearchAction',
			target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/pohoda/{search_term_string}` },
			'query-input': 'required name=search_term_string'
		}
	};
}

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: absoluteUrl(item.path)
		}))
	};
}

export interface CityPageLdInput {
	name: string;
	region: string;
	path: string;
	title: string;
	description: string;
	latitude: number;
	longitude: number;
	/** Час, на який актуальний прогноз, ISO */
	updated: string;
}

/** Сторінка прогнозу як WebPage про конкретне місце з координатами */
export function cityPageLd(input: CityPageLdInput): Ld {
	const url = absoluteUrl(`/pohoda/${input.path}`);
	const isCapital = input.region === input.name;

	return {
		'@type': 'WebPage',
		'@id': `${url}#webpage`,
		url,
		name: input.title,
		description: input.description,
		inLanguage: 'uk',
		isPartOf: { '@id': WEBSITE_ID },
		dateModified: input.updated,
		primaryImageOfPage: absoluteUrl(OG_IMAGE),
		about: {
			'@type': 'Place',
			name: input.name,
			geo: {
				'@type': 'GeoCoordinates',
				latitude: input.latitude,
				longitude: input.longitude
			},
			address: {
				'@type': 'PostalAddress',
				addressLocality: input.name,
				...(isCapital ? {} : { addressRegion: input.region }),
				addressCountry: 'UA'
			},
			...(isCapital
				? {}
				: { containedInPlace: { '@type': 'AdministrativeArea', name: input.region } })
		}
	};
}

/** Кілька сутностей в одному блоці — через @graph, як рекомендує Google */
export const graph = (...items: Ld[]): Ld => ({
	'@context': 'https://schema.org',
	'@graph': items
});

/** JSON-LD для вставки в <script>: «<» екрановано, щоб дані не могли закрити тег */
export const serializeLd = (data: Ld) => JSON.stringify(data).replace(/</g, '\\u003c');
