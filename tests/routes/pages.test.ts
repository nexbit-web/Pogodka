import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { makeApiResponse, makeForecast } from '../fixtures/forecast';

const { weather, cities, support } = vi.hoisted(() => ({
	weather: { findCity: vi.fn(), getForecast: vi.fn() },
	cities: { nearbyCities: vi.fn() },
	support: { sendSupportMessage: vi.fn() }
}));

vi.mock('$lib/server/weather', () => weather);
vi.mock('$lib/server/cities', () => cities);
vi.mock('$lib/server/support', () => support);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvent = any;

const KHARKIV = {
	id: 19753,
	slug: 'kharkiv',
	nameUa: 'Харків',
	region: 'Харківська область',
	countryUa: 'Україна',
	latitude: 49.99,
	longitude: 36.23,
	path: 'kharkiv'
};

const setHeaders = vi.fn();

beforeEach(() => {
	weather.findCity.mockReset();
	weather.getForecast.mockReset().mockResolvedValue(makeApiResponse());
	cities.nearbyCities.mockReset().mockResolvedValue([
		{ id: 1, nameUa: 'Мерефа', region: 'Харківська область', path: 'merefa', distance: 24 },
		{ id: 2, nameUa: 'Бєлгород', region: 'Інша область', path: 'x', distance: 70 }
	]);
	support.sendSupportMessage.mockReset();
	setHeaders.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

const url = (path: string) => new URL(`https://www.pogodka.org${path}`);

describe('головна сторінка', () => {
	const load = async (path = '/') =>
		(await import('../../src/routes/+page.server')).load({
			url: url(path),
			setHeaders
		} as AnyEvent) as Promise<Record<string, AnyEvent>>;

	it('показує погоду в Києві й кешується на CDN', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, nameUa: 'Київ', path: 'kyiv' });
		const data = await load();

		expect(weather.findCity).toHaveBeenCalledWith('kyiv');
		expect(data.weather.misto).toBe('Київ');
		expect(data.seo).toMatchObject({ path: '/' });
		expect(data.seo.title).toMatch(/^Pogodka \(Погодка\)/);
		expect(setHeaders.mock.calls[0][0]['cache-control']).toContain('s-maxage=');
	});

	it('посилається на столицю і всі 23 інші обласні центри: столиця першою, далі за абеткою', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, path: 'kyiv' });
		const { centres } = await load();

		expect(centres).toHaveLength(24);
		expect(centres[0]).toEqual({ name: 'Київ', path: 'kyiv' });
		expect(centres).toContainEqual({ name: 'Ужгород', path: 'uzhhorod' });
		const rest = centres.slice(1).map((c: { name: string }) => c.name);
		expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'uk')));
	});

	it('/ru — назви, заголовок і опис російською', async () => {
		weather.findCity.mockResolvedValue({
			...KHARKIV,
			nameUa: 'Київ',
			nameRu: 'Киев',
			region: 'Київ',
			path: 'kyiv'
		});
		const data = await load('/ru');

		expect(data.weather.misto).toBe('Киев');
		expect(data.centres[0]).toEqual({ name: 'Киев', path: 'kyiv' });
		expect(data.centres).toContainEqual({ name: 'Одесса', path: 'odesa' });
		expect(data.seo).toMatchObject({ path: '/ru' });
		expect(data.seo.title).toContain('прогноз погоды в Украине');
		expect(data.seo.description).toMatch(/^Прогноз погоды для каждого города/);
	});

	it('структуровані дані: Organization і WebSite', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, path: 'kyiv' });
		const { jsonLd } = await load();

		expect(jsonLd['@context']).toBe('https://schema.org');
		expect(jsonLd['@graph'].map((x: { '@type': string }) => x['@type'])).toEqual([
			'Organization',
			'WebSite'
		]);
	});
});

describe('сторінка міста /pohoda/[city]', () => {
	const load = async (city: string, path = `/pohoda/${city}`) =>
		(await import('../../src/routes/pohoda/[city]/+page.server')).load({
			params: { city },
			url: url(path),
			setHeaders
		} as AnyEvent) as Promise<Record<string, AnyEvent>>;

	it('віддає погоду, місто, сусідів і SEO-дані', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const data = await load('kharkiv');

		expect(data.view).toBe('week');
		expect(data.city).toEqual({ name: 'Харків', region: 'Харківська область', path: 'kharkiv' });
		expect(data.seo.path).toBe('/pohoda/kharkiv');
		expect(data.seo.title).toMatch(/^Погода Харків/);
		expect(data.seo.title.length).toBeLessThanOrEqual(65);
		expect(data.seo.description).toMatch(/^Погода Харків зараз: [+−]?\d+°/);
		expect(setHeaders.mock.calls[0][0]['cache-control']).toContain('s-maxage=');
	});

	it('сусіди з тієї ж області — з відстанню, з іншої — з назвою області', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const { nearby } = await load('kharkiv');

		expect(nearby).toEqual([
			{ name: 'Мерефа', path: 'merefa', note: '24 км' },
			{ name: 'Бєлгород', path: 'x', note: 'Інша обл.' }
		]);
	});

	it('JSON-LD: хлібні крихти й WebPage про місце з координатами', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const { seo } = await load('kharkiv');
		const [breadcrumbs, page] = seo.jsonLd['@graph'];

		expect(breadcrumbs['@type']).toBe('BreadcrumbList');
		expect(breadcrumbs.itemListElement.at(-1).item).toBe('https://www.pogodka.org/pohoda/kharkiv');
		expect(page['@type']).toBe('WebPage');
		expect(page.inLanguage).toBe('uk');
		expect(page.about.geo).toEqual({
			'@type': 'GeoCoordinates',
			latitude: 49.99,
			longitude: 36.23
		});
		expect(JSON.stringify(seo.jsonLd)).not.toMatch(/NaN|undefined|null/);
	});

	it.each(['Kharkiv', 'Харків', 'KHARKIV'])('«%s» — 301 на канонічну адресу', async (param) => {
		weather.findCity.mockResolvedValue(KHARKIV);

		const err = await load(param).catch((e: unknown) => e);
		expect(isRedirect(err)).toBe(true);
		expect(err).toMatchObject({ status: 301, location: '/pohoda/kharkiv' });
		expect(weather.getForecast).not.toHaveBeenCalled();
	});

	it('невідоме місто — 404', async () => {
		weather.findCity.mockResolvedValue(null);
		await expect(load('atlantyda')).rejects.toMatchObject({ status: 404 });
	});

	it('збій блоку «Погода поруч» не ламає сторінку', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		cities.nearbyCities.mockRejectedValue(new Error('db down'));

		const data = await load('kharkiv');
		expect(data.nearby).toEqual([]);
		expect(data.weather).toBeDefined();
	});

	it('однойменне село: заголовок уточнює область', async () => {
		weather.findCity.mockResolvedValue({
			...KHARKIV,
			nameUa: 'Львів',
			slug: 'lviv',
			region: 'Миколаївська область',
			path: 'lviv-mykolaivska'
		});
		weather.getForecast.mockResolvedValue(makeApiResponse(makeForecast()));
		const { seo } = await load('lviv-mykolaivska');

		expect(seo.title).toContain('Львів (Миколаївська обл.)');
	});

	describe('російська версія /ru/pohoda/[city]', () => {
		const RU = { ...KHARKIV, nameRu: 'Харьков' };

		it('назва, область, сусіди й SEO — російською, адреси з /ru', async () => {
			weather.findCity.mockResolvedValue(RU);
			cities.nearbyCities.mockResolvedValue([
				{
					id: 1,
					nameUa: 'Мерефа',
					nameRu: 'Мерефа',
					region: 'Харківська область',
					path: 'merefa',
					distance: 24
				},
				{
					id: 2,
					nameUa: 'Суми',
					nameRu: 'Сумы',
					region: 'Сумська область',
					path: 'sumy',
					distance: 140
				}
			]);
			const data = await load('kharkiv', '/ru/pohoda/kharkiv');

			expect(data.city).toEqual({
				name: 'Харьков',
				region: 'Харьковская область',
				path: 'kharkiv'
			});
			expect(data.weather.misto).toBe('Харьков');
			expect(data.nearby).toEqual([
				{ name: 'Мерефа', path: 'merefa', note: '24 км' },
				{ name: 'Сумы', path: 'sumy', note: 'Сумская обл.' }
			]);
			expect(data.seo.path).toBe('/ru/pohoda/kharkiv');
			expect(data.seo.title).toBe('Погода Харьков: прогноз на сегодня, завтра и 7 дней | Pogodka');
			expect(data.seo.description).toMatch(/^Погода Харьков сейчас: [+−]?\d+°/);

			const [breadcrumbs, page] = data.seo.jsonLd['@graph'];
			expect(breadcrumbs.itemListElement.map((i: { item: string }) => i.item)).toEqual([
				'https://www.pogodka.org/ru',
				'https://www.pogodka.org/ru/pohoda/kharkiv'
			]);
			expect(page.inLanguage).toBe('ru');
		});

		it('без російської назви в базі — українська', async () => {
			weather.findCity.mockResolvedValue({ ...KHARKIV, nameRu: '' });
			const data = await load('kharkiv', '/ru/pohoda/kharkiv');
			expect(data.city.name).toBe('Харків');
		});

		it('301 зберігає мову', async () => {
			weather.findCity.mockResolvedValue(RU);
			const err = await load('Харьков', '/ru/pohoda/Харьков').catch((e: unknown) => e);
			expect(err).toMatchObject({ status: 301, location: '/ru/pohoda/kharkiv' });
		});
	});
});

describe('сторінки «на завтра», «на 10 днів», «на вихідні»', () => {
	const load = async (view: string, path = `/pohoda/kharkiv/${view}`, city = 'kharkiv') =>
		(await import('../../src/routes/pohoda/[city]/[view=view]/+page.server')).load({
			params: { city, view },
			url: url(path),
			setHeaders
		} as AnyEvent) as Promise<Record<string, AnyEvent>>;

	it.each([
		[
			'zavtra',
			'Погода Харків на завтра — прогноз по годинах | Pogodka',
			/^Погода Харків на завтра, \d+ \S+: від [+−]?\d+° до [+−]?\d+°/
		],
		[
			'10-dniv',
			'Погода Харків на 10 днів — точний прогноз | Pogodka',
			/^Погода Харків на 10 днів: від /
		],
		[
			'vykhidni',
			'Погода Харків на вихідні — субота й неділя | Pogodka',
			/^Погода Харків на вихідні: /
		]
	])('/%s: власні заголовок, опис, адреса й хлібні крихти', async (view, title, description) => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const data = await load(view);

		expect(data.view).toBe(view);
		expect(data.seo.path).toBe(`/pohoda/kharkiv/${view}`);
		expect(data.seo.title).toBe(title);
		expect(data.seo.description).toMatch(description);
		expect(data.seo.description).not.toMatch(/NaN|undefined|Infinity/);

		const crumbs = data.seo.jsonLd['@graph'][0].itemListElement;
		expect(crumbs).toHaveLength(3);
		expect(crumbs[2].item).toBe(`https://www.pogodka.org/pohoda/kharkiv/${view}`);
	});

	it('російською: /ru/pohoda/kharkiv/zavtra', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, nameRu: 'Харьков' });
		const data = await load('zavtra', '/ru/pohoda/kharkiv/zavtra');

		expect(data.seo.path).toBe('/ru/pohoda/kharkiv/zavtra');
		expect(data.seo.title).toBe('Погода Харьков на завтра — прогноз по часам | Pogodka');
		expect(data.seo.description).toMatch(/^Погода Харьков на завтра, \d+ \S+: от /);
		expect(data.seo.jsonLd['@graph'][0].itemListElement[2].name).toBe('На завтра');
	});

	it('неканонічна назва — 301 на ту саму сторінку прогнозу', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const err = await load('10-dniv', '/pohoda/Kharkiv/10-dniv', 'Kharkiv').catch(
			(e: unknown) => e
		);
		expect(err).toMatchObject({ status: 301, location: '/pohoda/kharkiv/10-dniv' });
	});
});

describe('форма підтримки', () => {
	const submit = async (fields: Record<string, string>) => {
		const { actions } = await import('../../src/routes/support/+page.server');
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) body.set(k, v);
		return actions.default({
			request: new Request('https://x/support', { method: 'POST', body })
		} as AnyEvent);
	};

	it('невалідна форма — 400 з помилками і введеними значеннями', async () => {
		const result = (await submit({
			email: 'bad',
			subject: 'Тема',
			message: 'коротко'
		})) as AnyEvent;

		expect(result.status).toBe(400);
		expect(result.data.errors.email).toBe('Невірний email');
		expect(result.data.values.subject).toBe('Тема');
		expect(support.sendSupportMessage).not.toHaveBeenCalled();
	});

	it('валідна форма — надсилає звернення', async () => {
		support.sendSupportMessage.mockResolvedValue(undefined);
		const result = await submit({
			email: 'a@b.ua',
			subject: 'Тема',
			message: 'Довге повідомлення'
		});

		expect(result).toEqual({ success: true });
	});

	it('збій відправки — 502, введене не губиться', async () => {
		support.sendSupportMessage.mockRejectedValue(new Error('down'));
		const result = (await submit({
			email: 'a@b.ua',
			subject: 'Тема',
			message: 'Довге повідомлення'
		})) as AnyEvent;

		expect(result.status).toBe(502);
		expect(result.data.values.email).toBe('a@b.ua');
	});
});
