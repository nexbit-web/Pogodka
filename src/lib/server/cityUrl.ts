import { importance, type Rankable } from './cityRank';
import { REGIONS, regionSlug } from './regions';

/*
	Унікальні адреси для населених пунктів з однаковою назвою.
	Найважливіший (столиця / обласний центр / найменший id) зберігає коротку адресу —
	/pohoda/lviv, тож усі старі посилання й позиції в пошуку лишаються.
	Решта отримують назву області: /pohoda/lviv-mykolaivska.
	Якщо в одній області кілька однойменних — ще й номер: /pohoda/ivanivka-sumska-2.
*/

export interface Pathable extends Rankable {
	slug: string;
}

/** Адреса кожного населеного пункту групи з однаковим слагом */
export function assignPaths<T extends Pathable>(cities: T[]): Map<number, string> {
	const paths = new Map<number, string>();
	const bySlug = new Map<string, T[]>();
	for (const city of cities) {
		const group = bySlug.get(city.slug) ?? [];
		group.push(city);
		bySlug.set(city.slug, group);
	}

	for (const [slug, group] of bySlug) {
		const [main, ...rest] = [...group].sort(importance);
		paths.set(main.id, slug);

		// Решта — за областю, у межах області — за id
		const perRegion = new Map<string, T[]>();
		for (const city of rest.sort((a, b) => a.id - b.id)) {
			const list = perRegion.get(city.region) ?? [];
			list.push(city);
			perRegion.set(city.region, list);
		}
		for (const [region, list] of perRegion) {
			const base = `${slug}-${regionSlug(region)}`;
			list.forEach((city, i) => paths.set(city.id, i === 0 ? base : `${base}-${i + 1}`));
		}
	}

	return paths;
}

/** Розбирає адресу з областю: «ivanivka-sumska-2» → слаг «ivanivka» */
export function parseRegionalPath(path: string): { slug: string } | null {
	const value = path.toLowerCase();
	for (const region of REGIONS) {
		const match = value.match(new RegExp(`^(.+)-${region.slug}(?:-(\\d+))?$`));
		if (match) return { slug: match[1] };
	}
	return null;
}
