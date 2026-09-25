import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

const PrivacyPolicy = (await import('../../src/routes/privacypolicy/+page.svelte')).default;
const About = (await import('../../src/routes/about/+page.svelte')).default;

const hrefs = () => screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');

describe('Політика конфіденційності', () => {
	it('містить обовʼязкові для AdSense розкриття про cookie Google', () => {
		render(PrivacyPolicy);

		expect(
			screen.getByRole('heading', { level: 1, name: 'Політика конфіденційності' })
		).toBeInTheDocument();
		const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
		expect(text).toContain('Сторонні постачальники, зокрема Google, використовують файли cookie');
		expect(text).toContain('Рекламні файли cookie дозволяють Google і його партнерам');
		expect(text).toMatch(/Європейської економічної зони/);
	});

	it('веде на сторінки відмови від персоналізованої реклами', () => {
		render(PrivacyPolicy);

		expect(hrefs()).toEqual(
			expect.arrayContaining([
				'https://adssettings.google.com/',
				'https://www.aboutads.info/choices/',
				'https://www.youronlinechoices.eu/',
				'https://policies.google.com/technologies/partner-sites?hl=uk'
			])
		);
	});

	it('зовнішні посилання відкриваються безпечно', () => {
		render(PrivacyPolicy);

		for (const link of screen.getAllByRole('link')) {
			if (link.getAttribute('target') === '_blank') {
				expect(link.getAttribute('rel')).toContain('noopener');
			}
		}
	});
});

describe('Про нас', () => {
	it('заголовок, джерело даних і контакти', () => {
		render(About);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Про Pogodka\./);
		expect(hrefs()).toEqual(
			expect.arrayContaining([
				'https://open-meteo.com/',
				'mailto:pogodkacontact@gmail.com',
				'/support',
				'/privacypolicy'
			])
		);
	});

	it('структуровані дані AboutPage з канонічною адресою', () => {
		render(About);

		const ld = document.head.querySelector('script[type="application/ld+json"]');
		const types = (JSON.parse(ld!.textContent!)['@graph'] as { '@type': string }[]).map(
			(item) => item['@type']
		);
		expect(types).toEqual(['Organization', 'AboutPage', 'BreadcrumbList']);
		expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://www.pogodka.org/about'
		);
	});
});
