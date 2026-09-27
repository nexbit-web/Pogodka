import { SITE_URL } from '$lib/config';
import { LANGS, localize } from '$lib/i18n';
import { VIEW_SLUGS } from '$lib/forecastViews';
import { cityPageCount, cityPathsSlice } from './cities';
import { REGIONS } from './regions';

/*
	Карта сайту: індекс /sitemap.xml і файли /sitemaps/1.xml, /sitemaps/2.xml…
	Лежить поза /api/, бо robots.txt закриває /api/ від роботів.
	Google приймає до 50 000 адрес у файлі, але беремо 1 000: файл швидко віддається,
	а з бази читається лише його частина населених пунктів.

	Кожна перекладена сторінка — двома записами, українською й російською, і в обох
	посилання hreflang на обидві версії: так Google рекомендує описувати мовні версії.
*/

export const URLS_PER_FILE = 1_000;

type Changefreq = 'hourly' | 'daily' | 'monthly';

export interface SitemapEntry {
	loc: string;
	priority: string;
	changefreq: Changefreq;
	/** Мовні версії сторінки, разом із нею самою; немає — сторінка лише українською */
	alternates?: { hreflang: string; href: string }[];
}

const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

/** Сторінка обома мовами: два записи з однаковим набором hreflang */
function bothLanguages(path: string, priority: string, changefreq: Changefreq): SitemapEntry[] {
	const alternates = [
		...LANGS.map((l) => ({ hreflang: l.hreflang, href: absolute(localize(path, l.id)) })),
		{ hreflang: 'x-default', href: absolute(path) }
	];
	return LANGS.map((l) => ({
		loc: absolute(localize(path, l.id)),
		priority,
		changefreq,
		alternates
	}));
}

/*
	Сторінки поза списком населених пунктів. «На завтра», «на 10 днів», «на вихідні» —
	лише для столиці й обласних центрів: це найчастіші запити. Для сіл ці сторінки
	пошуковик знайде за посиланнями перемикача, а карта не множить адреси вчетверо
	(кожен обхід незакешованої сторінки — запит до Open-Meteo з денним лімітом).
*/
const CENTRE_SLUGS = [
	'kyiv',
	...REGIONS.filter((r) => r.centreSlug !== 'kyiv').map((r) => r.centreSlug)
];

const STATIC_PAGES: SitemapEntry[] = [
	...bothLanguages('/', '1.0', 'hourly'),
	{ loc: absolute('/about'), priority: '0.5', changefreq: 'monthly' },
	...CENTRE_SLUGS.flatMap((slug) =>
		VIEW_SLUGS.flatMap((view) => bothLanguages(`/pohoda/${slug}/${view}`, '0.7', 'hourly'))
	)
];

/** Записів на один населений пункт: українська й російська сторінки */
const PER_CITY = LANGS.length;

/** Скільки файлів у карті сайту — для індексу досить одного підрахунку рядків */
export async function sitemapFileCount(): Promise<number> {
	const total = STATIC_PAGES.length + (await cityPageCount()) * PER_CITY;
	return Math.max(1, Math.ceil(total / URLS_PER_FILE));
}

/**
 * Адреси одного файлу карти сайту (index від 0): спершу головна, «Про нас» і сторінки
 * обласних центрів, далі населені пункти — кожен двома мовами поспіль.
 */
export async function sitemapChunk(index: number): Promise<SitemapEntry[]> {
	const start = index * URLS_PER_FILE;
	const end = start + URLS_PER_FILE;
	const statics = STATIC_PAGES.slice(start, end);

	// Записи населених пунктів ідуть парами — читаємо з бази лише ті, що потрапляють у файл
	const from = Math.max(0, start - STATIC_PAGES.length);
	const to = end - STATIC_PAGES.length;
	if (to <= 0) return statics;

	const firstCity = Math.floor(from / PER_CITY);
	const lastCity = Math.ceil(to / PER_CITY);
	const paths = await cityPathsSlice(firstCity, lastCity - firstCity);

	const cities = paths
		.flatMap((path, i) =>
			// Столиця — вище за інші населені пункти
			bothLanguages(
				`/pohoda/${encodeURIComponent(path)}`,
				firstCity + i === 0 ? '0.9' : '0.8',
				'hourly'
			)
		)
		.slice(from - firstCity * PER_CITY, to - firstCity * PER_CITY);

	return [...statics, ...cities];
}

const escapeXml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderIndex(files: number, lastmod: string): string {
	const items = Array.from(
		{ length: files },
		(_, i) =>
			`<sitemap><loc>${SITE_URL}/sitemaps/${i + 1}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`
	).join('');
	return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
}

export function renderUrlset(entries: SitemapEntry[], lastmod: string): string {
	const items = entries
		.map((e) => {
			const links = (e.alternates ?? [])
				.map(
					(a) =>
						`<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${escapeXml(a.href)}"/>`
				)
				.join('');
			return `<url><loc>${escapeXml(e.loc)}</loc>${links}<lastmod>${lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`;
		})
		.join('');
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${items}</urlset>`;
}

export const SITEMAP_HEADERS = {
	'Content-Type': 'application/xml; charset=utf-8',
	// Список міст змінюється рідко: CDN тримає добу
	'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
};

/** Дата прогнозу змінюється щогодини, тож lastmod — поточна дата */
export const today = () => new Date().toISOString().slice(0, 10);
