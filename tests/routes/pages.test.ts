import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';
import { makeApiResponse, makeForecast } from '../fixtures/forecast';

const { weather, support } = vi.hoisted(() => ({
	weather: { getCityWeather: vi.fn(), findCity: vi.fn() },
	support: { sendSupportMessage: vi.fn() }
}));

vi.mock('$lib/server/weather', () => weather);
vi.mock('$lib/server/support', () => support);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvent = any;

beforeEach(() => {
	weather.getCityWeather.mockReset();
	weather.findCity.mockReset();
	support.sendSupportMessage.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('головна сторінка', () => {
	it('показує погоду в Києві', async () => {
		const data = makeApiResponse(makeForecast(), { misto: 'Київ' });
		weather.getCityWeather.mockResolvedValue(data);
		const { load } = await import('../../src/routes/+page.server');

		expect(await load({} as AnyEvent)).toEqual({ weather: data });
		expect(weather.getCityWeather).toHaveBeenCalledWith('kyiv');
	});
});

describe('сторінка міста /pohoda/[city]', () => {
	const load = async (city: string) =>
		(await import('../../src/routes/pohoda/[city]/+page.server')).load({
			params: { city }
		} as AnyEvent) as Promise<Record<string, AnyEvent>>;

	it('віддає погоду, назву, слаг і JSON-LD', async () => {
		weather.getCityWeather.mockResolvedValue(makeApiResponse());
		weather.findCity.mockResolvedValue({ nameUa: 'Харків', slug: 'kharkiv' });

		const data = await load('kharkiv');

		expect(data.titleCity).toBe('Харків');
		expect(data.slug).toBe('kharkiv');
		expect(data.jsonLd['@type']).toBe('City');
		expect(data.jsonLd.url).toBe('https://www.pogodka.org/pohoda/kharkiv');
		expect(data.jsonLd.dailyForecast).toHaveLength(7);
		expect(data.jsonLd.weather.windSpeed.unitCode).toBe('MTS');
	});

	it('декодує кирилицю з URL', async () => {
		weather.getCityWeather.mockResolvedValue(makeApiResponse());
		weather.findCity.mockResolvedValue(null);

		const data = await load(encodeURIComponent('Харків'));

		expect(weather.getCityWeather).toHaveBeenCalledWith('Харків');
		expect(data.titleCity).toBe('Харків');
	});

	it('JSON-LD серіалізується без помилок і NaN', async () => {
		weather.getCityWeather.mockResolvedValue(makeApiResponse());
		weather.findCity.mockResolvedValue({ nameUa: 'Харків', slug: 'kharkiv' });

		const json = JSON.stringify((await load('kharkiv')).jsonLd);
		expect(json).not.toMatch(/NaN|undefined|null/);
	});

	it('невідоме місто — 404 від сервісу погоди', async () => {
		weather.getCityWeather.mockImplementation(() => error(404, 'Місто не знайдено'));
		weather.findCity.mockResolvedValue(null);

		await expect(load('atlantyda')).rejects.toMatchObject({ status: 404 });
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
