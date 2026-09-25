import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';
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
		).rejects.toMatchObject({
			status: 404
		});
	});
});

describe('GET /api/cities/search', () => {
	const load = async () => (await import('../../src/routes/api/cities/search/+server')).GET;
	const cities = [
		{ id: 1, slug: 'lviv', nameUa: 'Львів', region: 'Львівська область' },
		{ id: 2, slug: 'kyiv', nameUa: 'Київ', region: 'Київська область' },
		{ id: 3, slug: 'kharkiv', nameUa: 'Харків', region: 'Харківська область' }
	];

	it('без запиту — популярні міста в заданому порядку, з кешем CDN', async () => {
		prisma.city.findMany.mockResolvedValue([...cities]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search?q=' }));
		const body = await res.json();

		expect(body.map((c: { slug: string }) => c.slug)).toEqual(['kyiv', 'kharkiv', 'lviv']);
		expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
	});

	it('з однакових слагів лишає по одному місту — обласний центр', async () => {
		prisma.city.findMany.mockResolvedValue([
			{ id: 2732, slug: 'lviv', nameUa: 'Львів', region: 'Дніпропетровська область' },
			{ id: 11272, slug: 'lviv', nameUa: 'Львів', region: 'Львівська область' },
			{ id: 12473, slug: 'lviv', nameUa: 'Львів', region: 'Миколаївська область' },
			{ id: 19753, slug: 'kharkiv', nameUa: 'Харків', region: 'Харківська область' }
		]);

		const res = await (await load())(event({ url: 'https://x/api/cities/search' }));
		const body = await res.json();

		expect(body.map((c: { id: number }) => c.id)).toEqual([19753, 11272]);
	});

	it('популярні міста кешуються в памʼяті — база не смикається на кожен запит', async () => {
		prisma.city.findMany.mockResolvedValue([...cities]);
		const GET = await load();

		await GET(event({ url: 'https://x/api/cities/search' }));
		await GET(event({ url: 'https://x/api/cities/search?q=a' }));
		await GET(event({ url: 'https://x/api/cities/search?q=' }));

		expect(prisma.city.findMany).toHaveBeenCalledTimes(1);
	});

	it('шукає за початком будь-якої назви', async () => {
		prisma.city.findMany.mockResolvedValue([cities[0]]);

		const res = await (
			await load()
		)(event({ url: 'https://x/api/cities/search?q=%D0%9B%D1%8C%D0%B2' }));

		expect(await res.json()).toEqual([cities[0]]);
		const args = prisma.city.findMany.mock.calls[0][0];
		expect(args.take).toBe(200);
		expect(args.where.OR[0]).toEqual({ nameUa: { startsWith: 'Льв', mode: 'insensitive' } });
		expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
	});

	it('Одеса йде першою серед збігів «Оде», а видача обмежена 20 містами', async () => {
		const many = Array.from({ length: 30 }, (_, i) => ({
			id: i + 1,
			slug: `ode-${i}`,
			nameUa: `Одерадівка${i}`,
			region: 'Тернопільська область'
		}));
		prisma.city.findMany.mockResolvedValue([
			...many,
			{ id: 99, slug: 'odesa', nameUa: 'Одеса', region: 'Одеська область' }
		]);

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

describe('Sitemap', () => {
	it('індекс ділить міста на файли по 5000', async () => {
		prisma.city.count.mockResolvedValue(12001);
		const { GET } = await import('../../src/routes/api/sitemap.xml/+server');

		const res = await GET(event({}));
		const xml = await res.text();

		expect(res.headers.get('Content-Type')).toBe('application/xml');
		expect(xml.match(/<sitemap>/g)).toHaveLength(3);
		expect(xml).toContain('https://www.pogodka.org/api/sitemap/3');
	});

	it('сторінка мапи містить URL міст', async () => {
		prisma.city.findMany.mockResolvedValue([{ slug: 'lviv' }, { slug: 'kyiv' }]);
		const { GET } = await import('../../src/routes/api/sitemap/[index]/+server');

		const res = await GET(event({ params: { index: '2' } }));
		const xml = await res.text();

		expect(xml).toContain('<loc>https://www.pogodka.org/pohoda/lviv</loc>');
		expect(prisma.city.findMany.mock.calls[0][0]).toMatchObject({ skip: 5000, take: 5000 });
	});

	it.each(['0', '-1', 'abc', '1.5'])('невідома сторінка «%s» — 404', async (index) => {
		const { GET } = await import('../../src/routes/api/sitemap/[index]/+server');
		await expect(GET(event({ params: { index } }))).rejects.toMatchObject({ status: 404 });
	});
});
