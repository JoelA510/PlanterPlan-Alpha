import { describe, it, expect } from 'vitest';
import { shouldFireRecurrenceOn, isRecurrenceRule } from '@/shared/lib/recurrence';
import type { RecurrenceRule } from '@/shared/db/app.types';

describe('shouldFireRecurrenceOn — weekly', () => {
    const mondayRule: RecurrenceRule = { kind: 'weekly', weekday: 1, targetProjectId: 'p-1' };

    it('fires when the UTC weekday matches', () => {
        // 2026-04-13 is a Monday (UTC).
        expect(shouldFireRecurrenceOn(mondayRule, new Date('2026-04-13T12:00:00Z'))).toBe(true);
    });

    it('does not fire on a different weekday', () => {
        // 2026-04-14 is a Tuesday (UTC).
        expect(shouldFireRecurrenceOn(mondayRule, new Date('2026-04-14T12:00:00Z'))).toBe(false);
    });

    it('uses UTC weekday, not local', () => {
        // 2026-04-13T23:30Z is still Monday UTC regardless of caller locale.
        expect(shouldFireRecurrenceOn(mondayRule, new Date('2026-04-13T23:30:00Z'))).toBe(true);
    });
});

describe('shouldFireRecurrenceOn — monthly', () => {
    const firstOfMonth: RecurrenceRule = { kind: 'monthly', dayOfMonth: 1, targetProjectId: 'p-1' };

    it('fires on the configured day-of-month', () => {
        expect(shouldFireRecurrenceOn(firstOfMonth, new Date('2026-05-01T00:00:00Z'))).toBe(true);
    });

    it('does not fire on other days', () => {
        expect(shouldFireRecurrenceOn(firstOfMonth, new Date('2026-05-02T00:00:00Z'))).toBe(false);
    });

    it('handles February without leap-year drift (dayOfMonth capped at 28)', () => {
        const feb28: RecurrenceRule = { kind: 'monthly', dayOfMonth: 28, targetProjectId: 'p-1' };
        // 2028 is a leap year — Feb still has a 28th.
        expect(shouldFireRecurrenceOn(feb28, new Date('2028-02-28T00:00:00Z'))).toBe(true);
        // Feb 29 must not falsely match a day-28 rule.
        expect(shouldFireRecurrenceOn(feb28, new Date('2028-02-29T00:00:00Z'))).toBe(false);
    });
});

describe('isRecurrenceRule', () => {
    it('accepts a valid weekly rule', () => {
        expect(
            isRecurrenceRule({ kind: 'weekly', weekday: 3, targetProjectId: 'p-1' }),
        ).toBe(true);
    });

    it('accepts a valid monthly rule', () => {
        expect(
            isRecurrenceRule({ kind: 'monthly', dayOfMonth: 15, targetProjectId: 'p-1' }),
        ).toBe(true);
    });

    it('rejects unknown kinds', () => {
        expect(
            isRecurrenceRule({ kind: 'yearly', targetProjectId: 'p-1' }),
        ).toBe(false);
    });

    it('rejects out-of-range weekday', () => {
        expect(
            isRecurrenceRule({ kind: 'weekly', weekday: 7, targetProjectId: 'p-1' }),
        ).toBe(false);
    });

    it('rejects dayOfMonth > 28', () => {
        expect(
            isRecurrenceRule({ kind: 'monthly', dayOfMonth: 31, targetProjectId: 'p-1' }),
        ).toBe(false);
    });

    it('rejects rules with a missing targetProjectId', () => {
        expect(isRecurrenceRule({ kind: 'weekly', weekday: 1 })).toBe(false);
        expect(isRecurrenceRule({ kind: 'weekly', weekday: 1, targetProjectId: '' })).toBe(false);
    });

    it('rejects non-objects', () => {
        expect(isRecurrenceRule(null)).toBe(false);
        expect(isRecurrenceRule('weekly')).toBe(false);
        expect(isRecurrenceRule(undefined)).toBe(false);
    });
});
