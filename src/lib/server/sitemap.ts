import { SITE_URL } from '$lib/config';
import { allCityPaths } from './cities';

/*
	Карта сайту: індекс /sitemap.xml і файли /sitemaps/1.xml, /sitemaps/2.xml…
	Лежить поза /api/, бо robots.txt закриває /api/ від роботів.
	Google приймає до 50 000 адрес у файлі; беремо 10 000, щоб файли були легкими.
*/

export const URLS_PER_FILE = 10_000;

// Сторінки поза містами: лише ті, що мають потрапляти в пошук
const STATIC_PAGES = [{ path: '/', priority: '1.0' }];

export interface SitemapEntry {
	loc: string;
	priority: string;
	changefreq: 'hourly' | 'daily';
}

export async function sitemapEntries(): Promise<SitemapEntry[]> {
	const cities = await allCityPaths();
	return [
		...STATIC_PAGES.map((p) => ({
			loc: `${SITE_URL}${p.path === '/' ? '' : p.path}`,
			priority: p.priority,
			changefreq: 'hourly' as const
		})),
		...cities.map((path, i) => ({
			loc: `${SITE_URL}/pohoda/${encodeURIComponent(path)}`,
			// Столиця й перші за порядком (обласні центри мають найменші id) — вище
			priority: i === 0 ? '0.9' : '0.8',
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
