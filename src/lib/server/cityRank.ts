import { KYIV, regionByName } from './regions';

/*
	Ранжування міст. У базі понад 24 тисячі населених пунктів, і назви повторюються:
	«Львів» є у трьох областях, «Рівне» — у чотирнадцяти. Людина майже завжди
	шукає столицю, обласний центр або велике місто, тож вони мають іти першими.
*/

export interface Rankable {
	id: number;
	nameUa: string;
	region: string;
}

const isCapital = (city: Rankable) => city.id === KYIV.id;

/** Обласний центр: Львів у Львівській, Луцьк у Волинській, Ужгород у Закарпатській */
export function isRegionCentre(city: Rankable): boolean {
	if (isCapital(city)) return true;

	const region = regionByName(city.region);
	if (region) return region.centre === city.nameUa;

	// Невідома область — за співзвучністю: Львів → Львівська, Суми → Сумська
	const name = city.nameUa.toLowerCase();
	const stem = name.slice(0, Math.min(4, Math.max(name.length - 1, 1)));
	return city.region.toLowerCase().startsWith(stem);
}

/** Пріоритет серед рівних за збігом: столиця → обласний центр → найменший id */
export function importance(a: Rankable, b: Rankable): number {
	return (
		Number(isCapital(b)) - Number(isCapital(a)) ||
		Number(isRegionCentre(b)) - Number(isRegionCentre(a)) ||
		a.id - b.id
	);
}

/**
 * Порядок підказок пошуку: точний збіг назви → столиця й обласні центри → коротша назва → за абеткою.
 * «Оде» дає Одесу першою, а не Одерадівку.
 */
export function rankSearchResults<T extends Rankable & { nameEn?: string; nameRu?: string }>(
	cities: T[],
	query: string,
	limit = 20
): T[] {
	const q = query.trim().toLowerCase();
	const exact = (c: T) =>
		[c.nameUa, c.nameEn, c.nameRu].some((n) => n?.toLowerCase() === q) ? 0 : 1;

	return [...cities]
		.sort(
			(a, b) =>
				exact(a) - exact(b) ||
				Number(isCapital(b)) - Number(isCapital(a)) ||
				Number(isRegionCentre(b)) - Number(isRegionCentre(a)) ||
				a.nameUa.length - b.nameUa.length ||
				a.nameUa.localeCompare(b.nameUa, 'uk') ||
				a.id - b.id
		)
		.slice(0, limit);
}
