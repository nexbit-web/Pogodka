import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { setTestPath } from '../setup/app';

const { mode } = vi.hoisted(() => ({
	mode: { current: 'light' as string, setMode: vi.fn() }
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

const SettingsMenu = (await import('$lib/components/shared/SettingsMenu.svelte')).default;

beforeEach(() => {
	mode.current = 'light';
	mode.setMode.mockReset();
	localStorage.clear();
});

afterEach(() => setTestPath('/'));

function setup() {
	const user = userEvent.setup();
	render(SettingsMenu);
	return { user, trigger: screen.getByRole('button', { name: 'Налаштування' }) };
}

describe('SettingsMenu', () => {
	it('закрите за замовчуванням', () => {
		const { trigger } = setup();
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('лише світла й темна теми — без системної; поточна позначена і у фокусі', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		const items = screen.getAllByRole('menuitemradio');
		expect(items.map((i) => i.textContent?.trim())).toEqual([
			'Світла',
			'Темна',
			'Українська',
			'Русский'
		]);
		expect(items[0]).toHaveAttribute('aria-checked', 'true');
		expect(items[0]).toHaveFocus();
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
	});

	it('вибір теми застосовує її і закриває меню', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		await user.click(screen.getByRole('menuitemradio', { name: 'Темна' }));

		expect(mode.setMode).toHaveBeenCalledWith('dark');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('стрілки ходять по колу, Enter вибирає', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Темна' })).toHaveFocus();

		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Світла' })).toHaveFocus();

		await user.keyboard('{ArrowUp}');
		expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus();

		await user.keyboard('{ArrowUp}{ArrowUp}');

		await user.keyboard('{Enter}');
		expect(mode.setMode).toHaveBeenCalledWith('dark');
	});

	it('Escape закриває і повертає фокус на кнопку', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		await user.keyboard('{Escape}');

		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('клік поза меню закриває його', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);
		await user.click(document.body);

		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('стара збережена «системна» тема показується як світла', async () => {
		mode.current = 'system';
		const { user, trigger } = setup();
		await user.click(trigger);

		expect(screen.getByRole('menuitemradio', { name: 'Світла' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});

	it('не блокує прокрутку сторінки (контент не смикається)', async () => {
		const { user, trigger } = setup();
		await user.click(trigger);

		expect(document.body.style.overflow).toBe('');
		expect(document.body.style.paddingRight).toBe('');
	});
});

describe('SettingsMenu — мова', () => {
	it('та сама сторінка іншою мовою; поточна мова позначена', async () => {
		setTestPath('/pohoda/kharkiv/zavtra');
		const { user, trigger } = setup();
		await user.click(trigger);

		const uk = screen.getByRole('menuitemradio', { name: 'Українська' });
		const ru = screen.getByRole('menuitemradio', { name: 'Русский' });
		expect(uk).toHaveAttribute('href', '/pohoda/kharkiv/zavtra');
		expect(ru).toHaveAttribute('href', '/ru/pohoda/kharkiv/zavtra');
		expect(uk).toHaveAttribute('aria-checked', 'true');
		expect(ru).toHaveAttribute('hreflang', 'ru');
	});

	it('на російській сторінці меню російською', async () => {
		setTestPath('/ru/pohoda/kharkiv');
		const user = userEvent.setup();
		render(SettingsMenu);
		await user.click(screen.getByRole('button', { name: 'Настройки' }));

		expect(screen.getByRole('menuitemradio', { name: 'Тёмная' })).toBeInTheDocument();
		expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});

	it('вибір мови запамʼятовується для наступного входу', async () => {
		setTestPath('/pohoda/kharkiv');
		const { user, trigger } = setup();
		await user.click(trigger);
		const ru = screen.getByRole('menuitemradio', { name: 'Русский' });
		ru.addEventListener('click', (e) => e.preventDefault());
		await user.click(ru);

		expect(localStorage.getItem('pogodka-lang')).toBe('ru');
	});
});
