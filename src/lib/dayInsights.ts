import { representativeDayCode } from './weather';
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
const PARTS = [
	{ name: 'вночі', from: 0, to: 6 },
	{ name: 'вранці', from: 6, to: 12 },
	{ name: 'вдень', from: 12, to: 18 },
	{ name: 'ввечері', from: 18, to: 24 }
];

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

// Характер дня за денним максимумом
function warmth(max: number): string[] {
	if (max >= 30) return ['спекотний', 'по-справжньому спекотний'];
	if (max >= 24) return ['теплий', 'по-літньому теплий'];
	if (max >= 17) return ['мʼякий', 'приємно теплий'];
	if (max >= 11) return ['свіжий', 'прохолодний'];
	if (max >= 4) return ['прохолодний', 'зябкий'];
	if (max >= 0) return ['холодний'];
	return ['морозний'];
}

// Заголовок: «Теплий день із проясненнями». {d} — «день» або «вечір»
const SKY_TITLE: Record<Sky, string[]> = {
	clear: ['сонячний {d}', 'ясний {d}'],
	cloudy: ['{d} із проясненнями', '{d} зі змінною хмарністю'],
	overcast: ['похмурий {d}', 'сірий {d}'],
	fog: ['туманний {d}'],
	drizzle: ['{d} із мрякою'],
	rain: ['дощовий {d}', '{d} із дощем'],
	snow: ['сніжний {d}', '{d} зі снігопадом'],
	storm: ['грозовий {d}', '{d} із грозами']
};

// Коли стан неба не змінюється за весь час
const SKY_STEADY: Record<Sky, string[]> = {
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
};

// Фраза для частини доби; {t} — «вранці», «вдень»…
const SKY_PART: Record<Sky, string[]> = {
	clear: ['{t} ясно', '{t} світитиме сонце'],
	cloudy: ['{t} мінлива хмарність', '{t} сонце чергуватиметься з хмарами'],
	overcast: ['{t} небо затягнуть хмари', '{t} похмуро'],
	fog: ['{t} ляже туман', '{t} туман'],
	drizzle: ['{t} мрячитиме', '{t} сіятиме мряка'],
	rain: ['{t} пройде дощ', '{t} дощитиме'],
	snow: ['{t} піде сніг', '{t} сніжитиме'],
	storm: ['{t} можлива гроза', '{t} налетить гроза']
};

/** Хід погоди протягом дня: «Вранці похмуро, вдень розвидниться, а ввечері пройде дощ.» */
function skyStory(seed: string, hours: DayHour[]): string {
	const parts = PARTS.map((p) => ({
		name: p.name,
		hours: hours.filter((h) => h.hour >= p.from && h.hour < p.to)
	}))
		.filter((p) => p.hours.length > 0)
		.map((p) => ({ name: p.name, sky: dominantSky(p.hours) }));

	const merged: { names: string[]; sky: Sky }[] = [];
	for (const p of parts) {
		const last = merged.at(-1);
		if (last && last.sky === p.sky) last.names.push(p.name);
		else merged.push({ names: [p.name], sky: p.sky });
	}

	if (merged.length <= 1) return pick(`${seed}:steady`, SKY_STEADY[merged[0]?.sky ?? 'clear']);

	const used = new Set<string>();
	const phrases = merged.map((m, i) => {
		const t = m.names.join(' та ');
		// Сонце після хмар чи опадів — «розвидниться»
		if (m.sky === 'clear' && i > 0) return `${t} розвидниться`;
		// Про сонце — лише вранці й удень: уночі та ввечері воно не світить
		const sunny = m.names.includes('вранці') || m.names.includes('вдень');
		const options = sunny ? SKY_PART[m.sky] : SKY_PART[m.sky].filter((o) => !o.includes('сонце'));
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
function precipStory(seed: string, day: ForecastDay, hours: DayHour[]): string {
	const wet = hours.filter((h) => h.precip >= 0.1 || WET.includes(sky(h.code)));

	if (wet.length === 0) {
		if ((day.precipProbMax ?? 0) >= 30) {
			return pick(`${seed}:maybe`, [
				'Короткий дощ не виключений, але, найімовірніше, обійдеться.',
				'Невелика ймовірність дощу є, проте, найпевніше, буде сухо.'
			]);
		}
		return pick(`${seed}:dry`, [
			'Опадів не передбачається.',
			'Обійдеться без опадів.',
			'День мине сухо.'
		]);
	}

	const sum = wet.reduce((s, h) => s + h.precip, 0);
	const kinds = new Set(wet.map((h) => sky(h.code)));

	let subject: string;
	if (kinds.has('storm')) subject = sum >= 5 ? 'Гроза зі зливою' : 'Гроза';
	else if (kinds.has('snow'))
		subject = sum < 1 ? 'Невеликий сніг' : sum < 5 ? 'Сніг' : 'Сильний снігопад';
	else if (!kinds.has('rain') && kinds.has('drizzle')) subject = 'Мряка';
	else subject = sum < 1 ? 'Невеликий дощ' : sum < 5 ? 'Дощ' : sum < 15 ? 'Сильний дощ' : 'Злива';

	const from = wet[0].hour;
	const to = wet.at(-1)!.hour + 1;
	let when: string;
	if (to - from >= 12) when = 'з перервами протягом дня';
	else if (to - from <= 1) when = `близько ${from}:00`;
	else when = `приблизно з ${from}:00 до ${to === 24 ? 0 : to}:00`;

	const amount = sum >= 0.5 && subject !== 'Мряка' ? `, до ${mm(sum)} мм` : '';
	let text = `${subject} очікується ${when}${amount}.`;

	if (kinds.has('snow') && sum >= 1) {
		text += ' Дороги можуть бути слизькими.';
	} else if (sum >= 0.5) {
		text += ` ${pick(`${seed}:umbrella`, ['Парасолька знадобиться.', 'Варто взяти парасольку.'])}`;
	}
	return text;
}

export interface DayStory {
	/** Коротко про характер дня: «Теплий день із проясненнями» */
	title: string;
	/** Кілька речень людською мовою */
	text: string;
}

/**
 * Опис дня, як від ведучого прогнозу погоди.
 * Для сьогоднішнього дня враховує лише години, що ще попереду.
 * `prev` — попередній день, щоб порівняти температуру.
 */
/** Повітря дня для опису: європейський індекс AQI і помітний пилок */
export interface DayAir {
	aqi: number | null;
	pollen: { name: string; level: 'помірний' | 'високий' } | null;
}

// Пилок у родовому відмінку: «концентрація пилку амброзії»
const POLLEN_OF: Record<string, string> = {
	Амброзія: 'амброзії',
	Береза: 'берези',
	Вільха: 'вільхи',
	Злаки: 'злакових трав',
	Полин: 'полину'
};

/** Речення про повітря за шкалою EEA; для забрудненого — що з цим робити */
function airStory(air: DayAir): string[] {
	const sentences: string[] = [];
	const { aqi, pollen } = air;

	if (aqi !== null) {
		if (aqi <= 20) sentences.push('Повітря чисте.');
		else if (aqi <= 40) sentences.push('Якість повітря задовільна.');
		else if (aqi <= 60)
			sentences.push(
				'Якість повітря помірна: людям із хворобами дихання краще не перенавантажуватися надворі.'
			);
		else if (aqi <= 80) sentences.push('Повітря забруднене: варто менше бувати надворі.');
		else sentences.push('Повітря дуже забруднене: краще залишатися в приміщенні.');
	}

	if (pollen) {
		const of = POLLEN_OF[pollen.name] ?? pollen.name.toLowerCase();
		sentences.push(
			pollen.level === 'високий'
				? `Висока концентрація пилку ${of} — алергікам варто бути обережними.`
				: `Помірна концентрація пилку ${of}.`
		);
	}
	return sentences;
}

export function describeDay(
	day: ForecastDay,
	fromHour = 0,
	prev?: ForecastDay,
	air?: DayAir
): DayStory {
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
	const noun = evening ? 'вечір' : 'день';
	const skyTitle = pick(`${seed}:title`, SKY_TITLE[titleSky]).replace('{d}', noun);
	// «Сонячний вечір» звучить дивно — увечері просто ясно
	const skyPhrase = evening && titleSky === 'clear' ? `ясний ${noun}` : skyTitle;
	const title = cap(
		`${pick(`${seed}:warmth`, warmth(evening ? Math.max(...hours.map((h) => h.temp)) : day.max))} ${skyPhrase}`
	);

	const sentences: string[] = [skyStory(seed, hours), precipStory(seed, day, hours)];

	// Температура
	if (fromHour >= 15) {
		const low = Math.min(...hours.map((h) => h.temp));
		sentences.push(`До ночі похолоднішає до ${signed(low)}.`);
	} else if (fromHour > 0) {
		// День уже почався: лише те, що попереду. «Прогріється» до того, що вже є,
		// чи «уночі» про ніч, яка минула, — неправда
		const now = Math.round(hours[0].temp);
		const peak = Math.max(...hours.map((h) => h.temp));
		const afterPeak = hours.slice(hours.findIndex((h) => h.temp === peak));
		const low = Math.min(...afterPeak.map((h) => h.temp));
		const cools = Math.round(low) < Math.round(peak);

		if (Math.round(peak) > now) {
			sentences.push(
				cools
					? `Удень потеплішає до ${signed(peak)}, а до ночі похолоднішає до ${signed(low)}.`
					: `Удень потеплішає до ${signed(peak)}.`
			);
		} else {
			sentences.push(
				cools
					? `Тепліше вже не буде: до ночі похолоднішає до ${signed(low)}.`
					: `Температура до вечора майже не зміниться.`
			);
		}
	} else {
		sentences.push(
			pick(`${seed}:temp`, [
				`Удень повітря прогріється до ${signed(day.max)}, уночі — ${signed(day.min)}.`,
				`Температура — від ${signed(day.min)} уночі до ${signed(day.max)} удень.`,
				`Максимум — ${signed(day.max)}, мінімум уночі — ${signed(day.min)}.`
			])
		);
	}

	if (prev && fromHour === 0) {
		const diff = Math.round(day.max - prev.max);
		if (Math.abs(diff) >= 3) {
			sentences.push(
				`Це на ${Math.abs(diff)}° ${diff > 0 ? 'тепліше' : 'холодніше'}, ніж напередодні.`
			);
		}
	}

	// Відчуття: вітер і вологість
	const sample = daytime.length ? daytime : hours;
	const feelGap = avg(sample.map((h) => h.temp)) - avg(sample.map((h) => h.feels));
	const gusts = Math.max(0, ...hours.map((h) => h.gusts));

	if (feelGap >= 4) {
		sentences.push(
			avg(sample.map((h) => h.wind)) >= 4
				? 'Через вітер надворі здаватиметься помітно холодніше.'
				: 'Через вологість надворі здаватиметься холодніше, ніж на термометрі.'
		);
	} else if (feelGap <= -3 && day.max >= 22) {
		sentences.push('Через вологість спека відчуватиметься сильніше.');
	}

	// Вітер. Сильний (від 15 м/с) — у попередженнях над текстом, тут не повторюємо
	if (gusts >= 10 && gusts < 15) {
		sentences.push(
			pick(`${seed}:wind`, [
				`Місцями поривчастий вітер, до ${Math.round(gusts)} м/с.`,
				`Вітер часом посилюватиметься до ${Math.round(gusts)} м/с.`
			])
		);
	}

	// Повітря й пилок — лише в описі, окремої клітинки для них немає
	if (air) sentences.push(...airStory(air));

	// Одна доречна деталь наостанок
	const dry = !hours.some((h) => WET.includes(sky(h.code)));
	const morningFog = hours.some((h) => h.hour >= 5 && h.hour <= 10 && sky(h.code) === 'fog');

	if (morningFog && titleSky !== 'fog') {
		sentences.push('Вранці через туман на дорогах можлива погана видимість.');
	} else if (dry && (day.uvMax ?? 0) >= 7 && titleSky === 'clear') {
		sentences.push('Сонце активне, тож захист від ультрафіолету не завадить.');
	} else if (
		dry &&
		!evening &&
		day.max >= 16 &&
		day.max <= 27 &&
		gusts < 10 &&
		['clear', 'cloudy'].includes(titleSky)
	) {
		sentences.push(
			pick(`${seed}:mood`, ['Чудовий день для прогулянки.', 'Гарна нагода побути надворі.'])
		);
	}

	return { title, text: sentences.join(' ') };
}

/** Тривалість світлового дня: «11 год 57 хв» */
export function daylight(sunrise: string, sunset: string): string {
	const minutes = Math.round((Date.parse(sunset) - Date.parse(sunrise)) / 60000);
	return `${Math.floor(minutes / 60)} год ${minutes % 60} хв`;
}

/**
 * Попередження про небезпечну погоду — лише коли вона справді очікується:
 * «Заморозки до −2°», «Сильний вітер: пориви до 17 м/с».
 * Для сьогодні враховує лише години, що попереду.
 */
export function dayWarnings(day: ForecastDay, fromHour = 0): string[] {
	const ahead = day.hours.filter((h) => h.hour >= fromHour);
	const hours = ahead.length ? ahead : day.hours;
	if (hours.length === 0) return [];

	const temps = hours.map((h) => h.temp);
	const low = fromHour > 0 ? Math.min(...temps) : day.min;
	const high = fromHour > 0 ? Math.max(...temps) : day.max;
	const gusts = Math.max(...hours.map((h) => h.gusts));
	const precip = hours.reduce((sum, h) => sum + h.precip, 0);
	const warnings: string[] = [];

	if (low <= -15) warnings.push(`Сильний мороз до ${signed(low)}`);
	else if (Math.round(low) <= 0) warnings.push(`Заморозки до ${signed(low)}`);

	if (high >= 35) warnings.push(`Сильна спека до ${signed(high)}`);
	else if (high >= 30) warnings.push(`Спека до ${signed(high)}`);

	if (gusts >= 20) warnings.push(`Дуже сильний вітер: пориви до ${Math.round(gusts)} м/с`);
	else if (gusts >= 15) warnings.push(`Сильний вітер: пориви до ${Math.round(gusts)} м/с`);

	if (hours.some((h) => h.code >= 95)) warnings.push('Можлива гроза');

	if (precip >= 20) {
		const snow = hours.some((h) => sky(h.code) === 'snow');
		warnings.push(`${snow ? 'Сильний снігопад' : 'Сильні опади'}: до ${Math.round(precip)} мм`);
	}

	return warnings;
}
