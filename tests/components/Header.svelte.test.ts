import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

const { goto, pageState } = vi.hoisted(() => ({
	goto: vi.fn(),
	pageState: { url: new URL('https://www.pogodka.org/') }
}));

vi.mock('$app/navigation', () => ({ goto, afterNavigate: vi.fn() }));
vi.mock('$app/state', () => ({ page: pageState, navigating: { to: null } }));
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) =>
		params ? route.replace('[city]', params.city) : route
}));

const Header = (await import('$lib/components/shared/Header.svelte')).default;

const LVIV = [
	{
		id: 3,
		slug: 'lviv',
		path: 'lviv',
		nameUa: 'Львів',
		nameRu: 'Львов',
		region: 'Львівська область'
	},
	{
		id: 4,
		slug: 'lvivka',
		path: 'lvivka',
		nameUa: 'Львівка',
		nameRu: 'Львовка',
		region: 'Житомирська область'
	}
];

const fetchMock = vi.fn();

beforeEach(() => {
	goto.mockReset();
	pageState.url = new URL('https://www.pogodka.org/');
	localStorage.clear();
	fetchMock.mockReset().mockImplementation((url: string) => {
		const q = new URL(url, 'https://x').searchParams.get('q') ?? '';
		const data = /^(Льв|Lv)/.test(q) ? LVIV : [];
		return Promise.resolve(new Response(JSON.stringify(data)));
	});
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.useRealTimers();
});

function setup(path = '/') {
	pageState.url = new URL(`https://www.pogodka.org${path}`);
	const user = userEvent.setup();
	render(Header);
	return { user, input: screen.getByRole('combobox') };
}

const typeAndWait = async (user: ReturnType<typeof userEvent.setup>, input: HTMLElement) => {
	await user.click(input);
	await user.type(input, 'Льв');
	await screen.findByText('Львівка');
};

describe('Header', () => {
	it('логотип веде на головну', () => {
		setup();
		expect(screen.getByRole('link', { name: /на головну/ })).toHaveAttribute('href', '/');
	});

	it('до введення нічого не вантажить', async () => {
		const { user, input } = setup();
		await user.click(input);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('на телефоні — кнопка бокового меню, на компʼютері — налаштування', () => {
		setup();
		expect(screen.getByRole('button', { name: 'Відкрити меню' }).parentElement).toHaveClass(
			'sm:hidden'
		);
		expect(
			screen.getByRole('button', { name: 'Налаштування' }).closest('[class~="max-sm:hidden"]')
		).not.toBeNull();
		expect(screen.getByRole('link', { name: /на головну/ })).toHaveClass('max-sm:hidden');
	});

	it('пошук з дебаунсом: один запит на все введене слово, результати з областю', async () => {
		const { user, input } = setup();
		await typeAndWait(user, input);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const options = screen.getAllByRole('option');
		expect(options[1]).toHaveTextContent('Львівка, Житомирська область');
		expect(options[1]).toHaveAttribute('href', '/pohoda/lvivka');
		expect(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('нічого не знайдено — повідомлення', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Qwerty');

		expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument();
	});

	it('стрілки підсвічують місто, Enter відкриває його', async () => {
		const { user, input } = setup();
		await typeAndWait(user, input);

		await user.keyboard('{ArrowDown}{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'city-option-1');

		await user.keyboard('{Enter}');
		expect(goto).toHaveBeenCalledWith('/pohoda/lvivka');
	});

	it('Enter без вибору відкриває перше знайдене місто', async () => {
		const { user, input } = setup();
		await typeAndWait(user, input);

		await user.keyboard('{Enter}');
		expect(goto).toHaveBeenCalledWith('/pohoda/lviv');
	});

	it('Enter до приходу результатів — сторінка сама знайде місто за назвою', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Одеса{Enter}');
		expect(goto).toHaveBeenCalledWith('/pohoda/Одеса');
	});

	it('порожнє поле: Enter нікуди не веде', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.keyboard('{Enter}');
		expect(goto).not.toHaveBeenCalled();
		expect(input).toHaveFocus();
	});

	it('хрестик очищає поле, Escape закриває список', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Льв');

		await user.click(screen.getByRole('button', { name: 'Очистити пошук' }));
		expect(input).toHaveValue('');
		expect(input).toHaveFocus();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
	});

	it('помилка мережі не ламає пошук', async () => {
		fetchMock.mockRejectedValue(new TypeError('offline'));
		const { user, input } = setup();

		await user.click(input);
		await user.type(input, 'Льв');

		expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument();
	});
});

describe('історія переглянутих', () => {
	const HISTORY = [
		{ path: 'odesa', name: 'Одеса', region: 'Одеська область' },
		{ path: 'lviv', name: 'Львів', region: 'Львівська область' }
	];

	it('порожнє поле — «Нещодавні», без поточної сторінки', async () => {
		localStorage.setItem('pogodka-history', JSON.stringify(HISTORY));
		const { user, input } = setup('/pohoda/lviv');
		await user.click(input);

		expect(screen.getByText('Нещодавні')).toBeInTheDocument();
		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Одеса, Одеська область');
	});

	it('«Очистити» стирає історію', async () => {
		localStorage.setItem('pogodka-history', JSON.stringify(HISTORY));
		const { user, input } = setup();
		await user.click(input);

		await user.click(screen.getByRole('button', { name: 'Очистити' }));
		expect(screen.queryByText('Нещодавні')).not.toBeInTheDocument();
		expect(localStorage.getItem('pogodka-history')).toBeNull();
	});
});

describe('моє місцезнаходження', () => {
	it('веде на найближчий населений пункт', async () => {
		vi.stubGlobal('navigator', {
			...navigator,
			geolocation: {
				getCurrentPosition: (ok: PositionCallback) =>
					ok({ coords: { latitude: 46.84, longitude: 30.08 } } as GeolocationPosition)
			}
		});
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ path: 'rozdilna' })));
		const { user, input } = setup();
		await user.click(input);

		await user.click(await screen.findByRole('button', { name: /Моє місцезнаходження/ }));
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/pohoda/rozdilna'));
		expect(fetchMock.mock.calls[0][0]).toContain('/api/cities/nearest?lat=46.8400&lon=30.0800');
	});
});

describe('російська версія', () => {
	it('тексти, назви й адреси — російською', async () => {
		const { user, input } = setup('/ru/pohoda/kyiv');

		expect(input).toHaveAttribute('placeholder', 'Город или село');
		expect(screen.getByRole('link', { name: /на главную/ })).toHaveAttribute('href', '/ru');

		await user.click(input);
		await user.type(input, 'Льв');
		const option = await screen.findByText('Львовка');
		expect(option.closest('a')).toHaveTextContent('Львовка, Житомирская область');
		expect(option.closest('a')).toHaveAttribute('href', '/ru/pohoda/lvivka');

		await user.keyboard('{Enter}');
		expect(goto).toHaveBeenCalledWith('/ru/pohoda/lviv');
	});
});
