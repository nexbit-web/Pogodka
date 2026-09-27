import { page } from '$app/state';
import { isLocalized, langFromPath, localize, stripLang, type Lang } from './index';
import { messagesFor } from './messages';
import { ensureLang } from './pack';

const STORAGE_KEY = 'pogodka-lang';

/*
	Мова, якою людина зараз користується сайтом. На перекладених сторінках вона збігається
	з адресою, а на сторінках лише українською (правові, техпідтримка) — лишається тією,
	з якою людина прийшла: інтерфейс і посилання на прогноз не перемикаються на українську.
*/
let preferred = $state<Lang>('uk');
let restored = false;

/**
 * Викликається з кореневого layout при кожному переході.
 * Перекладена сторінка задає мову; неперекладена, відкрита напряму, — бере збережений вибір.
 */
export function trackLang(pathname: string) {
	if (isLocalized(stripLang(pathname))) {
		preferred = langFromPath(pathname);
		restored = true;
	} else if (!restored) {
		restored = true;
		try {
			if (localStorage.getItem(STORAGE_KEY) === 'ru') switchTo('ru');
		} catch {
			// Сховище недоступне — лишаємо українську
		}
	}
}

// Російські тексти вантажаться окремо: мову перемикаємо, щойно вони на місці
function switchTo(lang: Lang) {
	ensureLang(lang).then(() => (preferred = lang));
}

/*
	Поточна мова для компонентів. Реактивно: перехід на /ru одразу перемикає тексти,
	без перезавантаження.
	i18n.t.searchPlaceholder, i18n.href(resolve('/pohoda/[city]', { city }))
*/
export const i18n = {
	get lang(): Lang {
		const path = page.url.pathname;
		return isLocalized(stripLang(path)) ? langFromPath(path) : preferred;
	},
	get t() {
		return messagesFor(this.lang);
	},
	/** Внутрішнє посилання поточною мовою */
	href(path: string) {
		return localize(path, this.lang);
	},
	/** Ця ж сторінка іншою мовою — для перемикача мови */
	switchHref(lang: Lang) {
		return localize(page.url.pathname, lang) + page.url.search;
	}
};

/** Запам'ятати вибір: прямий вхід на головну відкриє сайт цією мовою (див. app.html) */
export function rememberLang(lang: Lang) {
	switchTo(lang);
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	} catch {
		// Сховище недоступне (приватний режим) — просто не запам'ятовуємо
	}
}
