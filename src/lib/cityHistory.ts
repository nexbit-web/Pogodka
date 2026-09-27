/*
	Історія переглянутих населених пунктів — лише в браузері відвідувача.
	Показується в пошуку, поки поле порожнє: свої міста під рукою без набору назви.
*/

export interface VisitedCity {
	path: string;
	name: string;
	region: string;
}

const HISTORY_KEY = 'pogodka-history';
// Останній переглянутий — з ним відкривається головна (див. app.html)
const LAST_KEY = 'pogodka-city';
const LIMIT = 6;

const isVisitedCity = (value: unknown): value is VisitedCity => {
	const c = value as VisitedCity;
	return (
		typeof c?.path === 'string' &&
		/^[a-z0-9-]+$/.test(c.path) &&
		typeof c.name === 'string' &&
		typeof c.region === 'string'
	);
};

/** Історія, найсвіжіші першими. Порожня, якщо сховище недоступне чи зіпсоване */
export function readHistory(): VisitedCity[] {
	try {
		const list: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
		return Array.isArray(list) ? list.filter(isVisitedCity).slice(0, LIMIT) : [];
	} catch {
		return [];
	}
}

/** Запамʼятовує відкритий населений пункт: нагору історії, без повторів */
export function rememberCity(city: VisitedCity): void {
	try {
		const list = [city, ...readHistory().filter((c) => c.path !== city.path)].slice(0, LIMIT);
		localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
		localStorage.setItem(LAST_KEY, city.path);
	} catch {
		// Приватний режим чи заблоковане сховище — просто не запамʼятовуємо
	}
}

export function clearHistory(): void {
	try {
		localStorage.removeItem(HISTORY_KEY);
	} catch {
		// Немає доступу до сховища — нічого й не збережено
	}
}
