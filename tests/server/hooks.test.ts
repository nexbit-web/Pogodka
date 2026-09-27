import { describe, expect, it } from 'vitest';
import { handle } from '../../src/hooks.server';

const run = async (path: string, response = new Response('ok')) =>
	handle({
		event: { url: new URL(`https://www.pogodka.org${path}`) },
		resolve: async () => response
	} as never);

describe('hooks.server', () => {
	it('додає заголовки безпеки до кожної відповіді', async () => {
		const res = await run('/pohoda/lviv');

		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
		expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
		expect(res.headers.get('X-Robots-Tag')).toBeNull();
	});

	it('службовий /api/ закритий від індексації', async () => {
		const res = await run('/api/pogoda?city=lviv');
		expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
	});

	it('не перезаписує заголовки, які вже поставив обробник', async () => {
		const res = await run('/x', new Response('ok', { headers: { 'X-Frame-Options': 'DENY' } }));
		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
	});
});

describe('мова сторінки', () => {
	const html = async (path: string) => {
		let transform: ((o: { html: string }) => string) | undefined;
		await handle({
			event: { url: new URL(`https://www.pogodka.org${path}`) },
			resolve: async (_e: unknown, opts: { transformPageChunk: typeof transform }) => {
				transform = opts.transformPageChunk;
				return new Response('ok');
			}
		} as never);
		return transform!({ html: '<html lang="%lang%">' });
	};

	it('<html lang> — з адреси', async () => {
		expect(await html('/pohoda/lviv')).toBe('<html lang="uk">');
		expect(await html('/ru/pohoda/lviv')).toBe('<html lang="ru">');
		expect(await html('/ru')).toBe('<html lang="ru">');
	});
});

describe('reroute', async () => {
	const { reroute } = await import('../../src/hooks');
	const to = (path: string) => reroute({ url: new URL(`https://www.pogodka.org${path}`) } as never);

	it('/ru-сторінки відкривають ті самі маршрути', () => {
		expect(to('/ru')).toBe('/');
		expect(to('/ru/pohoda/kyiv')).toBe('/pohoda/kyiv');
		expect(to('/ru/pohoda/kyiv/zavtra')).toBe('/pohoda/kyiv/zavtra');
	});

	it('українські адреси й неперекладені сторінки не чіпає', () => {
		expect(to('/pohoda/kyiv')).toBeUndefined();
		expect(to('/ru/about')).toBeUndefined();
		expect(to('/russia')).toBeUndefined();
	});
});
