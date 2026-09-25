/*
	Довідник областей: латинський слаг (для адрес населених пунктів із однаковою назвою)
	і обласний центр. Обласні центри — найчастіші пошукові запити, тож вони мають
	пріоритет серед однойменних населених пунктів і стоять у внутрішніх посиланнях.
*/

export interface Region {
	name: string;
	slug: string;
	centre: string;
	centreSlug: string;
}

export const REGIONS: Region[] = [
	{ name: 'Вінницька область', slug: 'vinnytska', centre: 'Вінниця', centreSlug: 'vinnytsia' },
	{ name: 'Волинська область', slug: 'volynska', centre: 'Луцьк', centreSlug: 'lutsk' },
	{
		name: 'Дніпропетровська область',
		slug: 'dnipropetrovska',
		centre: 'Дніпро',
		centreSlug: 'dnipro'
	},
	{ name: 'Донецька область', slug: 'donetska', centre: 'Донецьк', centreSlug: 'donetsk' },
	{ name: 'Житомирська область', slug: 'zhytomyrska', centre: 'Житомир', centreSlug: 'zhytomyr' },
	{ name: 'Закарпатська область', slug: 'zakarpatska', centre: 'Ужгород', centreSlug: 'uzhhorod' },
	{
		name: 'Запорізька область',
		slug: 'zaporizka',
		centre: 'Запоріжжя',
		centreSlug: 'zaporizhzhia'
	},
	{
		name: 'Івано-Франківська область',
		slug: 'ivano-frankivska',
		centre: 'Івано-Франківськ',
		centreSlug: 'ivano-frankivsk'
	},
	{ name: 'Київська область', slug: 'kyivska', centre: 'Київ', centreSlug: 'kyiv' },
	{
		name: 'Кіровоградська область',
		slug: 'kirovohradska',
		centre: 'Кропивницький',
		centreSlug: 'kropyvnytskyi'
	},
	{ name: 'Луганська область', slug: 'luhanska', centre: 'Луганськ', centreSlug: 'luhansk' },
	{ name: 'Львівська область', slug: 'lvivska', centre: 'Львів', centreSlug: 'lviv' },
	{ name: 'Миколаївська область', slug: 'mykolaivska', centre: 'Миколаїв', centreSlug: 'mykolaiv' },
	{ name: 'Одеська область', slug: 'odeska', centre: 'Одеса', centreSlug: 'odesa' },
	{ name: 'Полтавська область', slug: 'poltavska', centre: 'Полтава', centreSlug: 'poltava' },
	{ name: 'Рівненська область', slug: 'rivnenska', centre: 'Рівне', centreSlug: 'rivne' },
	{ name: 'Сумська область', slug: 'sumska', centre: 'Суми', centreSlug: 'sumy' },
	{
		name: 'Тернопільська область',
		slug: 'ternopilska',
		centre: 'Тернопіль',
		centreSlug: 'ternopil'
	},
	{ name: 'Харківська область', slug: 'kharkivska', centre: 'Харків', centreSlug: 'kharkiv' },
	{ name: 'Херсонська область', slug: 'khersonska', centre: 'Херсон', centreSlug: 'kherson' },
	{
		name: 'Хмельницька область',
		slug: 'khmelnytska',
		centre: 'Хмельницький',
		centreSlug: 'khmelnytskyi'
	},
	{ name: 'Черкаська область', slug: 'cherkaska', centre: 'Черкаси', centreSlug: 'cherkasy' },
	{
		name: 'Чернівецька область',
		slug: 'chernivetska',
		centre: 'Чернівці',
		centreSlug: 'chernivtsi'
	},
	{
		name: 'Чернігівська область',
		slug: 'chernihivska',
		centre: 'Чернігів',
		centreSlug: 'chernihiv'
	}
];

const BY_NAME = new Map(REGIONS.map((r) => [r.name, r]));

export const regionByName = (name: string) => BY_NAME.get(name);

/** Латинський слаг області; для невідомої — транслітерація не потрібна, досить «region» */
export const regionSlug = (name: string) => BY_NAME.get(name)?.slug ?? 'region';

/*
	Київ — місто зі спеціальним статусом, у базі населених пунктів його немає
	(слаг «kyiv» там належить селу в Миколаївській області). Столиця — головний
	пошуковий запит, тому вона описана тут і має пріоритет над однойменними селами.
*/
export const KYIV = {
	id: 0,
	slug: 'kyiv',
	nameUa: 'Київ',
	nameEn: 'Kyiv',
	nameRu: 'Киев',
	region: 'Київ',
	countryUa: 'Україна',
	latitude: 50.4501,
	longitude: 30.5234
} as const;

const KYIV_NAMES = ['kyiv', 'київ', 'kiev', 'киев'];

/** Запит точно про столицю */
export const isKyivQuery = (query: string) => KYIV_NAMES.includes(query.trim().toLowerCase());

/** Запит, з якого може початися назва столиці (для підказок пошуку) */
export const kyivMatchesPrefix = (query: string) => {
	const q = query.trim().toLowerCase();
	return q.length >= 2 && KYIV_NAMES.some((name) => name.startsWith(q));
};
