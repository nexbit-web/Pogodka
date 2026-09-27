import { langFromPath } from '$lib/i18n';
import { ensureLang } from '$lib/i18n/pack';
import type { LayoutLoad } from './$types';

// Російські тексти браузер вантажить лише на сторінках /ru — і до показу сторінки,
// тож вона одразу відкривається російською, без мерехтіння української
export const load: LayoutLoad = async ({ url }) => {
	await ensureLang(langFromPath(url.pathname));
};
