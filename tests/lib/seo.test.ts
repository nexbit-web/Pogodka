import { describe, expect, it } from 'vitest';
import {
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
	viewDescription,
	viewTitle,
	homeDescription,
	homeTitle,
	type CitySeoInput
} from '$lib/seo';
import { buildForecastDays } from '$lib/weather';
import { viewDays } from '$lib/forecastViews';
import { makeForecast } from '../fixtures/forecast';

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
			'Погода Харків зараз: +16°, похмуро, відчувається як +15°. Завтра від +9° до +18°. ' +
				'Точний прогноз на 7 днів по годинах: температура, опади, вітер, тиск і вологість.'
		);
	});

	it('без даних на завтра опис усе одно коректний', () => {
		const text = cityDescription({ ...kharkiv, tomorrow: undefined });
		expect(text).not.toContain('Завтра');
		expect(text).not.toMatch(/undefined|NaN/);
	});

	it('заголовок головної — назва сайту першою, латиницею й кирилицею', () => {
		expect(homeTitle()).toMatch(/^Pogodka \(Погодка\) — прогноз погоди в Україні/);
		expect(homeTitle().length).toBeLessThanOrEqual(65);
		expect(homeDescription().length).toBeGreaterThan(120);
		expect(homeDescription().length).toBeLessThanOrEqual(200);
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
		expect(site.inLanguage).toEqual(['uk', 'ru']);
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
			pagePath: '/pohoda/kharkiv',
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
			pagePath: '/pohoda/kyiv',
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

describe('сторінки «на завтра», «на 10 днів», «на вихідні»', () => {
	// Прогноз від неділі: 27 вересня 2026 — неділя
	const days = buildForecastDays(
		makeForecast({ start: '2026-09-27', days: 10, hour: (d) => ({ temp: 10 + d, code: 2 }) })
	);

	it('заголовки: ключова фраза на початку, до 65 символів', () => {
		for (const view of ['zavtra', '10-dniv', 'vykhidni'] as const) {
			const title = viewTitle(kharkiv, view);
			expect(title).toMatch(/^Погода Харків на /);
			expect(title.length, title).toBeLessThanOrEqual(65);
		}
	});

	it('«на завтра» — дата і температура завтра', () => {
		expect(viewDescription(kharkiv, 'zavtra', viewDays(days, 'zavtra').days)).toMatch(
			/^Погода Харків на завтра, 28 вересня: від \+\d+° до \+\d+°, частково хмарно\./
		);
	});

	it('«на 10 днів» — діапазон за всі дні', () => {
		expect(viewDescription(kharkiv, '10-dniv', days)).toMatch(/^Погода Харків на 10 днів: від /);
	});

	it('«на вихідні» в неділю: сьогодні й наступні вихідні, а не «неділя; субота»', () => {
		const weekend = viewDays(days, 'vykhidni').days;
		expect(weekend.map((d) => d.date)).toEqual(['2026-09-27', '2026-10-03', '2026-10-04']);
		const text = viewDescription(kharkiv, 'vykhidni', weekend);
		expect(text).toMatch(/^Погода Харків на вихідні: сьогодні неділя 27 вересня — /);
		expect(text).toContain('; наступні вихідні — ');
	});

	it('російською', () => {
		const ru = { ...kharkiv, name: 'Харьков', region: 'Харьковская область', lang: 'ru' as const };
		expect(viewTitle(ru, 'vykhidni')).toBe(
			'Погода Харьков на выходные — суббота и воскресенье | Pogodka'
		);
		expect(viewDescription(ru, 'zavtra', viewDays(days, 'zavtra').days)).toMatch(
			/^Погода Харьков на завтра, 28 сентября: от \+\d+° до \+\d+°, переменная облачность\./
		);
		expect(cityTitle(ru)).toBe('Погода Харьков: прогноз на сегодня, завтра и 7 дней | Pogodka');
		expect(cityDescription(ru)).toMatch(
			/^Погода Харьков сейчас: \+16°, пасмурно, ощущается как \+15°/
		);
		expect(homeTitle('ru')).toBe('Pogodka (Погодка) — прогноз погоды в Украине на 7 дней');
	});

	it('WebPage з мовою й повною адресою сторінки', () => {
		const page = cityPageLd({
			name: 'Харьков',
			region: 'Харьковская область',
			pagePath: '/ru/pohoda/kharkiv/zavtra',
			lang: 'ru',
			title: 't',
			description: 'd',
			latitude: 49.99,
			longitude: 36.23,
			updated: '2026-09-25T12:00:00.000Z'
		});
		expect(page).toMatchObject({
			url: 'https://www.pogodka.org/ru/pohoda/kharkiv/zavtra',
			inLanguage: 'ru'
		});
	});
});
