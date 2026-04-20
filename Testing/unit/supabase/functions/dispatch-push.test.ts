import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchToUsers, type DispatchBody, type SendFn, type SupabaseLike, type PushSubRow } from '../../../../supabase/functions/dispatch-push/dispatch';

interface LoggedRow {
    user_id: string;
    channel: string;
    event_type: string;
    payload: Record<string, unknown>;
    error: string | null;
    provider_id: string | null;
}

/** Builds a fake Supabase client that routes `.from(table).select(...).in(...)` calls to the supplied table data. */
function makeFakeSupabase(tables: {
    notification_preferences?: unknown[];
    push_subscriptions?: unknown[];
}) {
    const insertedLogs: LoggedRow[] = [];
    const deletedSubIds: string[] = [];

    const from: SupabaseLike['from'] = (table: string) => ({
        select: () => ({
            in: async () => {
                if (table === 'notification_preferences') {
                    return { data: tables.notification_preferences ?? [], error: null };
                }
                if (table === 'push_subscriptions') {
                    return { data: tables.push_subscriptions ?? [], error: null };
                }
                return { data: [], error: null };
            },
        }),
        insert: async (row: Record<string, unknown>) => {
            if (table === 'notification_log') insertedLogs.push(row as unknown as LoggedRow);
            return { error: null };
        },
        delete: () => ({
            eq: async (_col: string, value: string) => {
                if (table === 'push_subscriptions') deletedSubIds.push(value);
                return { error: null };
            },
        }),
    });

    return { supabase: { from } satisfies SupabaseLike, insertedLogs, deletedSubIds };
}

const body: DispatchBody = {
    user_ids: ['u-1'],
    title: 'Test',
    body: 'Hello',
    event_type: 'mentions',
};

const baseNow = new Date('2026-04-18T12:00:00Z');

beforeEach(() => {
    vi.useRealTimers();
});

describe('dispatchToUsers (Wave 30 Task 2)', () => {
    it('skips + logs pref_disabled when push_mentions=false', async () => {
        const { supabase, insertedLogs } = makeFakeSupabase({
            notification_preferences: [{
                user_id: 'u-1',
                push_mentions: false,
                push_overdue: true,
                push_assignment: true,
                quiet_hours_start: null,
                quiet_hours_end: null,
                timezone: 'UTC',
            }],
            push_subscriptions: [],
        });
        const send = vi.fn<SendFn>();

        const result = await dispatchToUsers(supabase, body, baseNow, send);

        expect(send).not.toHaveBeenCalled();
        expect(result).toEqual({ sent: 0, skipped: 1, failed: 0 });
        expect(insertedLogs[0]).toMatchObject({ error: 'pref_disabled', user_id: 'u-1' });
    });

    it('skips + logs quiet_hours when local-now is in the quiet window', async () => {
        // quiet 08:00–20:00 UTC; baseNow is 12:00 UTC → in window.
        const { supabase, insertedLogs } = makeFakeSupabase({
            notification_preferences: [{
                user_id: 'u-1',
                push_mentions: true,
                push_overdue: true,
                push_assignment: true,
                quiet_hours_start: '08:00:00',
                quiet_hours_end: '20:00:00',
                timezone: 'UTC',
            }],
            push_subscriptions: [
                { id: 's-1', user_id: 'u-1', endpoint: 'https://fcm.example/1', p256dh: 'p', auth: 'a' },
            ],
        });
        const send = vi.fn<SendFn>();

        const result = await dispatchToUsers(supabase, body, baseNow, send);

        expect(send).not.toHaveBeenCalled();
        expect(result).toEqual({ sent: 0, skipped: 1, failed: 0 });
        expect(insertedLogs[0]).toMatchObject({ error: 'quiet_hours' });
    });

    it('logs success + provider_id on 200', async () => {
        const { supabase, insertedLogs } = makeFakeSupabase({
            notification_preferences: [{
                user_id: 'u-1',
                push_mentions: true,
                push_overdue: true,
                push_assignment: true,
                quiet_hours_start: null,
                quiet_hours_end: null,
                timezone: 'UTC',
            }],
            push_subscriptions: [
                { id: 's-1', user_id: 'u-1', endpoint: 'https://fcm.example/1', p256dh: 'p', auth: 'a' },
            ],
        });
        const send = vi.fn<SendFn>().mockResolvedValue({ statusCode: 200, headers: { 'x-message-id': 'msg-123' } });

        const result = await dispatchToUsers(supabase, body, baseNow, send);

        expect(send).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 });
        expect(insertedLogs[0]).toMatchObject({ error: null, provider_id: 'msg-123' });
    });

    it('410 → DELETE the subscription row + logs 410_gone', async () => {
        const { supabase, insertedLogs, deletedSubIds } = makeFakeSupabase({
            notification_preferences: [{
                user_id: 'u-1',
                push_mentions: true,
                push_overdue: true,
                push_assignment: true,
                quiet_hours_start: null,
                quiet_hours_end: null,
                timezone: 'UTC',
            }],
            push_subscriptions: [
                { id: 's-stale', user_id: 'u-1', endpoint: 'https://fcm.example/stale', p256dh: 'p', auth: 'a' },
            ],
        });
        const send = vi.fn<SendFn>().mockRejectedValue({ statusCode: 410 });

        const result = await dispatchToUsers(supabase, body, baseNow, send);

        expect(result).toEqual({ sent: 0, skipped: 0, failed: 1 });
        expect(deletedSubIds).toEqual(['s-stale']);
        expect(insertedLogs[0]).toMatchObject({ error: '410_gone' });
    });

    it('iterates multiple subscriptions per user', async () => {
        const subs: PushSubRow[] = [
            { id: 's-1', user_id: 'u-1', endpoint: 'https://fcm.example/1', p256dh: 'p', auth: 'a' },
            { id: 's-2', user_id: 'u-1', endpoint: 'https://fcm.example/2', p256dh: 'p', auth: 'a' },
        ];
        const { supabase, insertedLogs } = makeFakeSupabase({
            notification_preferences: [{
                user_id: 'u-1',
                push_mentions: true,
                push_overdue: true,
                push_assignment: true,
                quiet_hours_start: null,
                quiet_hours_end: null,
                timezone: 'UTC',
            }],
            push_subscriptions: subs,
        });
        const send = vi.fn<SendFn>().mockResolvedValue({ statusCode: 200, headers: {} });

        const result = await dispatchToUsers(supabase, body, baseNow, send);

        expect(send).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ sent: 2, skipped: 0, failed: 0 });
        expect(insertedLogs).toHaveLength(2);
    });
});
