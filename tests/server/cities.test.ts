import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({ prisma: { city: { findMany: vi.fn() } } }));
vi.mock('$lib/server/prisma', () => ({ default: prisma }));

const { distanceKm, nearbyCities, allCityPaths } = await import('$lib/server/cities');

const row = (
	id: number,
	slug: string,
	nameUa: string,
	region: string,
	latitude: number,
	longitude: number
) => ({
	id,
	slug,
	nameUa,
	region,
	latitude,
	longitude
});

beforeEach(() => {
	prisma.city.findMany.mockReset();
});

describe('distanceKm', () => {
	it('Київ — Львів ≈ 470 км', () => {
		expect(distanceKm(50.4501, 30.5234, 49.8397, 24.0297)).toBeGreaterThan(460);
		expect(distanceKm(50.4501, 30.5234, 49.8397, 24.0297)).toBeLessThan(480);
	});

	it('та сама точка — 0', () => {
		expect(distanceKm(49, 30, 49, 30)).toBe(0);
	});
});

describe('nearbyCities', () => {
	it('найближчі за відстанню, з канонічними адресами', async () => {
		prisma.city.findMany
			.mockResolvedValueOnce([
				row(3, 'far', 'Далеке', 'Харківська область', 50.3, 36.2),
				row(2, 'merefa', 'Мерефа', 'Харківська область', 49.82, 36.05),
				row(4, 'lviv', 'Львів', 'Харківська область', 50.1, 36.3)
			])
			.mockResolvedValueOnce([
				row(4, 'lviv', 'Львів', 'Харківська область', 0, 0),
				row(11272, 'lviv', 'Львів', 'Львівська область', 0, 0)
			]);

		const list = await nearbyCities({ id: 1, latitude: 49.99, longitude: 36.23 }, 2);

		expect(list.map((c) => c.nameUa)).toEqual(['Львів', 'Мерефа']);
		expect(list[0].path).toBe('lviv-kharkivska');
		expect(list[1].distance).toBeGreaterThan(20);
		// Саме місто не входить до сусідів
		expect(prisma.city.findMany.mock.calls[0][0].where.NOT).toEqual({ id: 1 });
	});

	it('поруч із Києвом підказує столицю', async () => {
		prisma.city.findMany
			.mockResolvedValueOnce([row(5, 'irpin', 'Ірпінь', 'Київська область', 50.52, 30.25)])
			.mockResolvedValueOnce([row(5, 'irpin', 'Ірпінь', 'Київська область', 0, 0)]);

		const list = await nearbyCities({ id: 6, latitude: 50.5, longitude: 30.4 });
		expect(list.map((c) => c.path)).toContain('kyiv');
	});
});

describe('allCityPaths', () => {
	it('усі адреси унікальні, столиця першою', async () => {
		prisma.city.findMany.mockResolvedValue([
			row(2732, 'lviv', 'Львів', 'Дніпропетровська область', 0, 0),
			row(11272, 'lviv', 'Львів', 'Львівська область', 0, 0),
			row(12405, 'kyiv', 'Київ', 'Миколаївська область', 0, 0)
		]);

		const paths = await allCityPaths();
		expect(paths).toEqual(['kyiv', 'lviv-dnipropetrovska', 'lviv', 'kyiv-mykolaivska']);

		// Кеш: другий виклик не йде в базу
		await allCityPaths();
		expect(prisma.city.findMany).toHaveBeenCalledTimes(1);
	});
});
