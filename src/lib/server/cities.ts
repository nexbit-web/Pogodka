import prisma from './prisma';
import { assignPaths } from './cityUrl';
import { KYIV } from './regions';

/*
	Адреси населених пунктів для пошуку, внутрішньої перелінковки і sitemap.
	Однойменні отримують адресу з областю, тож кожен із 24 тисяч має власну сторінку.
*/

interface Base {
	id: number;
	slug: string;
	nameUa: string;
	region: string;
}

const capital = (): Base & { latitude: number; longitude: number } => ({
	id: KYIV.id,
	slug: KYIV.slug,
	nameUa: KYIV.nameUa,
	region: KYIV.region,
	latitude: KYIV.latitude,
	longitude: KYIV.longitude
});

/** Додає канонічну адресу кожному місту зі списку */
export async function attachPaths<T extends Base>(cities: T[]): Promise<(T & { path: string })[]> {
	const slugs = [...new Set(cities.map((c) => c.slug))];
	if (slugs.length === 0) return [];

	const siblings: Base[] = await prisma.city.findMany({
		where: { slug: { in: slugs } },
		select: { id: true, slug: true, nameUa: true, region: true }
	});
	const group = slugs.includes(KYIV.slug) ? [capital(), ...siblings] : siblings;
	const paths = assignPaths(group);

	return cities.map((city) => ({ ...city, path: paths.get(city.id) ?? city.slug }));
}

export interface NearbyCity {
	id: number;
	nameUa: string;
	region: string;
	path: string;
	/** Відстань, км */
	distance: number;
}

/** Відстань між точками по поверхні Землі, км */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const rad = Math.PI / 180;
	const dLat = (lat2 - lat1) * rad;
	const dLon = (lon2 - lon1) * rad;
	const a =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Найближчі населені пункти — блок «Погода поруч».
 * Для людей це швидкий перехід до сусіднього села, для пошукових роботів —
 * мережа посилань, якою вони доходять до кожної з 24 тисяч сторінок.
 */
export async function nearbyCities(
	city: { id: number; latitude: number; longitude: number },
	limit = 12
): Promise<NearbyCity[]> {
	// ~40 км на північ-південь і схід-захід на широтах України
	const dLat = 0.36;
	const dLon = 0.55;

	const rows = await prisma.city.findMany({
		where: {
			latitude: { gte: city.latitude - dLat, lte: city.latitude + dLat },
			longitude: { gte: city.longitude - dLon, lte: city.longitude + dLon },
			NOT: { id: city.id }
		},
		select: { id: true, slug: true, nameUa: true, region: true, latitude: true, longitude: true },
		take: 300
	});

	const kyiv = capital();
	const candidates =
		city.id !== KYIV.id &&
		Math.abs(kyiv.latitude - city.latitude) <= dLat &&
		Math.abs(kyiv.longitude - city.longitude) <= dLon
			? [kyiv, ...rows]
			: rows;

	const closest = candidates
		.map((c) => ({
			...c,
			distance: distanceKm(city.latitude, city.longitude, c.latitude, c.longitude)
		}))
		.sort((a, b) => a.distance - b.distance || a.id - b.id)
		.slice(0, limit);

	const withPaths = await attachPaths(closest);
	return withPaths.map((c) => ({
		id: c.id,
		nameUa: c.nameUa,
		region: c.region,
		path: c.path,
		distance: Math.round(c.distance)
	}));
}

/** Кількість сторінок населених пунктів: усі з бази плюс столиця */
export const cityPageCount = async () => (await prisma.city.count()) + 1;

/**
 * Канонічні адреси частини списку населених пунктів: столиця першою, далі за id.
 * Адреса залежить лише від однойменних, а attachPaths бере всю їхню групу,
 * тож частина збігається з повним списком і не потребує всіх 24 тисяч рядків.
 */
export async function cityPathsSlice(offset: number, limit: number): Promise<string[]> {
	const withCapital = offset === 0;

	const rows: Base[] = await prisma.city.findMany({
		select: { id: true, slug: true, nameUa: true, region: true },
		orderBy: { id: 'asc' },
		skip: withCapital ? 0 : offset - 1,
		take: withCapital ? limit - 1 : limit
	});

	const withPaths = await attachPaths(withCapital ? [capital(), ...rows] : rows);
	return withPaths.map((c) => c.path);
}
