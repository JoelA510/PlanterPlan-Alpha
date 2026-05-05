import { describe, expect, it } from 'vitest';
import { dueSoonCutoffMs } from '@/../supabase/functions/nightly-sync/urgency';

describe('nightly-sync dueSoonCutoffMs', () => {
    it('preserves the original UTC time of day while adding calendar days', () => {
        const cutoff = dueSoonCutoffMs('2026-01-02T12:34:56.000Z', 1);

        expect(cutoff).not.toBeNull();
        expect(new Date(cutoff as number).toISOString()).toBe('2026-01-03T12:34:56.000Z');
    });

    it('keeps weekend-inclusive calendar-day threshold behavior', () => {
        const cutoff = dueSoonCutoffMs('2026-01-02T00:00:00.000Z', 3);

        expect(cutoff).not.toBeNull();
        expect(new Date(cutoff as number).toISOString()).toBe('2026-01-05T00:00:00.000Z');
    });

    it('returns null for invalid timestamps', () => {
        expect(dueSoonCutoffMs('not-a-date', 1)).toBeNull();
    });
});
