import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import pkg from '../../package.json';

vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

const Footer = (await import('$lib/components/shared/Footer.svelte')).default;
const PartnerBanner = (await import('$lib/components/shared/PartnerBanner.svelte')).default;
const WeatherHeadline = (await import('$lib/components/shared/WeatherHeadline.svelte')).default;

describe('Footer', () => {
	it('ланцюжок: іконка → Прогноз погоди → область → місто', () => {
		render(Footer, { breadcrumb: 'Харків', region: 'Харківська область' });

		const crumbs = screen.getByRole('navigation', { name: 'Навігаційний ланцюжок' });
		expect(crumbs).toHaveTextContent(/Прогноз погоди\s*Харківська область\s*Харків/);
		expect(screen.getByText('Харків')).toHaveAttribute('aria-current', 'page');
	});

	it('без області ланцюжок не має порожніх кроків', () => {
		render(Footer, { breadcrumb: 'Техпідтримка' });
		const items = screen
			.getByRole('navigation', { name: 'Навігаційний ланцюжок' })
			.querySelectorAll('li');
		expect(Array.from(items).every((li) => li.textContent !== null)).toBe(true);
		expect(items).toHaveLength(5);
	});

	it('правові посилання, YouTube і версія застосунку', () => {
		render(Footer, {});

		expect(screen.getByRole('link', { name: 'Політика конфіденційності' })).toHaveAttribute(
			'href',
			'/privacypolicy'
		);
		expect(screen.getByRole('link', { name: 'Умови використання' })).toHaveAttribute(
			'href',
			'/agreement'
		);
		expect(screen.getByRole('link', { name: 'Техпідтримка' })).toHaveAttribute('href', '/support');

		const youtube = screen.getByRole('link', { name: 'YouTube' });
		expect(youtube).toHaveAttribute('target', '_blank');
		expect(youtube.getAttribute('rel')).toContain('noopener');

		expect(screen.getByText(`v${pkg.version}`)).toBeInTheDocument();
		expect(screen.getByText(new RegExp(`${new Date().getFullYear()}`))).toBeInTheDocument();
	});
});

describe('PartnerBanner', () => {
	it('веде на магазин LilyLook у новій вкладці, без позначки «Реклама»', () => {
		render(PartnerBanner);

		// Власний продукт — без позначки «Реклама»
		expect(screen.getByRole('complementary', { name: /LilyLook/ })).not.toHaveTextContent(
			'Реклама'
		);
		const link = screen.getByRole('link');
		expect(new URL(link.getAttribute('href')!).origin).toBe('https://lilylook.store');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link.getAttribute('rel')).not.toContain('sponsored');
		expect(link.getAttribute('rel')).toContain('noopener');
	});

	it('картинка не зсуває сторінку і вантажиться ліниво', () => {
		render(PartnerBanner);
		const img = screen.getByRole('img');

		expect(img).toHaveAttribute('width', '2172');
		expect(img).toHaveAttribute('height', '724');
		expect(img).toHaveAttribute('loading', 'lazy');
		expect(img.getAttribute('alt')).toContain('LilyLook');
	});
});

describe('WeatherHeadline', () => {
	it('місто — головний заголовок сторінки, температура округлена', () => {
		render(WeatherHeadline, { city: 'Харків', temperature: 16.6, weather: 3, isFelt: 14.5 });

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Харків');
		expect(screen.getAllByText(/^17°?$/).length).toBeGreaterThan(0);
		expect(screen.getAllByText('Пасмурно').length).toBeGreaterThan(0);
		expect(screen.getByText('Відчувається як 15°')).toBeInTheDocument();
	});

	it('знімає обробники прокрутки при виході зі сторінки', () => {
		const add = vi.spyOn(window, 'addEventListener');
		const remove = vi.spyOn(window, 'removeEventListener');

		const { unmount } = render(WeatherHeadline, {
			city: 'Київ',
			temperature: 1,
			weather: 0,
			isFelt: 0
		});
		const added = add.mock.calls.filter(([type]) => type === 'scroll' || type === 'resize').length;
		unmount();
		const removed = remove.mock.calls.filter(
			([type]) => type === 'scroll' || type === 'resize'
		).length;

		expect(added).toBe(2);
		expect(removed).toBe(added);
	});
});
