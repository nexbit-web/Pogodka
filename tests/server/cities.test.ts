import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({ prisma: { city: { findMany: vi.fn(), count: vi.fn() } } }));
vi.mock('$lib/server/prisma', () => ({ default: prisma }));

const { distanceKm, nearbyCities, cityPathsSlice, cityPageCount } =
	await import('$lib/server/cities');

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
	prisma.city.count.mockReset();
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

describe('cityPathsSlice', () => {
	// Імітація бази: відповідає і на вибірку частини за id, і на пошук однойменних
	const table = [
		row(2732, 'lviv', 'Львів', 'Дніпропетровська область', 0, 0),
		row(11272, 'lviv', 'Львів', 'Львівська область', 0, 0),
		row(12405, 'kyiv', 'Київ', 'Миколаївська область', 0, 0)
	];
	const db = (args: { where?: { slug?: { in: string[] } }; skip?: number; take?: number }) => {
		if (args.where?.slug) return table.filter((c) => args.where!.slug!.in.includes(c.slug));
		const skip = args.skip ?? 0;
		return table.slice(skip, skip + (args.take ?? table.length));
	};

	it('столиця першою, адреси збігаються з повним списком', async () => {
		prisma.city.findMany.mockImplementation(async (args) => db(args));

		expect(await cityPathsSlice(0, 10)).toEqual([
			'kyiv',
			'lviv-dnipropetrovska',
			'lviv',
			'kyiv-mykolaivska'
		]);
	});

	it('частина зі зсувом бере з бази лише свої рядки, але адреси — з урахуванням усіх однойменних', async () => {
		prisma.city.findMany.mockImplementation(async (args) => db(args));

		// Позиції 1–2: столиця (0) пропущена, отже з бази рядки 0–1
		expect(await cityPathsSlice(1, 2)).toEqual(['lviv-dnipropetrovska', 'lviv']);
		expect(prisma.city.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 2 });

		// Друга частина не бачить Львова Дніпропетровського, але Київ-село все одно з областю
		expect(await cityPathsSlice(3, 2)).toEqual(['kyiv-mykolaivska']);
	});

	it('за межами списку — порожньо', async () => {
		prisma.city.findMany.mockImplementation(async (args) => db(args));
		expect(await cityPathsSlice(50, 10)).toEqual([]);
	});

	it('кількість сторінок — рядки бази плюс столиця', async () => {
		prisma.city.count.mockResolvedValue(24164);
		expect(await cityPageCount()).toBe(24165);
	});
});
