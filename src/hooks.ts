import type { Reroute } from '@sveltejs/kit';
import { isLocalized, stripLang } from '$lib/i18n';

/*
	Російська версія — ті самі маршрути з префіксом /ru: /ru/pohoda/kyiv відкриває /pohoda/[city].
	Мова лишається в адресі (page.url), і з неї її беруть компоненти й серверні load.
	Сторінки без перекладу під /ru не існують — там буде 404.
*/
export const reroute: Reroute = ({ url }) => {
	const path = stripLang(url.pathname);
	if (path !== url.pathname && isLocalized(path)) return path;
};
