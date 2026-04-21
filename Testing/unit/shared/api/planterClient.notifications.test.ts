import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNotificationPref, makeNotificationLogRow } from '@test';

function createChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const methods = [
        'select', 'insert', 'update', 'delete', 'upsert',
        'eq', 'neq', 'is', 'in', 'lt', 'or', 'order', 'range', 'limit',
        'maybeSingle', 'single', 'abortSignal',
    ];
    for (const m of methods) {
        chain[m] = vi.fn().mockReturnValue(chain);
    }
    (chain as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve: (v: unknown) => void) =>
        resolve(resolvedValue);
    return chain;
}

const mockFrom = vi.fn();
vi.mock('@/shared/db/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
vi.mock('@/shared/lib/retry', () => ({ retry: (fn: () => unknown) => fn() }));
vi.mock('@/shared/lib/date-engine', () => ({
    toIsoDate: (v: unknown) => (v ? String(v) : null),
    nowUtcIso: () => '2026-04-18T12:00:00.000Z',
    calculateMinMaxDates: vi.fn().mockReturnValue({ start_date: null, due_date: null }),
}));

import { planter } from '@/shared/api/planterClient';

describe('planter.notifications (Wave 30)', () => {
    beforeEach(() => {
        mockFrom.mockReset();
    });

    describe('getPreferences', () => {
        it('reads the authenticated user row via RLS (no explicit filter)', async () => {
            const row = makeNotificationPref();
            const chain = createChain({ data: row, error: null });
            mockFrom.mockReturnValue(chain);

            const result = await planter.notifications.getPreferences();

            expect(mockFrom).toHaveBeenCalledWith('notification_preferences');
            expect(chain.select).toHaveBeenCalledWith('*');
            expect(chain.maybeSingle).toHaveBeenCalled();
            expect(result).toEqual(row);
        });

        it('throws when the row is missing (no bootstrap yet)', async () => {
            const chain = createChain({ data: null, error: null });
            mockFrom.mockReturnValue(chain);
            await expect(planter.notifications.getPreferences()).rejects.toThrow(/missing/);
        });
    });

    describe('updatePreferences', () => {
        it('sends a partial patch and returns the updated row', async () => {
            const updated = makeNotificationPref({ email_overdue_digest: 'weekly' });
            const chain = createChain({ data: updated, error: null });
            mockFrom.mockReturnValue(chain);

            const result = await planter.notifications.updatePreferences({ email_overdue_digest: 'weekly' });

            expect(mockFrom).toHaveBeenCalledWith('notification_preferences');
            expect(chain.update).toHaveBeenCalledWith({ email_overdue_digest: 'weekly' });
            expect(chain.single).toHaveBeenCalled();
            expect(result).toEqual(updated);
        });
    });

    describe('listLog', () => {
        it('returns newest-first up to default 50 rows', async () => {
            const rows = [makeNotificationLogRow(), makeNotificationLogRow()];
            const chain = createChain({ data: rows, error: null });
            mockFrom.mockReturnValue(chain);

            const result = await planter.notifications.listLog();

            expect(mockFrom).toHaveBeenCalledWith('notification_log');
            expect(chain.order).toHaveBeenCalledWith('sent_at', { ascending: false });
            expect(chain.limit).toHaveBeenCalledWith(50);
            expect(result).toEqual(rows);
        });

        it('honors before + eventType filters', async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await planter.notifications.listLog({ limit: 10, before: '2026-04-01T00:00:00Z', eventType: 'mention_pending' });

            expect(chain.limit).toHaveBeenCalledWith(10);
            expect(chain.lt).toHaveBeenCalledWith('sent_at', '2026-04-01T00:00:00Z');
            expect(chain.eq).toHaveBeenCalledWith('event_type', 'mention_pending');
        });
    });
});
