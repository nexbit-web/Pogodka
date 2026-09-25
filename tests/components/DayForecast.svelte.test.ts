import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';
import DayForecast from '$lib/components/shared/DayForecast.svelte';
import { makeForecast, todayKyiv } from '../fixtures/forecast';

const today = todayKyiv();
const weekdayOf = (offset: number) =>
	DateTime.fromISO(today, { zone: 'Europe/Kyiv' }).plus({ days: offset }).weekday;

function setup(weather = makeForecast()) {
	const user = userEvent.setup();
	render(DayForecast, { weather });
	return { user, tabs: screen.getAllByRole('tab') };
}

describe('DayForecast — стрічка днів', () => {
	it('показує 7 днів, перший — «Сьогодні» і вибраний', () => {
		const { tabs } = setup();

		expect(tabs).toHaveLength(7);
		expect(tabs[0]).toHaveTextContent('Сьогодні');
		expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
		expect(tabs.slice(1).every((t) => t.getAttribute('aria-selected') === 'false')).toBe(true);
	});

	it('мін./макс. зі знаком', () => {
		const weather = makeForecast({ hour: (d) => (d === 0 ? { temp: -3 } : {}) });
		const { tabs } = setup(weather);
		expect(tabs[0]).toHaveTextContent('−3°');
	});

	it('субота й неділя — червоні, будні — ні', () => {
		const { tabs } = setup();

		tabs.forEach((tab, idx) => {
			const weekend = weekdayOf(idx) >= 6;
			const red = tab.querySelector('.text-weekend');
			expect(Boolean(red), `день ${idx}`).toBe(weekend);
		});
	});

	it('клік по дню відкриває його деталі', async () => {
		const { user, tabs } = setup();

		await user.click(tabs[2]);

		expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
		expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
		const panel = screen.getByRole('tabpanel');
		const date = DateTime.fromISO(today).plus({ days: 2 }).day;
		expect(panel).toHaveTextContent(String(date));
		// «Зараз» буває лише в сьогоднішньому дні
		expect(within(panel).queryByText('Зараз')).not.toBeInTheDocument();
	});

	it('стрілки на клавіатурі перемикають дні і не виходять за межі', async () => {
		const { user, tabs } = setup();

		tabs[0].focus();
		await user.keyboard('{ArrowLeft}');
		expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

		await user.keyboard('{ArrowRight}{ArrowRight}');
		expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
		expect(tabs[2]).toHaveFocus();

		for (let i = 0; i < 10; i++) await user.keyboard('{ArrowRight}');
		expect(tabs[6]).toHaveAttribute('aria-selected', 'true');
	});

	it('лише вибраний день доступний через Tab (roving tabindex)', () => {
		const { tabs } = setup();
		expect(tabs.filter((t) => t.tabIndex === 0)).toHaveLength(1);
	});
});

describe('DayForecast — таблиця дня', () => {
	it('8 тригодинних колонок по частинах доби', () => {
		setup();
		const table = screen.getByRole('table');

		expect(
			within(table).getAllByRole('columnheader', { name: /^(ніч|ранок|день|вечір)$/ })
		).toHaveLength(4);
		// Години: 0:00 … 21:00, поточна замінена на «Зараз»
		const hours = within(table)
			.getAllByRole('columnheader')
			.map((th) => th.textContent?.trim())
			.filter((t) => t && /^\d{1,2}:00$|^Зараз$/.test(t));
		expect(hours).toHaveLength(8);
		expect(hours).toContain('Зараз');
	});

	it('усі рядки показників на місці', () => {
		setup();
		for (const label of [
			'Температура',
			'Відчувається як',
			'Тиск, мм',
			'Вологість, %',
			'Вітер, м/с',
			'Ймовірність опадів, %',
			'Опади, мм'
		]) {
			expect(screen.getByRole('rowheader', { name: label })).toBeInTheDocument();
		}
	});

	it('тиск — у мм рт. ст., опади — прочерк, коли їх немає', () => {
		setup(makeForecast({ hour: () => ({ pressure: 1013.25 }) }));
		const pressureRow = screen.getByRole('rowheader', { name: 'Тиск, мм' }).closest('tr')!;
		expect(within(pressureRow).getAllByText('760')).toHaveLength(8);

		const precipRow = screen.getByRole('rowheader', { name: 'Опади, мм' }).closest('tr')!;
		expect(within(precipRow).getAllByText('—')).toHaveLength(8);
	});

	it('дощові значення виділені кольором', () => {
		setup(
			makeForecast({ hour: (d, hr) => (d === 0 && hr === 12 ? { code: 63, precip: 2.4 } : {}) })
		);
		const cell = screen.getByText('2.4');
		expect(cell).toHaveClass('text-primary');
	});

	it('без ймовірності опадів (старий кеш) рядок не показується і нічого не падає', () => {
		setup(makeForecast({ legacy: true }));
		expect(
			screen.queryByRole('rowheader', { name: 'Ймовірність опадів, %' })
		).not.toBeInTheDocument();
		expect(screen.queryByText('Схід сонця')).not.toBeInTheDocument();
	});

	it('вночі — іконки з місяцем, вдень — із сонцем', () => {
		setup(makeForecast({ hour: () => ({ code: 0 }) }));
		const icons = Array.from(screen.getByRole('table').querySelectorAll('use')).map((u) =>
			u.getAttribute('href')
		);

		// 0:00 і 3:00 — до сходу (06:30), 21:00 — після заходу (18:30)
		expect(icons[0]).toContain('#clear-night');
		expect(icons[1]).toContain('#clear-night');
		expect(icons[3]).toContain('#clear');
		expect(icons[3]).not.toContain('night');
		expect(icons[7]).toContain('#clear-night');
	});

	it('картка сонця: схід, захід, світловий день і УФ зі шкалою', () => {
		setup();
		const card = screen.getByText('Схід сонця').closest('dl')!;

		expect(within(card).getByText('06:30')).toBeInTheDocument();
		expect(within(card).getByText('18:30')).toBeInTheDocument();
		expect(within(card).getByText('12 год 0 хв')).toBeInTheDocument();
		expect(within(card).getByText('помірний')).toBeInTheDocument();
		// Позначка на шкалі УФ стоїть пропорційно індексу (3 з 11)
		const marker = card.querySelector<HTMLElement>('[style*="left"]')!;
		expect(parseFloat(marker.style.left)).toBeCloseTo((3 / 11) * 100, 1);
	});

	it('двотонний заголовок дня і опис людською мовою', () => {
		setup();
		const heading = screen.getByRole('heading', { level: 3 });

		expect(heading).toHaveTextContent(/^Сьогодні, \d{1,2} [а-яії]+\. .+\.$/);
		// Характер дня — сірим продовженням заголовка
		expect(heading.querySelector('.text-tertiary')?.textContent?.length).toBeGreaterThan(5);
		expect(heading.nextElementSibling?.textContent).toMatch(/\.$/);
	});

	it('заголовок розділу двотонний', () => {
		setup();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'Прогноз на 7 днів. Оберіть день.'
		);
	});

	it('колонка «Зараз» підсвічена в кожному рядку таблиці', () => {
		setup();
		const highlighted = screen.getByRole('table').querySelectorAll('tbody td.now');
		// іконки + температура + 6 показників (підписи для телефону — окремі рядки)
		expect(highlighted.length).toBeGreaterThanOrEqual(8);
	});

	it('показники чергуються смугами, як рядки у Finder', () => {
		setup();
		const rows = ['Відчувається як', 'Тиск, мм', 'Вологість, %', 'Вітер, м/с'].map((label) =>
			screen.getByRole('rowheader', { name: label }).closest('tr')!.classList.contains('stripe')
		);
		expect(rows).toEqual([true, false, true, false]);
	});
});

describe('DayForecast — узгодженість із шапкою', () => {
	// Рядок таблиці за підписом: клітинки в порядку колонок
	const cellsOf = (label: string) => {
		const row = screen
			.getAllByRole('row')
			.find((r) => r.querySelector('th[scope="row"]')?.textContent?.trim() === label)!;
		return Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim());
	};

	it('«Зараз» показує поточну годину (20:00), а не початок проміжку (18:00)', () => {
		const weather = makeForecast({
			hour: (d, hr) =>
				d === 0 && hr === 18 ? { feels: 16 } : d === 0 && hr === 20 ? { feels: 13 } : {}
		});
		render(DayForecast, { weather, now: { date: today, hour: 20 } });

		const headers = screen
			.getAllByRole('columnheader')
			.map((th) => th.textContent?.trim())
			.filter((t) => t && /^\d{1,2}:00$|^Зараз$/.test(t));
		expect(headers).toEqual(['0:00', '3:00', '6:00', '9:00', '12:00', '15:00', 'Зараз', '21:00']);
		expect(cellsOf('Відчувається як')[6]).toBe('+13°');
	});

	it('дні до сьогодні (прогноз отримано до півночі) не показуються', () => {
		const yesterday = DateTime.fromISO(today).minus({ days: 1 }).toISODate()!;
		render(DayForecast, {
			weather: makeForecast({ start: yesterday, days: 8 }),
			now: { date: today, hour: 1 }
		});

		const tabs = screen.getAllByRole('tab');
		expect(tabs).toHaveLength(7);
		expect(tabs[0]).toHaveTextContent('Сьогодні');
	});
});
