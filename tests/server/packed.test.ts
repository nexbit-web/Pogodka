import { describe, expect, it } from 'vitest';
import { pack, unpack } from '$lib/server/packed';
import { makeForecast } from '../fixtures/forecast';

describe('pack / unpack — стиснуті записи кешу', () => {
	const entry = { city: { nameUa: 'Харків' }, weather: makeForecast({ days: 10 }), fetchedAt: 1 };

	it('без втрат: розпакований запис дорівнює початковому', () => {
		expect(unpack(pack(entry))).toEqual(entry);
	});

	it('прогноз на 10 днів займає в рази менше місця', () => {
		const json = JSON.stringify(entry).length;
		expect(pack(entry).length).toBeLessThan(json / 3);
	});

	it('старі нестиснуті записи (звичайний JSON) теж читаються', () => {
		expect(unpack(JSON.stringify(entry))).toEqual(entry);
	});

	it('пошкоджений запис — undefined, а не падіння сторінки', () => {
		expect(unpack('br:not-base64-brotli')).toBeUndefined();
		expect(unpack('{oops')).toBeUndefined();
	});
});
