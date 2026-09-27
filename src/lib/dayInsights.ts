import { representativeDayCode, type PollenLevel, type PollenPlant } from './weather';
import type { Lang } from './i18n';
import { ruPack } from './i18n/pack';
import type { DayHour, ForecastDay } from './types';

/** Температура зі знаком, як звикли в Україні: +10°, −3°, 0° */
export function signed(temp: number): string {
	const r = Math.round(temp);
	if (r > 0) return `+${r}°`;
	if (r < 0) return `−${Math.abs(r)}°`;
	return '0°';
}

type Sky = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

function sky(code: number): Sky {
	if (code <= 1) return 'clear';
	if (code === 2) return 'cloudy';
	if (code === 3) return 'overcast';
	if (code === 45 || code === 48) return 'fog';
	if (code >= 51 && code <= 57) return 'drizzle';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
	if (code >= 95) return 'storm';
	return 'rain';
}

const WET: Sky[] = ['storm', 'snow', 'rain', 'drizzle'];

// Частини доби в тому ж порядку, що й у таблиці
type Part = 'night' | 'morning' | 'day' | 'evening';
const PARTS: { key: Part; from: number; to: number }[] = [
	{ key: 'night', from: 0, to: 6 },
	{ key: 'morning', from: 6, to: 12 },
	{ key: 'day', from: 12, to: 18 },
	{ key: 'evening', from: 18, to: 24 }
];

/*
	Розмовник: усі фрази опису дня однією мовою. Логіка нижче спільна,
	тож українська й російська версії описують день однаково, різняться лише слова.
*/
export interface Phrasebook {
	parts: Record<Part, string>;
	/** «вранці та вдень» */
	and: string;
	/** Слово «сонце» — щоб не казати про сонце вночі й увечері */
	sun: string;
	day: string;
	evening: string;
	clearEvening: string;
	warmth: (max: number) => string[];
	skyTitle: Record<Sky, string[]>;
	skySteady: Record<Sky, string[]>;
	skyPart: Record<Sky, string[]>;
	clearing: string;
	maybeRain: string[];
	dry: string[];
	precip: {
		storm: (sum: number) => string;
		snow: (sum: number) => string;
		drizzle: string;
		rain: (sum: number) => string;
	};
	allDay: string;
	around: (h: number) => string;
	between: (from: number, to: number) => string;
	expected: string;
	slippery: string;
	umbrella: string[];
	air: string[];
	pollenOf: Record<PollenPlant, string>;
	pollen: (level: PollenLevel, of: string) => string;
	coolsTonight: (low: string) => string;
	warmsCools: (peak: string, low: string) => string;
	warms: (peak: string) => string;
	peakPassed: (low: string) => string;
	steadyTemp: string;
	fullDay: (min: string, max: string) => string[];
	vsYesterday: (diff: number) => string;
	windChill: string;
	dampChill: string;
	muggy: string;
	gusty: (g: number) => string[];
	fog: string;
	uv: string;
	mood: string[];
	daylight: (h: number, m: number) => string;
	warnings: {
		frostSevere: (t: string) => string;
		frost: (t: string) => string;
		heatSevere: (t: string) => string;
		heat: (t: string) => string;
		windSevere: (g: number) => string;
		wind: (g: number) => string;
		storm: string;
		snowfall: (mm: number) => string;
		downpour: (mm: number) => string;
	};
}

const UK: Phrasebook = {
	parts: { night: 'вночі', morning: 'вранці', day: 'вдень', evening: 'ввечері' },
	and: ' та ',
	sun: 'сонце',
	day: 'день',
	evening: 'вечір',
	clearEvening: 'ясний',
	// Характер дня за денним максимумом
	warmth: (max) => {
		if (max >= 30) return ['спекотний', 'по-справжньому спекотний'];
		if (max >= 24) return ['теплий', 'по-літньому теплий'];
		if (max >= 17) return ['мʼякий', 'приємно теплий'];
		if (max >= 11) return ['свіжий', 'прохолодний'];
		if (max >= 4) return ['прохолодний', 'зябкий'];
		if (max >= 0) return ['холодний'];
		return ['морозний'];
	},
	// Заголовок: «Теплий день із проясненнями». {d} — «день» або «вечір»
	skyTitle: {
		clear: ['сонячний {d}', 'ясний {d}'],
		cloudy: ['{d} із проясненнями', '{d} зі змінною хмарністю'],
		overcast: ['похмурий {d}', 'сірий {d}'],
		fog: ['туманний {d}'],
		drizzle: ['{d} із мрякою'],
		rain: ['дощовий {d}', '{d} із дощем'],
		snow: ['сніжний {d}', '{d} зі снігопадом'],
		storm: ['грозовий {d}', '{d} із грозами']
	},
	// Коли стан неба не змінюється за весь час
	skySteady: {
		clear: ['Небо чисте, жодної хмаринки.', 'Сонце світитиме без перерви.'],
		cloudy: [
			'Сонце то ховатиметься за хмари, то визиратиме знову.',
			'Хмари йтимуть небом, але сонце раз у раз проглядатиме.'
		],
		overcast: ['Хмари не розійдуться до самого вечора.', 'Небо суцільно затягнуте хмарами.'],
		fog: ['Туман триматиметься довго.', 'Над містом стоятиме густий туман.'],
		drizzle: ['Сіятиме дрібна мряка.', 'У повітрі висітиме мряка.'],
		rain: ['Дощитиме майже без перерви.', 'Дощ ітиме з короткими перервами.'],
		snow: ['Сніг падатиме майже без перерви.', 'Сніжитиме з короткими перервами.'],
		storm: ['Погода неспокійна: можливі грози.', 'Раз у раз налітатимуть грози.']
	},
	// Фраза для частини доби; {t} — «вранці», «вдень»…
	skyPart: {
		clear: ['{t} ясно', '{t} світитиме сонце'],
		cloudy: ['{t} мінлива хмарність', '{t} сонце чергуватиметься з хмарами'],
		overcast: ['{t} небо затягнуть хмари', '{t} похмуро'],
		fog: ['{t} ляже туман', '{t} туман'],
		drizzle: ['{t} мрячитиме', '{t} сіятиме мряка'],
		rain: ['{t} пройде дощ', '{t} дощитиме'],
		snow: ['{t} піде сніг', '{t} сніжитиме'],
		storm: ['{t} можлива гроза', '{t} налетить гроза']
	},
	clearing: '{t} розвидниться',
	maybeRain: [
		'Короткий дощ не виключений, але, найімовірніше, обійдеться.',
		'Невелика ймовірність дощу є, проте, найпевніше, буде сухо.'
	],
	dry: ['Опадів не передбачається.', 'Обійдеться без опадів.', 'День мине сухо.'],
	precip: {
		storm: (sum) => (sum >= 5 ? 'Гроза зі зливою' : 'Гроза'),
		snow: (sum) => (sum < 1 ? 'Невеликий сніг' : sum < 5 ? 'Сніг' : 'Сильний снігопад'),
		drizzle: 'Мряка',
		rain: (sum) =>
			sum < 1 ? 'Невеликий дощ' : sum < 5 ? 'Дощ' : sum < 15 ? 'Сильний дощ' : 'Злива'
	},
	allDay: 'з перервами протягом дня',
	around: (h) => `близько ${h}:00`,
	between: (from, to) => `приблизно з ${from}:00 до ${to}:00`,
	expected: 'очікується',
	slippery: 'Дороги можуть бути слизькими.',
	umbrella: ['Парасолька знадобиться.', 'Варто взяти парасольку.'],
	// Повітря за шкалою EEA; для забрудненого — що з цим робити
	air: [
		'Повітря чисте.',
		'Якість повітря задовільна.',
		'Якість повітря помірна: людям із хворобами дихання краще не перенавантажуватися надворі.',
		'Повітря забруднене: варто менше бувати надворі.',
		'Повітря дуже забруднене: краще залишатися в приміщенні.'
	],
	// Родовий відмінок: «концентрація пилку амброзії»
	pollenOf: {
		ragweed: 'амброзії',
		birch: 'берези',
		alder: 'вільхи',
		grass: 'злакових трав',
		mugwort: 'полину'
	},
	pollen: (level, of) =>
		level === 'high'
			? `Висока концентрація пилку ${of} — алергікам варто бути обережними.`
			: `Помірна концентрація пилку ${of}.`,
	coolsTonight: (low) => `До ночі похолоднішає до ${low}.`,
	warmsCools: (peak, low) => `Удень потеплішає до ${peak}, а до ночі похолоднішає до ${low}.`,
	warms: (peak) => `Удень потеплішає до ${peak}.`,
	peakPassed: (low) => `Тепліше вже не буде: до ночі похолоднішає до ${low}.`,
	steadyTemp: 'Температура до вечора майже не зміниться.',
	fullDay: (min, max) => [
		`Удень повітря прогріється до ${max}, уночі — ${min}.`,
		`Температура — від ${min} уночі до ${max} удень.`,
		`Максимум — ${max}, мінімум уночі — ${min}.`
	],
	vsYesterday: (diff) =>
		`Це на ${Math.abs(diff)}° ${diff > 0 ? 'тепліше' : 'холодніше'}, ніж напередодні.`,
	windChill: 'Через вітер надворі здаватиметься помітно холодніше.',
	dampChill: 'Через вологість надворі здаватиметься холодніше, ніж на термометрі.',
	muggy: 'Через вологість спека відчуватиметься сильніше.',
	gusty: (g) => [
		`Місцями поривчастий вітер, до ${g} м/с.`,
		`Вітер часом посилюватиметься до ${g} м/с.`
	],
	fog: 'Вранці через туман на дорогах можлива погана видимість.',
	uv: 'Сонце активне, тож захист від ультрафіолету не завадить.',
	mood: ['Чудовий день для прогулянки.', 'Гарна нагода побути надворі.'],
	daylight: (h, m) => `${h} год ${m} хв`,
	warnings: {
		frostSevere: (t) => `Сильний мороз до ${t}`,
		frost: (t) => `Заморозки до ${t}`,
		heatSevere: (t) => `Сильна спека до ${t}`,
		heat: (t) => `Спека до ${t}`,
		windSevere: (g) => `Дуже сильний вітер: пориви до ${g} м/с`,
		wind: (g) => `Сильний вітер: пориви до ${g} м/с`,
		storm: 'Можлива гроза',
		snowfall: (mm) => `Сильний снігопад: до ${mm} мм`,
		downpour: (mm) => `Сильні опади: до ${mm} мм`
	}
};

// Російський розмовник — з окремого пакета, що вантажиться лише на /ru (див. i18n/pack.ts)
const phrasebook = (lang: Lang): Phrasebook => (lang === 'ru' && ruPack()?.phrases) || UK;

/*
	Формулювання «випадкові», але детерміновані: зерно — дата і ключ фрази.
	Той самий день завжди описано однаково (сервер і браузер збігаються),
	а сусідні дні звучать по-різному.
*/
function pick<T>(seed: string, options: T[]): T {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return options[(h >>> 0) % options.length];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mm = (v: number) => v.toFixed(1).replace('.', ',');
const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / Math.max(list.length, 1);

/** Переважний стан неба; опади важливіші за хмарність */
function dominantSky(hours: DayHour[]): Sky {
	const counts = new Map<Sky, number>();
	for (const h of hours) counts.set(sky(h.code), (counts.get(sky(h.code)) ?? 0) + 1);

	const wet = WET.find((s) => (counts.get(s) ?? 0) >= 2);
	if (wet) return wet;

	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear';
}

/** Хід погоди протягом дня: «Вранці похмуро, вдень розвидниться, а ввечері пройде дощ.» */
function skyStory(p: Phrasebook, seed: string, hours: DayHour[]): string {
	const parts = PARTS.map((part) => ({
		key: part.key,
		hours: hours.filter((h) => h.hour >= part.from && h.hour < part.to)
	}))
		.filter((part) => part.hours.length > 0)
		.map((part) => ({ key: part.key, sky: dominantSky(part.hours) }));

	const merged: { keys: Part[]; sky: Sky }[] = [];
	for (const part of parts) {
		const last = merged.at(-1);
		if (last && last.sky === part.sky) last.keys.push(part.key);
		else merged.push({ keys: [part.key], sky: part.sky });
	}

	if (merged.length <= 1) return pick(`${seed}:steady`, p.skySteady[merged[0]?.sky ?? 'clear']);

	const used = new Set<string>();
	const phrases = merged.map((m, i) => {
		const t = m.keys.map((k) => p.parts[k]).join(p.and);
		// Сонце після хмар чи опадів — «розвидниться»
		if (m.sky === 'clear' && i > 0) return p.clearing.replace('{t}', t);
		// Про сонце — лише вранці й удень: уночі та ввечері воно не світить
		const sunny = m.keys.includes('morning') || m.keys.includes('day');
		const options = sunny ? p.skyPart[m.sky] : p.skyPart[m.sky].filter((o) => !o.includes(p.sun));
		// Та сама фраза двічі в одному реченні звучить неохайно — беремо іншу
		const fresh = options.filter((o) => !used.has(o));
		const phrase = pick(`${seed}:part${i}`, fresh.length ? fresh : options);
		used.add(phrase);
		return phrase.replace('{t}', t);
	});

	const last = phrases.pop()!;
	return `${cap([...phrases].join(', '))}, а ${last}.`;
}

/** Коли і скільки опадів: «Невеликий дощ очікується приблизно з 14:00 до 17:00.» */
function precipStory(p: Phrasebook, seed: string, day: ForecastDay, hours: DayHour[]): string {
	const wet = hours.filter((h) => h.precip >= 0.1 || WET.includes(sky(h.code)));

	if (wet.length === 0) {
		if ((day.precipProbMax ?? 0) >= 30) return pick(`${seed}:maybe`, p.maybeRain);
		return pick(`${seed}:dry`, p.dry);
	}

	const sum = wet.reduce((s, h) => s + h.precip, 0);
	const kinds = new Set(wet.map((h) => sky(h.code)));

	const drizzleOnly =
		!kinds.has('storm') && !kinds.has('snow') && !kinds.has('rain') && kinds.has('drizzle');
	let subject: string;
	if (kinds.has('storm')) subject = p.precip.storm(sum);
	else if (kinds.has('snow')) subject = p.precip.snow(sum);
	else if (drizzleOnly) subject = p.precip.drizzle;
	else subject = p.precip.rain(sum);

	const from = wet[0].hour;
	const to = wet.at(-1)!.hour + 1;
	let when: string;
	if (to - from >= 12) when = p.allDay;
	else if (to - from <= 1) when = p.around(from);
	else when = p.between(from, to === 24 ? 0 : to);

	const amount = sum >= 0.5 && !drizzleOnly ? `, до ${mm(sum)} мм` : '';
	let text = `${subject} ${p.expected} ${when}${amount}.`;

	if (kinds.has('snow') && sum >= 1) {
		text += ` ${p.slippery}`;
	} else if (sum >= 0.5) {
		text += ` ${pick(`${seed}:umbrella`, p.umbrella)}`;
	}
	return text;
}

export interface DayStory {
	/** Коротко про характер дня: «Теплий день із проясненнями» */
	title: string;
	/** Кілька речень людською мовою */
	text: string;
}

/** Повітря дня для опису: європейський індекс AQI і помітний пилок */
export interface DayAir {
	aqi: number | null;
	pollen: { plant: PollenPlant; level: PollenLevel } | null;
}

/** Речення про повітря за шкалою EEA; для забрудненого — що з цим робити */
function airStory(p: Phrasebook, air: DayAir): string[] {
	const sentences: string[] = [];
	const { aqi, pollen } = air;

	if (aqi !== null) {
		const level = aqi <= 20 ? 0 : aqi <= 40 ? 1 : aqi <= 60 ? 2 : aqi <= 80 ? 3 : 4;
		sentences.push(p.air[level]);
	}
	if (pollen) sentences.push(p.pollen(pollen.level, p.pollenOf[pollen.plant]));
	return sentences;
}

/**
 * Опис дня, як від ведучого прогнозу погоди.
 * Для сьогоднішнього дня враховує лише години, що ще попереду.
 * `prev` — попередній день, щоб порівняти температуру.
 */
export function describeDay(
	day: ForecastDay,
	fromHour = 0,
	prev?: ForecastDay,
	air?: DayAir,
	lang: Lang = 'uk'
): DayStory {
	const p = phrasebook(lang);
	const ahead = day.hours.filter((h) => h.hour >= fromHour);
	const hours = ahead.length ? ahead : day.hours;
	const seed = day.date;
	const evening = fromHour >= 18;

	// Заголовок — за тим самим правилом, що й іконка дня в стрічці: для цілого дня
	// це її ж код, для сьогодні — години, що попереду. Незначні опади день «дощовим» не роблять
	const daytime = hours.filter((h) => h.hour >= 9 && h.hour <= 18);
	const titleSky = sky(
		fromHour > 0
			? representativeDayCode(
					Math.max(...hours.map((h) => h.code)),
					hours,
					hours.reduce((sum, h) => sum + h.precip, 0),
					Math.max(0, ...hours.map((h) => h.precipProb ?? 0)),
					day.sunrise,
					day.sunset
				)
			: day.code
	);
	const noun = evening ? p.evening : p.day;
	const skyTitle = pick(`${seed}:title`, p.skyTitle[titleSky]).replace('{d}', noun);
	// «Сонячний вечір» звучить дивно — увечері просто ясно
	const skyPhrase = evening && titleSky === 'clear' ? `${p.clearEvening} ${noun}` : skyTitle;
	const title = cap(
		`${pick(`${seed}:warmth`, p.warmth(evening ? Math.max(...hours.map((h) => h.temp)) : day.max))} ${skyPhrase}`
	);

	const sentences: string[] = [skyStory(p, seed, hours), precipStory(p, seed, day, hours)];

	// Температура
	if (fromHour >= 15) {
		sentences.push(p.coolsTonight(signed(Math.min(...hours.map((h) => h.temp)))));
	} else if (fromHour > 0) {
		// День уже почався: лише те, що попереду. «Прогріється» до того, що вже є,
		// чи «уночі» про ніч, яка минула, — неправда
		const now = Math.round(hours[0].temp);
		const peak = Math.max(...hours.map((h) => h.temp));
		const afterPeak = hours.slice(hours.findIndex((h) => h.temp === peak));
		const low = Math.min(...afterPeak.map((h) => h.temp));
		const cools = Math.round(low) < Math.round(peak);

		if (Math.round(peak) > now) {
			sentences.push(cools ? p.warmsCools(signed(peak), signed(low)) : p.warms(signed(peak)));
		} else {
			sentences.push(cools ? p.peakPassed(signed(low)) : p.steadyTemp);
		}
	} else {
		sentences.push(pick(`${seed}:temp`, p.fullDay(signed(day.min), signed(day.max))));
	}

	if (prev && fromHour === 0) {
		const diff = Math.round(day.max - prev.max);
		if (Math.abs(diff) >= 3) sentences.push(p.vsYesterday(diff));
	}

	// Відчуття: вітер і вологість
	const sample = daytime.length ? daytime : hours;
	const feelGap = avg(sample.map((h) => h.temp)) - avg(sample.map((h) => h.feels));
	const gusts = Math.max(0, ...hours.map((h) => h.gusts));

	if (feelGap >= 4) {
		sentences.push(avg(sample.map((h) => h.wind)) >= 4 ? p.windChill : p.dampChill);
	} else if (feelGap <= -3 && day.max >= 22) {
		sentences.push(p.muggy);
	}

	// Вітер. Сильний (від 15 м/с) — у попередженнях над текстом, тут не повторюємо
	if (gusts >= 10 && gusts < 15) {
		sentences.push(pick(`${seed}:wind`, p.gusty(Math.round(gusts))));
	}

	// Повітря й пилок — лише в описі, окремої клітинки для них немає
	if (air) sentences.push(...airStory(p, air));

	// Одна доречна деталь наостанок
	const dry = !hours.some((h) => WET.includes(sky(h.code)));
	const morningFog = hours.some((h) => h.hour >= 5 && h.hour <= 10 && sky(h.code) === 'fog');

	if (morningFog && titleSky !== 'fog') {
		sentences.push(p.fog);
	} else if (dry && (day.uvMax ?? 0) >= 7 && titleSky === 'clear') {
		sentences.push(p.uv);
	} else if (
		dry &&
		!evening &&
		day.max >= 16 &&
		day.max <= 27 &&
		gusts < 10 &&
		['clear', 'cloudy'].includes(titleSky)
	) {
		sentences.push(pick(`${seed}:mood`, p.mood));
	}

	return { title, text: sentences.join(' ') };
}

/** Тривалість світлового дня: «11 год 57 хв», «11 ч 57 мин» */
export function daylight(sunrise: string, sunset: string, lang: Lang = 'uk'): string {
	const minutes = Math.round((Date.parse(sunset) - Date.parse(sunrise)) / 60000);
	return phrasebook(lang).daylight(Math.floor(minutes / 60), minutes % 60);
}

/**
 * Попередження про небезпечну погоду — лише коли вона справді очікується:
 * «Заморозки до −2°», «Сильний вітер: пориви до 17 м/с».
 * Для сьогодні враховує лише години, що попереду.
 */
export function dayWarnings(day: ForecastDay, fromHour = 0, lang: Lang = 'uk'): string[] {
	const w = phrasebook(lang).warnings;
	const ahead = day.hours.filter((h) => h.hour >= fromHour);
	const hours = ahead.length ? ahead : day.hours;
	if (hours.length === 0) return [];

	const temps = hours.map((h) => h.temp);
	const low = fromHour > 0 ? Math.min(...temps) : day.min;
	const high = fromHour > 0 ? Math.max(...temps) : day.max;
	const gusts = Math.max(...hours.map((h) => h.gusts));
	const precip = hours.reduce((sum, h) => sum + h.precip, 0);
	const warnings: string[] = [];

	if (low <= -15) warnings.push(w.frostSevere(signed(low)));
	else if (Math.round(low) <= 0) warnings.push(w.frost(signed(low)));

	if (high >= 35) warnings.push(w.heatSevere(signed(high)));
	else if (high >= 30) warnings.push(w.heat(signed(high)));

	if (gusts >= 20) warnings.push(w.windSevere(Math.round(gusts)));
	else if (gusts >= 15) warnings.push(w.wind(Math.round(gusts)));

	if (hours.some((h) => h.code >= 95)) warnings.push(w.storm);

	if (precip >= 20) {
		const snow = hours.some((h) => sky(h.code) === 'snow');
		warnings.push(snow ? w.snowfall(Math.round(precip)) : w.downpour(Math.round(precip)));
	}

	return warnings;
}
