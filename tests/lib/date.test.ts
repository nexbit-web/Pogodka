import { describe, expect, it } from 'vitest';
import {
	clock,
	dayOfMonth,
	isWeekend,
	isoWeekday,
	kyivNow,
	monthName,
	weekdayName
} from '$lib/date';

describe('kyivNow', () => {
	it('дає київські дату й годину для будь-якого моменту UTC', () => {
		expect(kyivNow(new Date('2026-09-25T11:20:00Z'))).toEqual({
			date: '2026-09-25',
			hour: 14,
			minute: 20
		});
	});

	it('після опівночі в Києві — вже наступна дата', () => {
		expect(kyivNow(new Date('2026-09-25T22:30:00Z'))).toMatchObject({
			date: '2026-09-26',
			hour: 1
		});
	});

	it('враховує зимовий час (UTC+2)', () => {
		expect(kyivNow(new Date('2026-01-15T10:00:00Z'))).toMatchObject({
			date: '2026-01-15',
			hour: 12
		});
	});

	it('опівночі година — 0, а не 24', () => {
		expect(kyivNow(new Date('2026-09-25T21:00:00Z')).hour).toBe(0);
	});
});

describe('дні тижня', () => {
	it.each([
		['2026-09-21', 1, 'понеділок', 'пн'],
		['2026-09-25', 5, 'пʼятниця', 'пт'],
		['2026-09-26', 6, 'субота', 'сб'],
		['2026-09-27', 7, 'неділя', 'нд']
	])('%s — %i, %s', (iso, num, full, short) => {
		expect(isoWeekday(iso)).toBe(num);
		expect(weekdayName(iso)).toBe(full);
		expect(weekdayName(iso, true)).toBe(short);
	});

	it('вихідні — субота й неділя', () => {
		expect(isWeekend('2026-09-25')).toBe(false);
		expect(isWeekend('2026-09-26')).toBe(true);
		expect(isWeekend('2026-09-27')).toBe(true);
	});

	it('день тижня не залежить від часу в рядку', () => {
		expect(isoWeekday('2026-09-25T23:00')).toBe(5);
	});
});

describe('форматування', () => {
	it('число місяця без нуля', () => {
		expect(dayOfMonth('2026-10-01')).toBe(1);
		expect(dayOfMonth('2026-09-25')).toBe(25);
	});

	it('місяць у родовому відмінку', () => {
		expect(monthName('2026-01-10')).toBe('січня');
		expect(monthName('2026-09-25')).toBe('вересня');
		expect(monthName('2026-12-31')).toBe('грудня');
	});

	it('час з нулем і без', () => {
		expect(clock('2026-09-25T06:25')).toBe('06:25');
		expect(clock('2026-09-25T06:00', false)).toBe('6:00');
		expect(clock('2026-09-25T21:00', false)).toBe('21:00');
	});
});
