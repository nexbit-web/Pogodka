import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTestPath } from '../setup/app';
import { i18n, rememberLang, trackLang } from '$lib/i18n/state.svelte';

beforeEach(() => localStorage.clear());
afterEach(() => {
	setTestPath('/');
	trackLang('/');
});

describe('мова, якою людина користується сайтом', () => {
	it('на перекладених сторінках — з адреси', () => {
		setTestPath('/ru/pohoda/lviv');
		expect(i18n.lang).toBe('ru');
		expect(i18n.href('/pohoda/kyiv')).toBe('/ru/pohoda/kyiv');
		expect(i18n.switchHref('uk')).toBe('/pohoda/lviv');
	});

	it('зайшов із російської на політику — посилання на прогноз лишаються російськими', () => {
		setTestPath('/ru/pohoda/lviv');
		trackLang('/ru/pohoda/lviv');
		setTestPath('/privacypolicy');
		trackLang('/privacypolicy');

		expect(i18n.lang).toBe('ru');
		expect(i18n.href('/')).toBe('/ru');
		expect(i18n.t.searchPlaceholder).toBe('Город или село');
	});

	it('повернувся на українську — українська й на неперекладених сторінках', () => {
		trackLang('/ru/pohoda/lviv');
		trackLang('/pohoda/lviv');
		setTestPath('/support');
		expect(i18n.href('/')).toBe('/');
	});

	it('явний вибір у меню запамʼятовується; мова вмикається, щойно підключено її тексти', async () => {
		rememberLang('ru');
		expect(localStorage.getItem('pogodka-lang')).toBe('ru');
		setTestPath('/about');
		await vi.waitFor(() => expect(i18n.lang).toBe('ru'));
		rememberLang('uk');
		await vi.waitFor(() => expect(i18n.lang).toBe('uk'));
	});
});
