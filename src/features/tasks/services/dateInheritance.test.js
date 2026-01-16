import { describe, it, expect } from 'vitest';
import { calculateMinMaxDates } from '@shared/lib/date-engine';

describe('Date Inheritance Logic', () => {
    it('returns nulls for empty children', () => {
        expect(calculateMinMaxDates([])).toEqual({ start_date: null, due_date: null });
        expect(calculateMinMaxDates(null)).toEqual({ start_date: null, due_date: null });
    });

    it('aggregates single child dates', () => {
        const children = [{ start_date: '2024-01-01', due_date: '2024-01-05' }];
        expect(calculateMinMaxDates(children)).toEqual({
            start_date: '2024-01-01',
            due_date: '2024-01-05',
        });
    });

    it('calculates min start and max due', () => {
        const children = [
            { start_date: '2024-01-10', due_date: '2024-01-15' },
            { start_date: '2024-01-01', due_date: '2024-01-05' }, // Earlier start
            { start_date: '2024-01-20', due_date: '2024-01-25' }, // Later end
        ];
        // Min start: 01-01, Max due: 01-25
        expect(calculateMinMaxDates(children)).toEqual({
            start_date: '2024-01-01',
            due_date: '2024-01-25',
        });
    });

    it('ignores null dates', () => {
        const children = [
            { start_date: '2024-01-10', due_date: null },
            { start_date: null, due_date: '2024-01-20' },
        ];
        expect(calculateMinMaxDates(children)).toEqual({
            start_date: '2024-01-10',
            due_date: '2024-01-20',
        });
    });

    it('handles mixed valid and invalid strings gracefully (via toIsoDate)', () => {
        // Note: toIsoDate handles parsing. We assume it works.
        // If a date is invalid, calculateMinMaxDates should arguably ignore it.
        // Let's verify existing behavior.
        const children = [
            { start_date: 'invalid', due_date: '2024-01-01' }
        ];
        // Logic: toIsoDate('invalid') -> null? need to check toIsoDate implementation.
        // In date-engine: if isNaN -> return null.
        // So minStart should stay null.
        expect(calculateMinMaxDates(children)).toEqual({
            start_date: null,
            due_date: '2024-01-01'
        });
    });
});
