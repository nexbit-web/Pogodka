import type { Lang } from './index';
import { ruPack } from './pack';

/*
	Назви населених пунктів беремо з бази (nameRu). Область у базі записана українською,
	а обласні центри на головній — не з бази, тож їхні російські назви — у пакеті i18n/ru.ts.
*/

/** Область потрібною мовою; невідома — як є */
export const regionName = (region: string, lang: Lang) =>
	(lang === 'ru' && ruPack()?.regions[region]) || region;

export const centreName = (name: string, lang: Lang) =>
	(lang === 'ru' && ruPack()?.centres[name]) || name;

/** Назва населеного пункту з бази потрібною мовою; порожня російська — українська */
export const placeName = (city: { nameUa: string; nameRu?: string | null }, lang: Lang) =>
	lang === 'ru' && city.nameRu ? city.nameRu : city.nameUa;
