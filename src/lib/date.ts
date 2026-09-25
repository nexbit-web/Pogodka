/*
	Дати без бібліотек. Open-Meteo вже віддає час у київському поясі рядками
	«YYYY-MM-DD» і «YYYY-MM-DDTHH:mm», тож для показу їх достатньо розібрати.
	Так у браузер не їде luxon (~20 КБ gzip), а результат однаковий на сервері й клієнті.
*/

export const KYIV_TZ = 'Europe/Kyiv';

const WEEKDAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота'];
const WEEKDAYS_SHORT = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
// Родовий відмінок: «25 вересня»
const MONTHS = [
	'січня',
	'лютого',
	'березня',
	'квітня',
	'травня',
	'червня',
	'липня',
	'серпня',
	'вересня',
	'жовтня',
	'листопада',
	'грудня'
];

const kyivParts = new Intl.DateTimeFormat('en-CA', {
	timeZone: KYIV_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** Поточна дата й година в Києві, незалежно від поясу сервера чи пристрою */
export function kyivNow(now: Date = new Date()): { date: string; hour: number; minute: number } {
	const p = Object.fromEntries(kyivParts.formatToParts(now).map((x) => [x.type, x.value]));
	return {
		date: `${p.year}-${p.month}-${p.day}`,
		hour: Number(p.hour) % 24,
		minute: Number(p.minute)
	};
}

/** День тижня за ISO: 1 — понеділок … 7 — неділя */
export function isoWeekday(iso: string): number {
	const day = new Date(
		Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
	).getUTCDay();
	return day === 0 ? 7 : day;
}

export const isWeekend = (iso: string) => isoWeekday(iso) >= 6;

/** «пʼятниця» або коротко «пт» */
export function weekdayName(iso: string, short = false): string {
	return (short ? WEEKDAYS_SHORT : WEEKDAYS)[isoWeekday(iso) % 7];
}

/** Число місяця без нуля попереду */
export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));

/** Місяць у родовому відмінку: «вересня» */
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];

/** Час із рядка: «06:25», або без нуля попереду — «6:25» */
export function clock(iso: string, pad = true): string {
	const hh = iso.slice(11, 13);
	const mm = iso.slice(14, 16);
	return `${pad ? hh : Number(hh)}:${mm}`;
}
