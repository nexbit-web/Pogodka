/*
	Ранжування міст. У базі понад 24 тисячі населених пунктів, і назви повторюються:
	«Львів» є у трьох областях, «Іванівка» — у двадцяти двох. Людина майже завжди
	шукає обласний центр або велике місто, тож вони мають іти першими.
*/

interface Rankable {
	id: number;
	nameUa: string;
	region: string;
}

/** Назва міста збігається з назвою області: Львів → Львівська, Одеса → Одеська, Суми → Сумська */
export function isRegionCentre(city: Rankable): boolean {
	const name = city.nameUa.toLowerCase();
	const stem = name.slice(0, Math.min(4, Math.max(name.length - 1, 1)));
	return city.region.toLowerCase().startsWith(stem);
}

/**
 * Порядок підказок пошуку: точний збіг назви → обласний центр → коротша назва → за абеткою.
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
				Number(isRegionCentre(b)) - Number(isRegionCentre(a)) ||
				a.nameUa.length - b.nameUa.length ||
				a.nameUa.localeCompare(b.nameUa, 'uk') ||
				a.id - b.id
		)
		.slice(0, limit);
}
