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
