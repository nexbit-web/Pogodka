import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
	Вимоги AdSense до самого сайту: код у <head>, ads.txt із тим самим видавцем
	і відкритий для роботів доступ. Помилка тут — відмова в монетизації або втрата доходу.
*/

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf-8');

const html = read('src/app.html');
const adsTxt = read('static/ads.txt');
const robots = read('static/robots.txt');

const publisher = adsTxt.match(/pub-\d{16}/)?.[0];

describe('Google AdSense', () => {
	it('ads.txt — один рядок Google у форматі IAB', () => {
		const lines = adsTxt.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
		expect(lines).toEqual([`google.com, ${publisher}, DIRECT, f08c47fec0942fa0`]);
	});

	it('мета-тег і скрипт у <head> мають той самий ідентифікатор видавця, що й ads.txt', () => {
		const head = html.slice(0, html.indexOf('</head>'));

		expect(head).toContain(`<meta name="google-adsense-account" content="ca-${publisher}" />`);
		expect(head).toContain(
			`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisher}`
		);
		expect([...head.matchAll(/ca-pub-\d+/g)].every((m) => m[0] === `ca-${publisher}`)).toBe(true);
	});

	it('скрипт асинхронний — не блокує показ сторінки', () => {
		const tag = html.match(/<script[^>]*adsbygoogle[^>]*>/s)?.[0] ?? '';
		expect(tag).toMatch(/\basync\b/);
		expect(tag).toContain('crossorigin="anonymous"');
	});

	it('robots.txt не закриває сторінки від робота AdSense', () => {
		expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
		expect(robots).not.toMatch(/Mediapartners-Google/i);
	});
});
