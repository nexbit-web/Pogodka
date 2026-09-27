import { SITE_NAME, SITE_URL, OG_IMAGE } from './config';
import { signed } from './dayInsights';
import { getWeatherText } from './weather';
import { dayOfMonth, isoWeekday, monthName, weekdayName } from './date';
import type { ViewSlug } from './forecastViews';
import type { ForecastDay } from './types';
import type { Lang } from './i18n';

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
	/** Назва й область — уже потрібною мовою */
	name: string;
	region: string;
	path: string;
	slug: string;
	now: { temp: number; feels: number; code: number };
	tomorrow?: { min: number; max: number };
	lang?: Lang;
}

// Тексти для видачі кожною мовою. Заголовок — до ~60 символів, «Погода …» на початку
const TEXT = {
	uk: {
		cityTitle: (place: string) => `Погода ${place}: прогноз на сьогодні, завтра і 7 днів`,
		cityTitleRegion: (place: string) => `Погода ${place} — прогноз на 7 днів`,
		now: 'зараз',
		feels: 'відчувається як',
		tomorrow: 'Завтра',
		range: (min: string, max: string) => `від ${min} до ${max}`,
		cityTail: 'Точний прогноз на 7 днів по годинах: температура, опади, вітер, тиск і вологість.',
		views: {
			zavtra: { title: 'на завтра — прогноз по годинах', period: 'на завтра' },
			'10-dniv': { title: 'на 10 днів — точний прогноз', period: 'на 10 днів' },
			vykhidni: { title: 'на вихідні — субота й неділя', period: 'на вихідні' }
		},
		tail: 'Температура, опади, вітер, тиск і вологість по годинах.',
		tenTail:
			'Прогноз по днях і годинах — температура, опади, вітер, тиск, вологість, схід і захід сонця.',
		hourly: 'Прогноз по годинах.',
		today: 'сьогодні',
		nextWeekend: 'наступні вихідні',
		// Назва сайту — першою: головна має знаходитися за запитами «pogodka» і «погодка».
		// Загальні запити «погода в Україні» закривають сторінки міст
		homeTitle: `${SITE_NAME} (Погодка) — прогноз погоди в Україні на 7 днів`,
		homeDescription:
			'Прогноз погоди для кожного міста й села України: погода зараз, на сьогодні, завтра і 7 днів по годинах — температура, опади, вітер, тиск, вологість, схід і захід сонця.',
		crumbForecast: 'Прогноз погоди'
	},
	ru: {
		cityTitle: (place: string) => `Погода ${place}: прогноз на сегодня, завтра и 7 дней`,
		cityTitleRegion: (place: string) => `Погода ${place} — прогноз на 7 дней`,
		now: 'сейчас',
		feels: 'ощущается как',
		tomorrow: 'Завтра',
		range: (min: string, max: string) => `от ${min} до ${max}`,
		cityTail:
			'Точный прогноз на 7 дней по часам: температура, осадки, ветер, давление и влажность.',
		views: {
			zavtra: { title: 'на завтра — прогноз по часам', period: 'на завтра' },
			'10-dniv': { title: 'на 10 дней — точный прогноз', period: 'на 10 дней' },
			vykhidni: { title: 'на выходные — суббота и воскресенье', period: 'на выходные' }
		},
		tail: 'Температура, осадки, ветер, давление и влажность по часам.',
		tenTail:
			'Прогноз по дням и часам — температура, осадки, ветер, давление, влажность, восход и закат солнца.',
		hourly: 'Прогноз по часам.',
		today: 'сегодня',
		nextWeekend: 'следующие выходные',
		homeTitle: `${SITE_NAME} (Погодка) — прогноз погоды в Украине на 7 дней`,
		homeDescription:
			'Прогноз погоды для каждого города и села Украины: погода сейчас, на сегодня, завтра и 7 дней по часам — температура, осадки, ветер, давление, влажность, восход и закат солнца.',
		crumbForecast: 'Прогноз погоды'
	}
} satisfies Record<Lang, unknown>;

export const homeTitle = (lang: Lang = 'uk') => TEXT[lang].homeTitle;
export const homeDescription = (lang: Lang = 'uk') => TEXT[lang].homeDescription;
export const crumbForecast = (lang: Lang = 'uk') => TEXT[lang].crumbForecast;
/** «на завтра», «на выходные» — для хлібних крихт і соцмереж */
export const viewPeriod = (view: ViewSlug, lang: Lang = 'uk') => TEXT[lang].views[view].period;

const placeName = ({ name, region, path, slug }: CitySeoInput) =>
	needsRegion(path, slug) ? `${name} (${shortRegion(region)})` : name;

export function cityTitle(input: CitySeoInput): string {
	const t = TEXT[input.lang ?? 'uk'];
	const place = placeName(input);
	const title = needsRegion(input.path, input.slug) ? t.cityTitleRegion(place) : t.cityTitle(place);
	return `${title} | ${SITE_NAME}`;
}

export function cityDescription(input: CitySeoInput): string {
	const lang = input.lang ?? 'uk';
	const t = TEXT[lang];
	const { now, tomorrow } = input;
	const current = `Погода ${placeName(input)} ${t.now}: ${signed(now.temp)}, ${getWeatherText(now.code, lang).toLowerCase()}, ${t.feels} ${signed(now.feels)}.`;
	const next = tomorrow
		? ` ${t.tomorrow} ${t.range(signed(tomorrow.min), signed(tomorrow.max))}.`
		: '';
	return `${current}${next} ${t.cityTail}`;
}

// ——— Сторінки «на завтра», «на 10 днів», «на вихідні» ———

/** «Погода Київ на завтра — прогноз по годинах | Pogodka» */
export function viewTitle(input: CitySeoInput, view: ViewSlug): string {
	return `Погода ${placeName(input)} ${TEXT[input.lang ?? 'uk'].views[view].title} | ${SITE_NAME}`;
}

/**
 * Опис із самим прогнозом — щоб людина бачила відповідь ще у видачі:
 * «Погода Київ на завтра, 28 вересня: від +10° до +19°, похмуро…»
 * days — дні, які показує сторінка (для вихідних — лише субота й неділя)
 */
export function viewDescription(input: CitySeoInput, view: ViewSlug, days: ForecastDay[]): string {
	const lang = input.lang ?? 'uk';
	const t = TEXT[lang];
	const place = placeName(input);
	const period = t.views[view].period;
	const range = (min: number, max: number) => t.range(signed(min), signed(max));
	const dateText = (iso: string) => `${dayOfMonth(iso)} ${monthName(iso, lang)}`;
	const skyText = (day: ForecastDay) => getWeatherText(day.code, lang).toLowerCase();

	if (days.length === 0) return `Погода ${place} ${period}. ${t.tail}`;

	if (view === 'zavtra') {
		const day = days[Math.min(1, days.length - 1)];
		return `Погода ${place} ${period}, ${dateText(day.date)}: ${range(day.min, day.max)}, ${skyText(day)}. ${t.tail}`;
	}

	if (view === '10-dniv') {
		const min = Math.min(...days.map((d) => d.min));
		const max = Math.max(...days.map((d) => d.max));
		return `Погода ${place} ${period}: ${range(min, max)}. ${t.tenTail}`;
	}

	// Вихідні: найближчі субота й неділя. Якщо сьогодні неділя — вона і наступні вихідні,
	// а не «неділя 27 вересня; субота 3 жовтня», наче це одні вихідні
	const part = (d: ForecastDay) =>
		`${weekdayName(d.date, false, lang)} ${dateText(d.date)} — ${range(d.min, d.max)}, ${skyText(d)}`;
	const [first, second, third] = days;
	if (first && isoWeekday(first.date) === 7) {
		const next = [second, third].filter(Boolean);
		const later = next.length
			? `; ${t.nextWeekend} — ${range(Math.min(...next.map((d) => d.min)), Math.max(...next.map((d) => d.max)))}`
			: '';
		return `Погода ${place} ${period}: ${t.today} ${part(first)}${later}. ${t.hourly}`;
	}
	const weekend = second ? `${part(first)}; ${part(second)}` : part(first);
	return `Погода ${place} ${period}: ${weekend}. ${t.hourly}`;
}

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
		// Як сайт можуть шукати: кирилицею, з доменом, з країною — Google бере це для назви сайту у видачі
		alternateName: ['Погодка', 'pogodka.org', 'Pogodka UA'],
		url: SITE_URL,
		inLanguage: ['uk', 'ru'],
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
	/** Повна адреса сторінки: /pohoda/kyiv/zavtra, /ru/pohoda/kyiv */
	pagePath: string;
	lang?: Lang;
	title: string;
	description: string;
	latitude: number;
	longitude: number;
	/** Час, на який актуальний прогноз, ISO */
	updated: string;
}

/** Сторінка прогнозу як WebPage про конкретне місце з координатами */
export function cityPageLd(input: CityPageLdInput): Ld {
	const url = absoluteUrl(input.pagePath);
	const isCapital = input.region === input.name;

	return {
		'@type': 'WebPage',
		'@id': `${url}#webpage`,
		url,
		name: input.title,
		description: input.description,
		inLanguage: input.lang ?? 'uk',
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
