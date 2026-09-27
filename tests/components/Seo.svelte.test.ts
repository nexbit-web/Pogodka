import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Seo from '$lib/components/shared/Seo.svelte';

const links = (rel: string) =>
	[...document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)].map((l) => [
		l.getAttribute('hreflang'),
		l.getAttribute('href')
	]);

afterEach(() => {
	document.head.innerHTML = '';
});

describe('Seo', () => {
	it('перекладена сторінка: canonical на себе, hreflang на обидві мови, x-default — українська', () => {
		render(Seo, { title: 't', description: 'd', path: '/ru/pohoda/lviv/zavtra' });

		expect(links('canonical')).toEqual([[null, 'https://www.pogodka.org/ru/pohoda/lviv/zavtra']]);
		expect(links('alternate')).toEqual([
			['uk', 'https://www.pogodka.org/pohoda/lviv/zavtra'],
			['ru', 'https://www.pogodka.org/ru/pohoda/lviv/zavtra'],
			['x-default', 'https://www.pogodka.org/pohoda/lviv/zavtra']
		]);
		expect(document.head.querySelector('meta[property="og:locale"]')).toHaveAttribute(
			'content',
			'ru_UA'
		);
	});

	it('головна: /ru і корінь сайту', () => {
		render(Seo, { title: 't', description: 'd', path: '/' });
		expect(links('alternate')).toEqual([
			['uk', 'https://www.pogodka.org'],
			['ru', 'https://www.pogodka.org/ru'],
			['x-default', 'https://www.pogodka.org']
		]);
	});

	it('сторінка лише українською — без посилання на неіснуючу російську', () => {
		render(Seo, { title: 't', description: 'd', path: '/about' });
		expect(links('alternate')).toEqual([
			['uk', 'https://www.pogodka.org/about'],
			['x-default', 'https://www.pogodka.org/about']
		]);
	});

	it('noindex — без canonical і hreflang', () => {
		render(Seo, { title: 't', description: 'd', path: '/pohoda/lviv', noindex: true });
		expect(links('canonical')).toEqual([]);
		expect(links('alternate')).toEqual([]);
	});
});
