import type { Lang } from './index';
import type { RuPack } from './ru';

/*
	Реєстр російського пакета текстів. Сам пакет (i18n/ru.ts) тут не імпортується —
	лише його тип, тож у браузерний код української версії він не потрапляє.
*/
let ru: RuPack | null = null;

/** Російські тексти, якщо пакет уже підключено; інакше — null, і всюди буде українська */
export const ruPack = () => ru;

export function registerRu(pack: RuPack) {
	ru = pack;
}

/** Підключає пакет мови, якщо його ще немає. Для української нічого не робить */
export async function ensureLang(lang: Lang) {
	if (lang === 'ru' && !ru) registerRu((await import('./ru')).RU_PACK);
}
