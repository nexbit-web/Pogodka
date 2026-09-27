import { vi } from 'vitest';
import { registerRu } from '$lib/i18n/pack';
import { RU_PACK } from '$lib/i18n/ru';

// Як на сервері: російські тексти підключені одразу
registerRu(RU_PACK);

/*
	$app/state поза SvelteKit не працює, а компоненти беруть із нього адресу сторінки
	(від неї залежить мова). Спільна підміна для всіх тестів; мову перемикає setTestPath.
	Тести, яким потрібне щось інше, підміняють $app/state у себе — це має пріоритет.
*/
export const testPage = { url: new URL('https://www.pogodka.org/') };

/** Адреса поточної сторінки в тесті: setTestPath('/ru/pohoda/kharkiv') — російська */
export function setTestPath(path: string) {
	testPage.url = new URL(`https://www.pogodka.org${path}`);
}

vi.mock('$app/state', () => ({
	page: testPage,
	navigating: { to: null, from: null, type: null },
	updated: { current: false }
}));
