import { SITE_URL } from '$lib/config';
import { cityPageCount, cityPathsSlice } from './cities';

/*
	Карта сайту: індекс /sitemap.xml і файли /sitemaps/1.xml, /sitemaps/2.xml…
	Лежить поза /api/, бо robots.txt закриває /api/ від роботів.
	Google приймає до 50 000 адрес у файлі, але беремо 1 000: файл важить ~150 КБ
	і швидко відкривається, а з бази читається лише його частина населених пунктів.
*/

export const URLS_PER_FILE = 1_000;

// Сторінки поза містами: лише ті, що мають потрапляти в пошук
const STATIC_PAGES = [
	{ path: '/', priority: '1.0', changefreq: 'hourly' as const },
	{ path: '/about', priority: '0.5', changefreq: 'monthly' as const }
];

export interface SitemapEntry {
	loc: string;
	priority: string;
	changefreq: 'hourly' | 'daily' | 'monthly';
}

/** Скільки файлів у карті сайту — для індексу досить одного підрахунку рядків */
export async function sitemapFileCount(): Promise<number> {
	const total = STATIC_PAGES.length + (await cityPageCount());
	return Math.max(1, Math.ceil(total / URLS_PER_FILE));
}

/** Адреси одного файлу карти сайту (index від 0): спершу головна й «Про нас», далі населені пункти */
export async function sitemapChunk(index: number): Promise<SitemapEntry[]> {
	const start = index * URLS_PER_FILE;
	const end = start + URLS_PER_FILE;

	const statics = STATIC_PAGES.slice(start, end).map((p) => ({
		loc: `${SITE_URL}${p.path === '/' ? '' : p.path}`,
		priority: p.priority,
		changefreq: p.changefreq
	}));

	const cityStart = Math.max(0, start - STATIC_PAGES.length);
	const cityLimit = end - STATIC_PAGES.length - cityStart;
	const cities = cityLimit > 0 ? await cityPathsSlice(cityStart, cityLimit) : [];

	return [
		...statics,
		...cities.map((path, i) => ({
			loc: `${SITE_URL}/pohoda/${encodeURIComponent(path)}`,
			// Столиця — вище за інші населені пункти
			priority: cityStart + i === 0 ? '0.9' : '0.8',
			changefreq: 'hourly' as const
		}))
	];
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
		.map(
			(e) =>
				`<url><loc>${escapeXml(e.loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
		)
		.join('');
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export const SITEMAP_HEADERS = {
	'Content-Type': 'application/xml; charset=utf-8',
	// Список міст змінюється рідко: CDN тримає добу
	'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
};

/** Дата прогнозу змінюється щогодини, тож lastmod — поточна дата */
export const today = () => new Date().toISOString().slice(0, 10);
