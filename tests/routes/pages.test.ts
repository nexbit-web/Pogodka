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

describe('головна сторінка', () => {
	const load = async () =>
		(await import('../../src/routes/+page.server')).load({ setHeaders } as AnyEvent) as Promise<
			Record<string, AnyEvent>
		>;

	it('показує погоду в Києві й кешується на CDN', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, nameUa: 'Київ', path: 'kyiv' });
		const data = await load();

		expect(weather.findCity).toHaveBeenCalledWith('kyiv');
		expect(data.weather.misto).toBe('Харків');
		expect(setHeaders.mock.calls[0][0]['cache-control']).toContain('s-maxage=');
	});

	it('посилається на столицю і всі 23 інші обласні центри', async () => {
		weather.findCity.mockResolvedValue({ ...KHARKIV, path: 'kyiv' });
		const { centres } = await load();

		expect(centres).toHaveLength(24);
		expect(centres[0]).toEqual({ name: 'Київ', path: 'kyiv', note: 'столиця' });
		expect(centres).toContainEqual({
			name: 'Ужгород',
			path: 'uzhhorod',
			note: 'Закарпатська обл.'
		});
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
	const load = async (city: string) =>
		(await import('../../src/routes/pohoda/[city]/+page.server')).load({
			params: { city },
			setHeaders
		} as AnyEvent) as Promise<Record<string, AnyEvent>>;

	it('віддає погоду, місто, сусідів і SEO-дані', async () => {
		weather.findCity.mockResolvedValue(KHARKIV);
		const data = await load('kharkiv');

		expect(data.city).toEqual({ name: 'Харків', region: 'Харківська область', path: 'kharkiv' });
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
