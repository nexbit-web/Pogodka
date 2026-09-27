/*
	Мови сайту: українська — основна, на звичних адресах (/pohoda/kyiv);
	російська — ті самі сторінки з префіксом /ru (/ru/pohoda/kyiv).
	Мова визначається лише адресою: так її однозначно бачать і люди, і пошуковики,
	а кожна мовна версія має власну сторінку у видачі (hreflang).
*/

export type Lang = 'uk' | 'ru';

export const DEFAULT_LANG: Lang = 'uk';

export const LANGS: { id: Lang; label: string; hreflang: string; locale: string }[] = [
	{ id: 'uk', label: 'Українська', hreflang: 'uk', locale: 'uk_UA' },
	{ id: 'ru', label: 'Русский', hreflang: 'ru', locale: 'ru_UA' }
];

const RU_PREFIX = '/ru';

/** Мова за адресою сторінки */
export const langFromPath = (pathname: string): Lang =>
	pathname === RU_PREFIX || pathname.startsWith(`${RU_PREFIX}/`) ? 'ru' : 'uk';

/** Адреса без мовного префікса: /ru/pohoda/kyiv → /pohoda/kyiv, /ru → / */
export function stripLang(pathname: string): string {
	if (langFromPath(pathname) === 'uk') return pathname;
	return pathname.slice(RU_PREFIX.length) || '/';
}

/**
 * Чи має сторінка російську версію. Перекладено прогноз — головну і сторінки населених пунктів;
 * службові й правові сторінки поки лише українською.
 */
export const isLocalized = (path: string) => path === '/' || path.startsWith('/pohoda/');

/** Адреса сторінки потрібною мовою: localize('/pohoda/kyiv', 'ru') → /ru/pohoda/kyiv */
export function localize(path: string, lang: Lang): string {
	const base = stripLang(path);
	if (lang === 'uk' || !isLocalized(base)) return base;
	return base === '/' ? RU_PREFIX : `${RU_PREFIX}${base}`;
}
