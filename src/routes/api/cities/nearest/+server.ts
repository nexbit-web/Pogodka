import { error, json } from '@sveltejs/kit';
import { nearbyCities } from '$lib/server/cities';
import type { RequestHandler } from './$types';

// Межі України з невеликим запасом: запити з інших країн далі не йдуть
const BOUNDS = { latMin: 44, latMax: 52.5, lonMin: 22, lonMax: 40.5 };

/**
 * Найближчий населений пункт до координат пристрою — для «Моє місцезнаходження».
 * Координати не зберігаються й не кешуються.
 */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));

	if (
		!Number.isFinite(lat) ||
		!Number.isFinite(lon) ||
		lat < BOUNDS.latMin ||
		lat > BOUNDS.latMax ||
		lon < BOUNDS.lonMin ||
		lon > BOUNDS.lonMax
	) {
		error(404, 'Поруч немає населених пунктів України');
	}

	setHeaders({ 'Cache-Control': 'private, no-store' });

	// id -1: такого в базі немає, тож жоден пункт не виключається
	const [nearest] = await nearbyCities({ id: -1, latitude: lat, longitude: lon }, 1);
	if (!nearest) error(404, 'Поруч немає населених пунктів України');

	return json({ path: nearest.path, name: nearest.nameUa, distance: nearest.distance });
};
