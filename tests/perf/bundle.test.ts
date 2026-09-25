import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
	Бюджет JavaScript, який браузер вантажить до показу сторінки.
	Перевіряє останню production-збірку (npm run build), тож ловить
	випадково підключену важку бібліотеку ще до деплою.
	Без збірки тест пропускається.
*/

const OUT = join(process.cwd(), '.svelte-kit/output/client');
const MANIFEST = join(OUT, '.vite/manifest.json');
const hasBuild = existsSync(MANIFEST);

type Manifest = Record<string, { file: string; imports?: string[]; src?: string }>;

const KB = 1024;
const BUDGET = {
	// Спільне для всіх сторінок: рантайм Svelte і SvelteKit, шапка, тема
	shared: 65 * KB,
	// Повна сторінка погоди (головна і сторінка міста)
	weatherPage: 85 * KB
};

describe.skipIf(!hasBuild)('бюджет JavaScript production-збірки', () => {
	const manifest: Manifest = hasBuild ? JSON.parse(readFileSync(MANIFEST, 'utf-8')) : {};

	const node = (n: number) => `.svelte-kit/generated/client-optimized/nodes/${n}.js`;
	const APP = '.svelte-kit/generated/client-optimized/app.js';

	function closure(keys: string[]) {
		const seen = new Set<string>();
		const walk = (key: string) => {
			if (seen.has(key) || !manifest[key]) return;
			seen.add(key);
			manifest[key].imports?.forEach(walk);
		};
		keys.forEach(walk);
		return seen;
	}

	const gzipSize = (keys: Set<string>) =>
		[...keys].reduce(
			(sum, key) => sum + gzipSync(readFileSync(join(OUT, manifest[key].file))).length,
			0
		);

	const source = (keys: Set<string>) =>
		[...keys].map((key) => readFileSync(join(OUT, manifest[key].file), 'utf-8')).join('\n');

	// Вузли сторінок погоди — ті, що містять стрічку прогнозу
	const weatherNodes = Object.keys(manifest).filter(
		(key) => key.includes('/nodes/') && source(closure([key])).includes('lilylook.store')
	);

	const shared = closure([APP, node(0)]);

	it('знаходить сторінки погоди у збірці', () => {
		expect(weatherNodes.length).toBeGreaterThanOrEqual(2);
	});

	it(`спільний код — до ${BUDGET.shared / KB} КБ gzip`, () => {
		expect(gzipSize(shared)).toBeLessThan(BUDGET.shared);
	});

	it(`сторінка погоди — до ${BUDGET.weatherPage / KB} КБ gzip`, () => {
		for (const key of weatherNodes) {
			expect(gzipSize(closure([APP, node(0), key])), key).toBeLessThan(BUDGET.weatherPage);
		}
	});

	it('важкі бібліотеки не потрапляють у початкове завантаження', () => {
		for (const key of weatherNodes) {
			const code = source(closure([APP, node(0), key]));
			// luxon — дати рахуються через Intl; bits-ui — меню налаштувань власне;
			// svelte-sonner і yup — лише на сторінці підтримки
			expect(code, 'luxon').not.toMatch(/Luxon|Invalid DateTime/);
			expect(code, 'bits-ui').not.toContain('data-bits-');
			expect(code, 'svelte-sonner').not.toContain('data-sonner-toaster');
			expect(code, 'yup').not.toContain('ValidationError');
		}
	});
});
