import { describe, it, expect } from 'vitest';
import {
    toUtcMonthKey,
    toUtcIsoDate,
    dateStringToUtcMidnightMs,
    dateStringToUtcMonthKey,
} from '../../../../../supabase/functions/_shared/date';

describe('toUtcMonthKey', () => {
    it('returns YYYY-MM derived from UTC fields', () => {
        expect(toUtcMonthKey(new Date('2026-04-16T23:30:00Z'))).toBe('2026-04');
    });

    it('does not drift to the next month at late-UTC boundaries', () => {
        // 23:30 UTC on the last day of the month stays in that month.
        expect(toUtcMonthKey(new Date('2026-01-31T23:30:00Z'))).toBe('2026-01');
    });
});

describe('toUtcIsoDate', () => {
    it('returns the UTC calendar date as YYYY-MM-DD', () => {
        expect(toUtcIsoDate(new Date('2026-04-16T23:30:00Z'))).toBe('2026-04-16');
    });

    it('pads single-digit months and days', () => {
        expect(toUtcIsoDate(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
    });
});

describe('dateStringToUtcMidnightMs', () => {
    it('treats a bare YYYY-MM-DD string as UTC midnight', () => {
        expect(dateStringToUtcMidnightMs('2026-04-16')).toBe(Date.UTC(2026, 3, 16));
    });

    it('truncates the time-of-day to UTC midnight', () => {
        expect(dateStringToUtcMidnightMs('2026-04-16T14:22:10Z')).toBe(Date.UTC(2026, 3, 16));
    });

    it('returns null for null/empty input', () => {
        expect(dateStringToUtcMidnightMs(null)).toBeNull();
        expect(dateStringToUtcMidnightMs('')).toBeNull();
    });

    it('returns null for unparseable input', () => {
        expect(dateStringToUtcMidnightMs('not-a-date')).toBeNull();
    });
});

describe('dateStringToUtcMonthKey', () => {
    it('short-circuits on YYYY-MM-DD strings without parsing', () => {
        expect(dateStringToUtcMonthKey('2026-04-16')).toBe('2026-04');
    });

    it('parses full ISO timestamps via UTC', () => {
        expect(dateStringToUtcMonthKey('2026-04-16T23:30:00Z')).toBe('2026-04');
    });

    it('returns null for null or unparseable input', () => {
        expect(dateStringToUtcMonthKey(null)).toBeNull();
        expect(dateStringToUtcMonthKey('garbage')).toBeNull();
    });
});
