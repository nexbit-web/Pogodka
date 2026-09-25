import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TempCurve from '$lib/components/shared/TempCurve.svelte';

describe('TempCurve', () => {
	it('підписує кожну точку температурою зі знаком', () => {
		render(TempCurve, { temps: [10, 9, 8, 10, 15, 17, 16, -2] });

		for (const label of ['+10°', '+9°', '+8°', '+15°', '+17°', '+16°', '−2°']) {
			expect(screen.getAllByText(label).length).toBeGreaterThan(0);
		}
	});

	it('доступна для скрінрідерів як одне зображення з усіма значеннями', () => {
		render(TempCurve, { temps: [1, 2, 3] });
		expect(screen.getByRole('img')).toHaveAccessibleName('Температура: +1°, +2°, +3°');
	});

	it('будує плавну криву і заливку', () => {
		const { container } = render(TempCurve, { temps: [10, 12, 18, 14] });
		const paths = container.querySelectorAll('path');

		expect(paths).toHaveLength(2);
		expect(paths[1].getAttribute('d')).toMatch(/^M [\d.]+ [\d.]+( C [\d., -]+)+$/);
		expect(paths[0].getAttribute('d')).toMatch(/Z$/);
	});

	it('рівна температура весь день — лінія посередині, без NaN', () => {
		const { container } = render(TempCurve, { temps: [5, 5, 5, 5] });
		const d = container.querySelectorAll('path')[1].getAttribute('d')!;

		expect(d).not.toContain('NaN');
		expect(d).toContain(' 63');
	});

	it('монотонна: між двома точками не вигадує горбів', () => {
		const { container } = render(TempCurve, { temps: [0, 10, 10, 0] });
		const d = container.querySelectorAll('path')[1].getAttribute('d')!;
		const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));

		// Жодна контрольна точка не виходить за межі даних (TOP=38 … BOTTOM=88)
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(38);
		expect(Math.max(...ys)).toBeLessThanOrEqual(88);
	});

	it('однакові id градієнта не конфліктують між кількома кривими', () => {
		const { container } = render(TempCurve, { temps: [1, 2] });
		const { container: other } = render(TempCurve, { temps: [3, 4] });

		const a = container.querySelector('linearGradient')!.id;
		const b = other.querySelector('linearGradient')!.id;
		expect(a).not.toBe(b);
	});

	it('одна точка — без падіння', () => {
		expect(() => render(TempCurve, { temps: [7] })).not.toThrow();
	});
});
