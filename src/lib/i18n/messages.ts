import type { Lang } from './index';
import { ruPack } from './pack';

/*
	Тексти інтерфейсу. Українська — еталон: російська (i18n/ru.ts) мусить мати ті самі ключі
	(це перевіряє тип), тож забутий переклад видно ще до запуску.
	Згенеровані описи погоди — окремо, у dayInsights і weather.
*/

export const uk = {
	home: 'Pogodka — на головну',
	// Пошук
	searchLabel: 'Пошук міста по Україні',
	searchPlaceholder: 'Місто або село',
	searchClear: 'Очистити пошук',
	searchSubmit: 'Знайти',
	searchLocating: 'Визначаємо місцезнаходження…',
	searchMyLocation: 'Моє місцезнаходження',
	searchRecent: 'Нещодавні',
	searchRecentClear: 'Очистити',
	searchLoading: 'Пошук…',
	searchEmpty: 'Нічого не знайдено',
	searchResults: 'Населені пункти',
	// Геолокація
	geoFailed: 'Не вдалося визначити місцезнаходження',
	geoDenied: 'Доступ до геолокації вимкнено в налаштуваннях браузера',
	geoRetry: 'Не вдалося визначити місцезнаходження. Спробуйте ще раз',
	geoNone: 'Поруч немає населених пунктів України',
	geoCityFailed: 'Не вдалося визначити населений пункт. Спробуйте ще раз',
	geoPrompt:
		'Дозвольте Pogodka доступ до вашої геолокації, щоб дізнаватися про погоду там, де ви знаходитесь.',
	geoAllow: 'Дозволити',
	geoAllowing: 'Визначаємо…',
	geoLater: 'Не зараз',
	// Меню й налаштування
	settings: 'Налаштування',
	theme: 'Тема',
	themeLight: 'Світла',
	themeDark: 'Темна',
	language: 'Мова',
	menuOpen: 'Відкрити меню',
	menu: 'Меню',
	menuClose: 'Закрити меню',
	info: 'Інформація',
	followUs: 'Стежте за нами:',
	// Підвал
	breadcrumb: 'Навігаційний ланцюжок',
	forecast: 'Прогноз погоди',
	forecastData: 'Дані прогнозу:',
	rights: 'Усі права захищено.',
	legal: 'Правова інформація',
	about: 'Про нас',
	privacy: 'Політика конфіденційності',
	terms: 'Умови використання',
	support: 'Техпідтримка',
	country: 'Україна',
	loading: 'Завантаження сторінки',
	// Помилки
	notFound: 'Сторінку не знайдено',
	loadError: 'Помилка при завантаженні даних',
	toHome: 'На головну',
	// Шапка з погодою
	weather: 'Погода',
	feelsLike: 'Відчувається як',
	// Прогноз
	forecastPeriod: 'Період прогнозу',
	forecastDays: 'Дні прогнозу',
	today: 'Сьогодні',
	tomorrow: 'Завтра',
	max: 'макс.',
	min: 'мін.',
	views: {
		week: { label: '7 днів', heading: 'Прогноз на 7 днів', period: 'на 7 днів' },
		zavtra: { label: 'Завтра', heading: 'Прогноз на завтра', period: 'на завтра' },
		'10-dniv': { label: '10 днів', heading: 'Прогноз на 10 днів', period: 'на 10 днів' },
		vykhidni: { label: 'Вихідні', heading: 'Прогноз на вихідні', period: 'на вихідні' }
	},
	dayParts: ['ніч', 'ранок', 'день', 'вечір'],
	now: 'Зараз',
	metric: 'Показник',
	condition: 'Стан погоди',
	temperature: 'Температура',
	pressure: 'Тиск, мм',
	humidity: 'Вологість, %',
	wind: 'Вітер, м/с',
	gustsUpTo: 'пориви до',
	precipProb: 'Ймовірність опадів, %',
	precip: 'Опади, мм',
	sunrise: 'Схід сонця',
	sunset: 'Захід сонця',
	daylight: 'Світловий день',
	uvIndex: 'УФ-індекс',
	// Списки міст
	nearbyTitle: 'Погода поруч.',
	nearbySubtitle: 'Сусідні міста й села.',
	centresTitle: 'Погода в обласних центрах.',
	centresSubtitle: 'Столиця й усі області.',
	// Банер партнера
	partnerLabel: 'LilyLook — магазин жіночого одягу',
	partnerAlt: 'LilyLook — магазин жіночого одягу. Стильні образи на кожен день'
};

export type Messages = typeof uk;

/** Тексти інтерфейсу мовою сторінки. Російські — з окремого пакета (див. i18n/pack.ts) */
export const messagesFor = (lang: Lang): Messages => (lang === 'ru' && ruPack()?.messages) || uk;
