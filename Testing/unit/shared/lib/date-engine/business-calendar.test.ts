import { describe, expect, it } from 'vitest';
import {
    calendarDayBusinessCalendar,
    defaultBusinessCalendar,
    type BusinessCalendar,
} from '@/shared/lib/date-engine/business-calendar';
import { toIsoDate } from '@/shared/lib/date-engine';

describe('business-calendar abstraction', () => {
    it('exports the calendar-day implementation as the default business calendar', () => {
        expect(defaultBusinessCalendar).toBe(calendarDayBusinessCalendar);
        expect(defaultBusinessCalendar.id).toBe('calendar-day');
    });

    it('preserves current calendar-day addition behavior', () => {
        const fridayUtc = '2026-01-02T00:00:00.000Z';

        expect(toIsoDate(calendarDayBusinessCalendar.addBusinessDays(fridayUtc, 1))).toBe('2026-01-03');
        expect(toIsoDate(calendarDayBusinessCalendar.addBusinessDays(fridayUtc, -1))).toBe('2026-01-01');
    });

    it('treats weekends as business days until holiday/weekend rules are explicitly added', () => {
        expect(calendarDayBusinessCalendar.isBusinessDay('2026-01-03')).toBe(true);
    });

    it('calculates current business-day differences as calendar-day differences', () => {
        expect(calendarDayBusinessCalendar.diffInBusinessDays('2026-01-05', '2026-01-02')).toBe(3);
        expect(calendarDayBusinessCalendar.diffInBusinessDays('2026-01-02', '2026-01-05')).toBe(-3);
    });

    it('returns null/false for invalid inputs', () => {
        expect(calendarDayBusinessCalendar.addBusinessDays(null, 1)).toBeNull();
        expect(calendarDayBusinessCalendar.diffInBusinessDays('2026-01-05', 'not-a-date')).toBeNull();
        expect(calendarDayBusinessCalendar.isBusinessDay('not-a-date')).toBe(false);
    });

    it('has a typed contract for future calendar implementations', () => {
        const calendar: BusinessCalendar = calendarDayBusinessCalendar;

        expect(calendar.id).toBe('calendar-day');
    });
});
