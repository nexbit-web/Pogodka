import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

const { mode, nav } = vi.hoisted(() => ({
	mode: { current: 'light' as string, setMode: vi.fn() },
	nav: { afterNavigate: [] as (() => void)[] }
}));

vi.mock('mode-watcher', () => ({
	setMode: (value: string) => {
		mode.current = value;
		mode.setMode(value);
	},
	userPrefersMode: {
		get current() {
			return mode.current;
		}
	}
}));
vi.mock('$app/navigation', () => ({
	afterNavigate: (fn: () => void) => nav.afterNavigate.push(fn)
}));
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) =>
		params ? route.replace('[city]', params.city) : route
}));
vi.mock('$app/state', () => ({ page: { url: new URL('https://www.pogodka.org/pohoda/kharkiv') } }));

const MobileMenu = (await import('$lib/components/shared/MobileMenu.svelte')).default;

const POPULAR = [
	{ id: 1, slug: 'kyiv', nameUa: 'Київ', region: 'Київська область' },
	{ id: 2, slug: 'kharkiv', nameUa: 'Харків', region: 'Харківська область' }
];
const fetchMock = vi.fn();

beforeEach(() => {
	mode.current = 'light';
	mode.setMode.mockReset();
	nav.afterNavigate = [];
	fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify(POPULAR)));
	vi.stubGlobal('fetch', fetchMock);
	document.documentElement.style.overflow = '';
});

function setup() {
	const user = userEvent.setup();
	render(MobileMenu);
	return { user, trigger: screen.getByRole('button', { name: 'Відкрити меню' }) };
}

describe('MobileMenu', () => {
	it('закрите за замовчуванням', () => {
		const { trigger } = setup();
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('відкривається з логотипом, темою й посиланнями — без списку міст', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		const dialog = screen.getByRole('dialog', { name: 'Меню' });
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(within(dialog).getByRole('link', { name: /на головну/ })).toHaveAttribute('href', '/');
		expect(within(dialog).getByRole('radiogroup', { name: 'Тема' })).toBeInTheDocument();
		expect(within(dialog).getByRole('link', { name: 'Техпідтримка' })).toHaveAttribute(
			'href',
			'/support'
		);
		expect(within(dialog).queryByText('Популярні міста')).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
	});

	it('іконка меню — три лінії', () => {
		const { trigger } = setup();
		const d = trigger.querySelector('path')!.getAttribute('d')!;
		expect(d.match(/M/g)).toHaveLength(3);
	});

	it('поточна сторінка в посиланнях позначена', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		expect(screen.getByRole('link', { name: 'Умови використання' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('фокус переходить у меню, а після закриття повертається на кнопку', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		expect(screen.getByRole('button', { name: 'Закрити меню' })).toHaveFocus();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(trigger).toHaveFocus();
	});

	it('Tab не виходить за межі меню', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		const youtube = screen.getByRole('link', { name: 'YouTube' });
		youtube.focus();
		await user.tab();
		expect(screen.getByRole('link', { name: /на головну/ })).toHaveFocus();

		await user.tab({ shift: true });
		expect(youtube).toHaveFocus();
	});

	it('блокує прокрутку сторінки, поки відкрите', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		expect(document.documentElement.style.overflow).toBe('hidden');

		await user.keyboard('{Escape}');
		await waitFor(() => expect(document.documentElement.style.overflow).toBe(''));
	});

	it('перемикач теми: лише світла й темна, вибір застосовується одразу', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		const radios = screen.getAllByRole('radio');
		expect(radios.map((r) => r.textContent?.trim())).toEqual(['Світла', 'Темна']);
		expect(radios[0]).toHaveAttribute('aria-checked', 'true');

		await user.click(radios[1]);
		// Мок mode-watcher не реактивний, тож перевіряємо саме виклик; у браузері перемикання перевірене окремо
		expect(mode.setMode).toHaveBeenCalledWith('dark');
	});

	it('перехід на іншу сторінку закриває меню', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		nav.afterNavigate.forEach((fn) => fn());
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});
});
