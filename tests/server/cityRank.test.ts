import { describe, expect, it } from 'vitest';
import { isRegionCentre, rankSearchResults } from '$lib/server/cityRank';

const city = (id: number, nameUa: string, region: string, nameEn = '') => ({
	id,
	nameUa,
	region,
	nameEn
});

describe('isRegionCentre', () => {
	it.each([
		['Львів', 'Львівська область', true],
		['Одеса', 'Одеська область', true],
		['Суми', 'Сумська область', true],
		['Дніпро', 'Дніпропетровська область', true],
		['Запоріжжя', 'Запорізька область', true],
		['Львів', 'Дніпропетровська область', false],
		['Іванівка', 'Сумська область', false]
	])('%s у «%s» → %s', (name, region, expected) => {
		expect(isRegionCentre(city(1, name, region))).toBe(expected);
	});
});

describe('rankSearchResults', () => {
	it('обласний центр вище за села з тим самим початком', () => {
		const result = rankSearchResults(
			[
				city(1, 'Одерадівка', 'Тернопільська область'),
				city(2, 'Одеради', 'Волинська область'),
				city(3, 'Одеса', 'Одеська область')
			],
			'Оде'
		);
		expect(result.map((c) => c.nameUa)).toEqual(['Одеса', 'Одеради', 'Одерадівка']);
	});

	it('точний збіг назви — найперший, зокрема англійською', () => {
		const result = rankSearchResults(
			[city(1, 'Львівка', 'Житомирська область'), city(2, 'Льва', 'Рівненська область', 'Lva')],
			'lva'
		);
		expect(result[0].nameUa).toBe('Льва');
	});

	it('серед однакових назв спершу центр області', () => {
		const result = rankSearchResults(
			[city(2732, 'Львів', 'Дніпропетровська область'), city(11272, 'Львів', 'Львівська область')],
			'Львів'
		);
		expect(result[0].id).toBe(11272);
	});

	it('обмежує кількість і не змінює вхідний масив', () => {
		const input = Array.from({ length: 50 }, (_, i) => city(i, `Місто${i}`, 'Київська область'));
		const copy = [...input];

		expect(rankSearchResults(input, 'Міс', 20)).toHaveLength(20);
		expect(input).toEqual(copy);
	});
});
