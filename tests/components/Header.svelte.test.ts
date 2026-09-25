import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));

vi.mock('$app/navigation', () => ({ goto, afterNavigate: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('https://www.pogodka.org/') } }));
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) =>
		params ? route.replace('[city]', params.city) : route
}));

const Header = (await import('$lib/components/shared/Header.svelte')).default;

const POPULAR = [
	{ id: 1, slug: 'kyiv', nameUa: 'Київ', region: 'Київська область' },
	{ id: 2, slug: 'kharkiv', nameUa: 'Харків', region: 'Харківська область' }
];
const LVIV = [
	{ id: 3, slug: 'lviv', nameUa: 'Львів', region: 'Львівська область' },
	{ id: 4, slug: 'lvivka', nameUa: 'Львівка', region: 'Житомирська область' }
];

const fetchMock = vi.fn();

beforeEach(() => {
	goto.mockReset();
	fetchMock.mockReset().mockImplementation((url: string) => {
		const q = new URL(url, 'https://x').searchParams.get('q') ?? '';
		const data = q.length < 2 ? POPULAR : q.startsWith('Льв') ? LVIV : [];
		return Promise.resolve(new Response(JSON.stringify(data)));
	});
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.useRealTimers();
});

function setup() {
	const user = userEvent.setup();
	render(Header);
	return { user, input: screen.getByRole('combobox') };
}

describe('Header', () => {
	it('логотип веде на головну', () => {
		setup();
		expect(screen.getByRole('link', { name: /на головну/ })).toHaveAttribute('href', '/');
	});

	it('популярні міста не вантажаться, доки пошуком не скористались', () => {
		setup();
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

	it('при фокусі показує популярні міста з областю', async () => {
		const { user, input } = setup();

		await user.click(input);

		const options = await screen.findAllByRole('option');
		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent('Київ, Київська область');
		expect(options[0]).toHaveAttribute('href', '/pohoda/kyiv');
		expect(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('пошук з дебаунсом: один запит на все введене слово', async () => {
		const { user, input } = setup();
		await user.click(input);
		fetchMock.mockClear();

		await user.type(input, 'Льв');

		expect(await screen.findByText('Львівка')).toBeInTheDocument();
		const searches = fetchMock.mock.calls.filter(([url]) => String(url).includes('q=%D0'));
		expect(searches).toHaveLength(1);
	});

	it('нічого не знайдено — повідомлення', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Qwerty');

		expect(await screen.findByText('Місто не знайдено')).toBeInTheDocument();
	});

	it('стрілки підсвічують місто, Enter відкриває його', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Льв');
		await screen.findByText('Львівка');

		await user.keyboard('{ArrowDown}{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'city-option-1');

		await user.keyboard('{Enter}');
		expect(goto).toHaveBeenCalledWith('/pohoda/lvivka');
	});

	it('Enter без вибору відкриває перше знайдене місто', async () => {
		const { user, input } = setup();
		await user.click(input);
		await user.type(input, 'Льв');
		await screen.findByText('Львівка');

		await user.keyboard('{Enter}');
		expect(goto).toHaveBeenCalledWith('/pohoda/lviv');
	});

	it('Enter по популярних без вибору нікуди не веде', async () => {
		const { user, input } = setup();
		await user.click(input);
		await screen.findAllByRole('option');

		await user.keyboard('{Enter}');
		expect(goto).not.toHaveBeenCalled();
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

		expect(await screen.findByText('Місто не знайдено')).toBeInTheDocument();
	});
});
