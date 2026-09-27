import { describe, expect, it } from 'vitest';
import { isLocalized, langFromPath, localize, stripLang } from '$lib/i18n';
import { uk } from '$lib/i18n/messages';
import { RU_PACK } from '$lib/i18n/ru';
import { centreName, placeName, regionName } from '$lib/i18n/places';
import { REGIONS } from '$lib/server/regions';
import { dayOfMonth, monthName, weekdayName } from '$lib/date';
import { aqiText, getWeatherText, precipOutlook, uvText, windDirectionText } from '$lib/weather';
import { typograph } from '$lib/typography';
import { makeForecast } from '../fixtures/forecast';

const UKRAINIAN_LETTERS = /[іїєґІЇЄҐʼ]/;

describe('мова за адресою', () => {
	it.each([
		['/', 'uk'],
		['/pohoda/kyiv', 'uk'],
		['/ru', 'ru'],
		['/ru/pohoda/kyiv/zavtra', 'ru'],
		['/rules', 'uk'],
		['/russia', 'uk']
	])('%s → %s', (path, lang) => {
		expect(langFromPath(path)).toBe(lang);
	});

	it('префікс знімається й додається симетрично', () => {
		expect(stripLang('/ru')).toBe('/');
		expect(stripLang('/ru/pohoda/kyiv')).toBe('/pohoda/kyiv');
		expect(localize('/', 'ru')).toBe('/ru');
		expect(localize('/pohoda/kyiv/10-dniv', 'ru')).toBe('/ru/pohoda/kyiv/10-dniv');
		expect(localize('/ru/pohoda/kyiv', 'uk')).toBe('/pohoda/kyiv');
		expect(localize('/ru/pohoda/kyiv', 'ru')).toBe('/ru/pohoda/kyiv');
	});

	it('правові сторінки й техпідтримка — лише українською', () => {
		for (const path of ['/about', '/privacypolicy', '/agreement', '/support']) {
			expect(isLocalized(path)).toBe(false);
			expect(localize(path, 'ru')).toBe(path);
		}
		expect(isLocalized('/pohoda/lviv')).toBe(true);
	});
});

describe('словник інтерфейсу', () => {
	const flat = (o: object, prefix = ''): [string, unknown][] =>
		Object.entries(o).flatMap(([k, v]) =>
			v && typeof v === 'object' && !Array.isArray(v)
				? flat(v, `${prefix}${k}.`)
				: [[`${prefix}${k}`, v] as [string, unknown]]
		);

	it('російська має всі ключі й жодного порожнього тексту', () => {
		const ru = new Map(flat(RU_PACK.messages));
		for (const [key] of flat(uk)) expect(ru.get(key), key).toBeTruthy();
	});

	it('у російських текстах немає українських літер', () => {
		expect(JSON.stringify(RU_PACK.messages)).not.toMatch(UKRAINIAN_LETTERS);
	});
});

describe('назви російською', () => {
	it('усі області й обласні центри перекладені', () => {
		for (const r of REGIONS) {
			expect(regionName(r.name, 'ru'), r.name).not.toMatch(UKRAINIAN_LETTERS);
			expect(centreName(r.centre, 'ru'), r.centre).not.toMatch(UKRAINIAN_LETTERS);
		}
		expect(regionName('Київ', 'ru')).toBe('Киев');
		expect(regionName('Львівська область', 'uk')).toBe('Львівська область');
	});

	it('назва з бази; без російської — українська', () => {
		expect(placeName({ nameUa: 'Львів', nameRu: 'Львов' }, 'ru')).toBe('Львов');
		expect(placeName({ nameUa: 'Львів', nameRu: '' }, 'ru')).toBe('Львів');
		expect(placeName({ nameUa: 'Львів', nameRu: 'Львов' }, 'uk')).toBe('Львів');
	});
});

describe('погода й дати російською', () => {
	it('дні тижня, місяці', () => {
		expect(weekdayName('2026-09-27', false, 'ru')).toBe('воскресенье');
		expect(weekdayName('2026-09-27', true, 'ru')).toBe('вс');
		expect(`${dayOfMonth('2026-09-27')} ${monthName('2026-09-27', 'ru')}`).toBe('27 сентября');
		expect(monthName('2026-09-27')).toBe('вересня');
	});

	it('стан неба, вітер, УФ, повітря', () => {
		expect(getWeatherText(3, 'ru')).toBe('Пасмурно');
		expect(getWeatherText(3)).toBe('Похмуро');
		expect(getWeatherText(42, 'ru')).toBe('Неизвестно');
		expect(windDirectionText(225, 'ru')).toBe('ЮЗ');
		expect(uvText(4, 'ru')).toBe('умеренный');
		expect(aqiText(30, 'ru')).toBe('удовлетворительное');
	});

	it('найближчі опади — з правильним родом', () => {
		const weather = makeForecast({
			hour: (d, hr) => (d === 0 && hr === 3 ? { code: 95, precip: 2 } : {})
		});
		expect(precipOutlook(weather, 0, 6, 'ru')).toBe('Гроза начнётся около 2:00');
		expect(precipOutlook(weather, 0)).toBe('Гроза почнеться близько 2:00');
	});

	it('нерозривні пробіли після російських прийменників', () => {
		expect(typograph('с 14:00 до 17:00, до 0,9 мм', 'ru')).toBe('с 14:00 до 17:00, до 0,9 мм');
		expect(typograph('11 ч 57 мин', 'ru')).toBe('11 ч 57 мин');
	});
});
