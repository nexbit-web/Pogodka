import { describe, expect, it } from 'vitest';
import { assignPaths, parseRegionalPath } from '$lib/server/cityUrl';
import { REGIONS, KYIV, isKyivQuery, kyivMatchesPrefix, regionSlug } from '$lib/server/regions';

const city = (id: number, slug: string, nameUa: string, region: string) => ({
	id,
	slug,
	nameUa,
	region
});

describe('assignPaths', () => {
	it('обласний центр зберігає коротку адресу, решта — з областю', () => {
		const paths = assignPaths([
			city(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
			city(11272, 'lviv', 'Львів', 'Львівська область'),
			city(12473, 'lviv', 'Львів', 'Миколаївська область')
		]);

		expect(paths.get(11272)).toBe('lviv');
		expect(paths.get(2732)).toBe('lviv-dnipropetrovska');
		expect(paths.get(12473)).toBe('lviv-mykolaivska');
	});

	it('унікальна назва — просто слаг', () => {
		expect(assignPaths([city(1, 'merefa', 'Мерефа', 'Харківська область')]).get(1)).toBe('merefa');
	});

	it('кілька однойменних в одній області — з номером за порядком id', () => {
		const paths = assignPaths([
			city(9, 'ivanivka', 'Іванівка', 'Сумська область'),
			city(3, 'ivanivka', 'Іванівка', 'Одеська область'),
			city(7, 'ivanivka', 'Іванівка', 'Сумська область'),
			city(12, 'ivanivka', 'Іванівка', 'Сумська область')
		]);

		// Жоден не обласний центр — коротку адресу отримує найменший id
		expect(paths.get(3)).toBe('ivanivka');
		expect(paths.get(7)).toBe('ivanivka-sumska');
		expect(paths.get(9)).toBe('ivanivka-sumska-2');
		expect(paths.get(12)).toBe('ivanivka-sumska-3');
	});

	it('столиця отримує /pohoda/kyiv, село Київ — адресу з областю', () => {
		const paths = assignPaths([city(12405, 'kyiv', 'Київ', 'Миколаївська область'), { ...KYIV }]);
		expect(paths.get(KYIV.id)).toBe('kyiv');
		expect(paths.get(12405)).toBe('kyiv-mykolaivska');
	});

	it('усі адреси унікальні навіть для великої групи', () => {
		const group = Array.from({ length: 22 }, (_, i) =>
			city(i + 1, 'kamianka', 'Камʼянка', REGIONS[i % 5].name)
		);
		const paths = [...assignPaths(group).values()];
		expect(new Set(paths).size).toBe(22);
	});

	it('не залежить від порядку вхідних даних', () => {
		const group = [
			city(2732, 'lviv', 'Львів', 'Дніпропетровська область'),
			city(11272, 'lviv', 'Львів', 'Львівська область'),
			city(12473, 'lviv', 'Львів', 'Миколаївська область')
		];
		expect(assignPaths(group)).toEqual(assignPaths([...group].reverse()));
	});
});

describe('parseRegionalPath', () => {
	it.each([
		['lviv-mykolaivska', 'lviv'],
		['ivanivka-sumska-2', 'ivanivka'],
		['nova-kakhovka-khersonska', 'nova-kakhovka'],
		['kamianka-ivano-frankivska', 'kamianka'],
		['LVIV-MYKOLAIVSKA', 'lviv']
	])('%s → %s', (path, slug) => {
		expect(parseRegionalPath(path)).toEqual({ slug });
	});

	it('звичайний слаг без області — null', () => {
		expect(parseRegionalPath('nova-kakhovka')).toBeNull();
		expect(parseRegionalPath('lviv')).toBeNull();
	});
});

describe('regions', () => {
	it('24 області з унікальними латинськими слагами й обласними центрами', () => {
		expect(REGIONS).toHaveLength(24);
		expect(new Set(REGIONS.map((r) => r.slug)).size).toBe(24);
		expect(REGIONS.every((r) => /^[a-z-]+$/.test(r.slug) && /^[a-z-]+$/.test(r.centreSlug))).toBe(
			true
		);
	});

	it('слаг області за назвою', () => {
		expect(regionSlug('Львівська область')).toBe('lvivska');
		expect(regionSlug('Невідома')).toBe('region');
	});

	it('розпізнає запити про столицю', () => {
		expect(['kyiv', 'Київ', ' KIEV ', 'Киев'].every(isKyivQuery)).toBe(true);
		expect(isKyivQuery('Київське')).toBe(false);
		expect(kyivMatchesPrefix('Ки')).toBe(true);
		expect(kyivMatchesPrefix('Kyi')).toBe(true);
		expect(kyivMatchesPrefix('К')).toBe(false);
		expect(kyivMatchesPrefix('Льв')).toBe(false);
	});
});
