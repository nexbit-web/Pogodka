import { describe, expect, it } from 'vitest';
import {
	HOME_DESCRIPTION,
	HOME_TITLE,
	absoluteUrl,
	breadcrumbLd,
	cityDescription,
	cityPageLd,
	cityTitle,
	graph,
	organizationLd,
	serializeLd,
	shortRegion,
	websiteLd,
	type CitySeoInput
} from '$lib/seo';

const kharkiv: CitySeoInput = {
	name: 'Харків',
	region: 'Харківська область',
	path: 'kharkiv',
	slug: 'kharkiv',
	now: { temp: 16.4, feels: 14.6, code: 3 },
	tomorrow: { min: 9, max: 18 }
};

describe('заголовки й описи', () => {
	it('заголовок міста: ключова фраза на початку, до 65 символів', () => {
		const title = cityTitle(kharkiv);
		expect(title).toBe('Погода Харків: прогноз на сьогодні, завтра і 7 днів | Pogodka');
		expect(title.length).toBeLessThanOrEqual(65);
	});

	it('однойменний населений пункт — з областю в заголовку й описі', () => {
		const village = {
			...kharkiv,
			name: 'Львів',
			region: 'Миколаївська область',
			path: 'lviv-mykolaivska',
			slug: 'lviv'
		};
		expect(cityTitle(village)).toBe(
			'Погода Львів (Миколаївська обл.) — прогноз на 7 днів | Pogodka'
		);
		expect(cityDescription(village)).toMatch(/^Погода Львів \(Миколаївська обл\.\) зараз/);
	});

	it('опис живий: поточна погода і завтра', () => {
		expect(cityDescription(kharkiv)).toBe(
			'Погода Харків зараз: +16°, пасмурно, відчувається як +15°. Завтра від +9° до +18°. ' +
				'Точний прогноз на 7 днів по годинах: температура, опади, вітер, тиск і вологість.'
		);
	});

	it('без даних на завтра опис усе одно коректний', () => {
		const text = cityDescription({ ...kharkiv, tomorrow: undefined });
		expect(text).not.toContain('Завтра');
		expect(text).not.toMatch(/undefined|NaN/);
	});

	it('заголовок головної — під запит «погода в Україні»', () => {
		expect(HOME_TITLE).toMatch(/^Погода в Україні/);
		expect(HOME_TITLE.length).toBeLessThanOrEqual(65);
		expect(HOME_DESCRIPTION.length).toBeGreaterThan(120);
		expect(HOME_DESCRIPTION.length).toBeLessThanOrEqual(200);
	});

	it('скорочення області', () => {
		expect(shortRegion('Сумська область')).toBe('Сумська обл.');
		expect(shortRegion('Київ')).toBe('Київ');
	});

	it('абсолютні адреси без подвійного слеша', () => {
		expect(absoluteUrl('/')).toBe('https://www.pogodka.org');
		expect(absoluteUrl('/pohoda/lviv')).toBe('https://www.pogodka.org/pohoda/lviv');
	});
});

describe('структуровані дані schema.org', () => {
	it('Organization з логотипом і соцмережами', () => {
		const org = organizationLd();
		expect(org['@type']).toBe('Organization');
		expect(org.logo).toMatchObject({ url: 'https://www.pogodka.org/icon-512x512.png' });
		expect(org.sameAs).toContain('https://www.youtube.com/@Pogodka-UA');
	});

	it('WebSite з пошуком, який справді працює на сайті', () => {
		const site = websiteLd();
		expect(site.inLanguage).toBe('uk');
		expect(JSON.stringify(site.potentialAction)).toContain('/pohoda/{search_term_string}');
	});

	it('хлібні крихти з абсолютними адресами і позиціями', () => {
		const ld = breadcrumbLd([
			{ name: 'Прогноз погоди', path: '/' },
			{ name: 'Погода Львів', path: '/pohoda/lviv' }
		]) as { itemListElement: { position: number; item: string }[] };

		expect(ld.itemListElement.map((i) => [i.position, i.item])).toEqual([
			[1, 'https://www.pogodka.org'],
			[2, 'https://www.pogodka.org/pohoda/lviv']
		]);
	});

	it('WebPage про місце: координати, область, країна', () => {
		const page = cityPageLd({
			name: 'Харків',
			region: 'Харківська область',
			path: 'kharkiv',
			title: 't',
			description: 'd',
			latitude: 49.99,
			longitude: 36.23,
			updated: '2026-09-25T12:00:00.000Z'
		}) as Record<string, Record<string, unknown>>;

		expect(page['@type']).toBe('WebPage');
		expect(page.about).toMatchObject({
			'@type': 'Place',
			geo: { latitude: 49.99, longitude: 36.23 },
			address: { addressRegion: 'Харківська область', addressCountry: 'UA' },
			containedInPlace: { '@type': 'AdministrativeArea', name: 'Харківська область' }
		});
	});

	it('для столиці не пише «область Київ»', () => {
		const page = cityPageLd({
			name: 'Київ',
			region: 'Київ',
			path: 'kyiv',
			title: 't',
			description: 'd',
			latitude: 50.45,
			longitude: 30.52,
			updated: '2026-09-25T12:00:00.000Z'
		}) as Record<string, Record<string, Record<string, unknown>>>;

		expect(page.about.address.addressRegion).toBeUndefined();
		expect(page.about.containedInPlace).toBeUndefined();
	});

	it('використовує лише реальні типи schema.org', () => {
		const all = JSON.stringify(graph(organizationLd(), websiteLd()));
		expect(all).not.toMatch(/WeatherForecast/);
	});

	it('серіалізація не дає закрити <script> зсередини даних', () => {
		const text = serializeLd({ name: '</script><script>alert(1)</script>' });
		expect(text).not.toContain('</script>');
		expect(JSON.parse(text).name).toBe('</script><script>alert(1)</script>');
	});
});
