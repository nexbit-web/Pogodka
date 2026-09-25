import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error, isRedirect } from '@sveltejs/kit';
import { makeApiResponse } from '../fixtures/forecast';

const { prisma, weather, support } = vi.hoisted(() => ({
	prisma: { city: { findMany: vi.fn(), count: vi.fn() } },
	weather: { getCityWeather: vi.fn(), findCity: vi.fn() },
	support: { sendSupportMessage: vi.fn() }
}));

vi.mock('$lib/server/prisma', () => ({ default: prisma }));
vi.mock('$lib/server/weather', () => weather);
vi.mock('$lib/server/support', () => support);

// Мінімальна подія запиту: обробникам потрібні лише url, params і request
const event = (init: { url?: string; params?: Record<string, string>; request?: Request }) =>
	// Обробники очікують повний RequestEvent — для тестів досить цих полів
	({
		url: new URL(init.url ?? 'https://www.pogodka.org/'),
		params: init.params ?? {},
		request: init.request
	}) as never;

const row = (id: number, slug: string, nameUa: string, region: string) => ({
	id,
	slug,
	nameUa,
	nameRu: nameUa,
	nameEn: slug,
	region,
	latitude: 50,
	longitude: 30
});

beforeEach(() => {
	vi.resetModules();
	prisma.city.findMany.mockReset();
	prisma.city.count.mockReset();
	weather.getCityWeather.mockReset();
	support.sendSupportMessage.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/pogoda', () => {
	const load = async () => (await import('../../src/routes/api/pogoda/+server')).GET;

	it('без міста — 400', async () => {
		const res = await (await load())(event({ url: 'https://x/api/pogoda' }));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Не вказано місто' });
	});

	it('віддає погоду міста', async () => {
		const data = makeApiResponse();
		weather.getCityWeather.mockResolvedValue(data);

		const res = await (await load())(event({ url: 'https://x/api/pogoda?city=%20Kharkiv%20' }));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(data);
		expect(weather.getCityWeather).toHaveBeenCalledWith('Kharkiv');
	});

	it('обрізає надто довгий запит', async () => {
		weather.getCityWeather.mockResolvedValue(makeApiResponse());
		await (
			await load()
		)(event({ url: `https://x/api/pogoda?city=${'a'.repeat(5000)}` }));
		expect(weather.getCityWeather.mock.calls[0][0]).toHaveLength(100);
	});

	it('прокидає 404 від сервісу погоди', async () => {
		weather.getCityWeather.mockImplementation(() => error(404, 'Місто не знайдено'));
		await expect(
			(await load())(event({ url: 'https://x/api/pogoda?city=zzz' }))
		).rejects.toMatchObject({ status: 404 });
	});
});

describe('GET /api/cities/search', () => {
	const load = async () => (await import('../../src/routes/api/cities/search/+server')).GET;

	it('без запиту — популярні міста: столиця першою, по одному на слаг, з кешем CDN', async () => {
		prisma.city.findMany.mockResolvedValue([
			row(12405, 'kyiv', 'Київ', 'Миколаївська область'),
			row(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
			row(11272, 'lviv', 'Львів', 'Львівська область'),
			row(19753, 'kharkiv', 'Харків', 'Харківська область')
		]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search?q=' }));
		const body = await res.json();

		// Столиця (id 0), а не село Київ у Миколаївській області
		expect(body.map((c: { id: number }) => c.id)).toEqual([0, 19753, 11272]);
		expect(body.every((c: { path: string; slug: string }) => c.path === c.slug)).toBe(true);
		expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
	});

	it('популярні міста кешуються в памʼяті — база не смикається на кожен запит', async () => {
		prisma.city.findMany.mockResolvedValue([]);
		const GET = await load();

		await GET(event({ url: 'https://x/api/cities/search' }));
		await GET(event({ url: 'https://x/api/cities/search?q=a' }));
		await GET(event({ url: 'https://x/api/cities/search?q=' }));

		expect(prisma.city.findMany).toHaveBeenCalledTimes(1);
	});

	it('шукає за початком будь-якої назви і дає однойменним адресу з областю', async () => {
		prisma.city.findMany.mockResolvedValue([
			row(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
			row(11272, 'lviv', 'Львів', 'Львівська область')
		]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search?q=Льв' }));
		const body = await res.json();

		expect(body.map((c: { id: number; path: string }) => [c.id, c.path])).toEqual([
			[11272, 'lviv'],
			[2732, 'lviv-dnipropetrovska']
		]);
		const args = prisma.city.findMany.mock.calls[0][0];
		expect(args.take).toBe(200);
		expect(args.where.OR[0]).toEqual({ nameUa: { startsWith: 'Льв', mode: 'insensitive' } });
		expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
	});

	it('на «Киї» першою підказує столицю', async () => {
		prisma.city.findMany.mockResolvedValue([row(12405, 'kyiv', 'Київ', 'Миколаївська область')]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search?q=Киї' }));
		const body = await res.json();

		expect(body[0]).toMatchObject({ id: 0, path: 'kyiv' });
		expect(body[1]).toMatchObject({ id: 12405, path: 'kyiv-mykolaivska' });
	});

	it('Одеса йде першою серед збігів «Оде», а видача обмежена 20 містами', async () => {
		const many = Array.from({ length: 30 }, (_, i) =>
			row(i + 1, `ode-${i}`, `Одерадівка${i}`, 'Тернопільська область')
		);
		prisma.city.findMany.mockResolvedValue([...many, row(99, 'odesa', 'Одеса', 'Одеська область')]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search?q=Оде' }));
		const body = await res.json();

		expect(body[0].slug).toBe('odesa');
		expect(body).toHaveLength(20);
	});

	it('обрізає надто довгий запит до 64 символів', async () => {
		prisma.city.findMany.mockResolvedValue([]);
		await (
			await load()
		)(event({ url: `https://x/api/cities/search?q=${'я'.repeat(1000)}` }));
		expect(prisma.city.findMany.mock.calls[0][0].where.OR[0].nameUa.startsWith).toHaveLength(64);
	});
});

describe('POST /api/support', () => {
	const load = async () => (await import('../../src/routes/api/support/+server')).POST;
	const post = (body: string) =>
		event({
			url: 'https://x/api/support',
			request: new Request('https://x/api/support', { method: 'POST', body })
		});
	const valid = { email: 'a@b.ua', subject: 'Тема звернення', message: 'Довге повідомлення' };

	it('битий JSON — 400', async () => {
		const res = await (await load())(post('{oops'));
		expect(res.status).toBe(400);
	});

	it('невалідні поля — 400 з помилками по полях', async () => {
		const res = await (await load())(post(JSON.stringify({ email: 'x' })));
		const body = await res.json();
		expect(res.status).toBe(400);
		expect(body.errors.email).toBe('Невірний email');
		expect(support.sendSupportMessage).not.toHaveBeenCalled();
	});

	it('валідне звернення — надсилає і відповідає success', async () => {
		support.sendSupportMessage.mockResolvedValue(undefined);
		const res = await (await load())(post(JSON.stringify(valid)));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true });
		expect(support.sendSupportMessage).toHaveBeenCalledWith(valid);
	});

	it('Telegram недоступний — 502, без деталей помилки назовні', async () => {
		support.sendSupportMessage.mockRejectedValue(new Error('token=secret leaked'));
		const res = await (await load())(post(JSON.stringify(valid)));

		expect(res.status).toBe(502);
		expect(JSON.stringify(await res.json())).not.toContain('secret');
	});
});

describe('Карта сайту', () => {
	// Імітація бази: вибірка частини за id і пошук однойменних за слагами
	const useTable = (table: ReturnType<typeof row>[]) => {
		prisma.city.count.mockResolvedValue(table.length);
		prisma.city.findMany.mockImplementation(
			async (args: { where?: { slug?: { in: string[] } }; skip?: number; take?: number }) => {
				if (args.where?.slug) return table.filter((c) => args.where!.slug!.in.includes(c.slug));
				const skip = args.skip ?? 0;
				return table.slice(skip, skip + (args.take ?? table.length));
			}
		);
	};

	// 2 500 населених пунктів у базі + столиця + головна й «Про нас» = 2 503 адреси
	const manyCities = () =>
		Array.from({ length: 2500 }, (_, i) =>
			row(i + 1, `city-${i + 1}`, `Місто${i + 1}`, 'Київська область')
		);

	const locsOf = (xml: string) => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

	it('/sitemap.xml — індекс файлів по 1 000 адрес, поза закритим /api/', async () => {
		useTable(manyCities());
		const { GET } = await import('../../src/routes/sitemap.xml/+server');

		const res = await GET(event({}));
		const xml = await res.text();

		expect(res.headers.get('Content-Type')).toContain('application/xml');
		expect(xml.match(/<sitemap>/g)).toHaveLength(3);
		expect(xml).toContain('<loc>https://www.pogodka.org/sitemaps/3.xml</loc>');
		expect(xml).not.toContain('/api/');
		// Індексу досить підрахунку — усі рядки з бази не читаються
		expect(prisma.city.findMany).not.toHaveBeenCalled();
	});

	it('перший файл: головна, «Про нас», столиця, далі населені пункти — без дублів', async () => {
		useTable([
			row(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
			row(11272, 'lviv', 'Львів', 'Львівська область'),
			row(12405, 'kyiv', 'Київ', 'Миколаївська область')
		]);
		const { GET } = await import('../../src/routes/sitemaps/[file]/+server');

		const locs = locsOf(await (await GET(event({ params: { file: '1.xml' } }))).text());

		expect(locs).toEqual([
			'https://www.pogodka.org',
			'https://www.pogodka.org/about',
			'https://www.pogodka.org/pohoda/kyiv',
			'https://www.pogodka.org/pohoda/lviv-dnipropetrovska',
			'https://www.pogodka.org/pohoda/lviv',
			'https://www.pogodka.org/pohoda/kyiv-mykolaivska'
		]);
		expect(new Set(locs).size).toBe(locs.length);
	});

	it('файли разом містять кожну адресу рівно один раз, у кожному не більше 1 000', async () => {
		useTable(manyCities());
		const { GET } = await import('../../src/routes/sitemaps/[file]/+server');

		const files = await Promise.all(
			['1.xml', '2.xml', '3.xml'].map(async (file) =>
				locsOf(await (await GET(event({ params: { file } }))).text())
			)
		);

		expect(files.map((f) => f.length)).toEqual([1000, 1000, 503]);
		const all = files.flat();
		expect(new Set(all).size).toBe(2503);
		expect(all.at(-1)).toBe('https://www.pogodka.org/pohoda/city-2500');
	});

	it.each(['0.xml', '4.xml', '10000.xml', 'abc', '1', '-1.xml'])(
		'невідомий файл «%s» — 404',
		async (file) => {
			useTable(manyCities());
			const { GET } = await import('../../src/routes/sitemaps/[file]/+server');
			await expect(GET(event({ params: { file } }))).rejects.toMatchObject({ status: 404 });
		}
	);

	it('старі адреси /api/sitemap… переадресовують на /sitemap.xml', async () => {
		const index = await import('../../src/routes/api/sitemap.xml/+server');
		const page = await import('../../src/routes/api/sitemap/[index]/+server');

		for (const handler of [index.GET, page.GET]) {
			const err = await Promise.resolve()
				.then(() => handler(event({ params: { index: '1' } })))
				.catch((e: unknown) => e);
			expect(isRedirect(err)).toBe(true);
			expect(err).toMatchObject({ status: 301, location: '/sitemap.xml' });
		}
	});
});
