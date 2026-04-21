import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    dispatchOverdueDigest,
    isMondayInTimezone,
    type DigestEmailRenderer,
    type DigestEmailSender,
    type DigestPrefsRow,
    type DigestTaskRow,
    type DigestUserRow,
    type SelectFilter,
    type SupabaseLike,
} from '../../../../supabase/functions/overdue-digest/dispatch';

interface FakeDb {
    notification_preferences: DigestPrefsRow[];
    users_public: DigestUserRow[];
    tasks: Array<DigestTaskRow & { assignee_id: string; is_complete: boolean }>;
    projects: Array<{ id: string; title: string | null }>;
    notification_log: Array<{
        user_id: string;
        channel: string;
        event_type: string;
        payload: Record<string, unknown>;
        provider_id?: string | null;
        error?: string | null;
    }>;
}

function chainSelect<T>(initial: T[]): SelectFilter<T> {
    const filters: Array<(r: T) => boolean> = [];

    const node: SelectFilter<T> = {
        eq(col: string, value: string | boolean) {
            filters.push((r) => (r as Record<string, unknown>)[col] === value);
            return node;
        },
        in(col: string, values: string[]) {
            const set = new Set(values);
            filters.push((r) => set.has((r as Record<string, unknown>)[col] as string));
            return node;
        },
        neq(col: string, value: string) {
            filters.push((r) => (r as Record<string, unknown>)[col] !== value);
            return node;
        },
        lt(col: string, value: string) {
            filters.push((r) => String((r as Record<string, unknown>)[col] ?? '') < value);
            return node;
        },
        is(col: string, value: null | boolean) {
            filters.push((r) => (r as Record<string, unknown>)[col] === value);
            return node;
        },
        then<TResult1, TResult2 = never>(
            onfulfilled?: ((v: { data: T[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ): PromiseLike<TResult1 | TResult2> {
            const data = initial.filter((row) => filters.every((f) => f(row)));
            return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
        },
    };

    return node;
}

function makeSupabase(db: FakeDb): SupabaseLike {
    return {
        from: (table: string) => ({
            select: <T>(cols: string) => {
                void cols;
                if (table === 'notification_preferences') return chainSelect<T>(db.notification_preferences as unknown as T[]);
                if (table === 'users_public') return chainSelect<T>(db.users_public as unknown as T[]);
                if (table === 'tasks') {
                    // tasks table is queried twice — once for overdue tasks, once for project titles.
                    // We return the full merged set and let .eq/.in filters distinguish.
                    const combined: unknown[] = [
                        ...db.tasks,
                        ...db.projects.map((p) => ({ id: p.id, title: p.title, due_date: null, root_id: null })),
                    ];
                    return chainSelect<T>(combined as T[]);
                }
                return chainSelect<T>([]);
            },
            insert: async (row: Record<string, unknown>) => {
                db.notification_log.push(row as FakeDb['notification_log'][number]);
                return { error: null };
            },
        }),
    };
}

const defaultRender: DigestEmailRenderer = (payload) => ({
    subject: `Digest subject (${payload.tasks.length})`,
    html: `<p>${payload.tasks.length} tasks</p>`,
    text: `${payload.tasks.length} tasks`,
});

describe('isMondayInTimezone', () => {
    it('returns true for a UTC Monday rendered in UTC', () => {
        // 2026-04-20 is a Monday.
        expect(isMondayInTimezone(new Date('2026-04-20T12:00:00Z'), 'UTC')).toBe(true);
    });

    it('returns false for a UTC Tuesday rendered in UTC', () => {
        expect(isMondayInTimezone(new Date('2026-04-21T12:00:00Z'), 'UTC')).toBe(false);
    });

    it('returns true when the user-local day is Monday even if UTC is Tuesday', () => {
        // 2026-04-21 00:30 UTC is Monday 17:30 Pacific.
        expect(isMondayInTimezone(new Date('2026-04-21T00:30:00Z'), 'America/Los_Angeles')).toBe(true);
    });

    it('returns false when the user-local day is Sunday even if UTC is Monday', () => {
        // 2026-04-20 05:00 UTC is Sunday 22:00 Pacific.
        expect(isMondayInTimezone(new Date('2026-04-20T05:00:00Z'), 'America/Los_Angeles')).toBe(false);
    });
});

describe('dispatchOverdueDigest (Wave 30 Task 3)', () => {
    let emailSender: ReturnType<typeof vi.fn<DigestEmailSender>>;

    beforeEach(() => {
        emailSender = vi.fn<DigestEmailSender>().mockResolvedValue({ ok: true, id: 'digest-msg-1' });
    });

    it('returns zero summary when no users have a digest cadence', async () => {
        const db: FakeDb = {
            notification_preferences: [
                { user_id: 'u-off', email_overdue_digest: 'off', timezone: 'UTC' },
            ],
            users_public: [],
            tasks: [],
            projects: [],
            notification_log: [],
        };

        const summary = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-20T12:00:00Z'), defaultRender, emailSender);

        expect(summary.eligible_users).toBe(0);
        expect(emailSender).not.toHaveBeenCalled();
    });

    it('includes daily-cadence users every run', async () => {
        const db: FakeDb = {
            notification_preferences: [{ user_id: 'u-daily', email_overdue_digest: 'daily', timezone: 'UTC' }],
            users_public: [{ id: 'u-daily', email: 'daily@example.com' }],
            tasks: [{ id: 't-1', title: 'Overdue A', due_date: '2026-04-10', root_id: 'p-1', assignee_id: 'u-daily', is_complete: false }],
            projects: [{ id: 'p-1', title: 'Project A' }],
            notification_log: [],
        };

        const summary = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-22T12:00:00Z'), defaultRender, emailSender);

        expect(summary.eligible_users).toBe(1);
        expect(summary.sent).toBe(1);
        expect(emailSender).toHaveBeenCalledOnce();
        expect(db.notification_log).toHaveLength(1);
        expect(db.notification_log[0].event_type).toBe('overdue_digest_sent');
        expect(db.notification_log[0].error).toBeNull();
    });

    it('includes weekly-cadence users only on Monday in their tz', async () => {
        // 2026-04-20 is Monday UTC.
        const db: FakeDb = {
            notification_preferences: [{ user_id: 'u-weekly', email_overdue_digest: 'weekly', timezone: 'UTC' }],
            users_public: [{ id: 'u-weekly', email: 'weekly@example.com' }],
            tasks: [{ id: 't-2', title: 'Overdue B', due_date: '2026-04-10', root_id: null, assignee_id: 'u-weekly', is_complete: false }],
            projects: [],
            notification_log: [],
        };

        const monday = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-20T12:00:00Z'), defaultRender, emailSender);
        expect(monday.sent).toBe(1);

        // Reset logs and tasks for the Tuesday run.
        db.notification_log = [];
        emailSender.mockClear();
        const tuesday = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-21T12:00:00Z'), defaultRender, emailSender);

        expect(tuesday.eligible_users).toBe(0);
        expect(tuesday.sent).toBe(0);
        expect(emailSender).not.toHaveBeenCalled();
    });

    it('skips users with zero overdue tasks silently (no log row, no email)', async () => {
        const db: FakeDb = {
            notification_preferences: [{ user_id: 'u-no-overdue', email_overdue_digest: 'daily', timezone: 'UTC' }],
            users_public: [{ id: 'u-no-overdue', email: 'no@example.com' }],
            tasks: [],
            projects: [],
            notification_log: [],
        };

        const summary = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-20T12:00:00Z'), defaultRender, emailSender);

        expect(summary.eligible_users).toBe(1);
        expect(summary.users_with_overdue).toBe(0);
        expect(summary.sent).toBe(0);
        expect(emailSender).not.toHaveBeenCalled();
        expect(db.notification_log).toHaveLength(0);
    });

    it('logs error when the recipient has no email address', async () => {
        const db: FakeDb = {
            notification_preferences: [{ user_id: 'u-no-email', email_overdue_digest: 'daily', timezone: 'UTC' }],
            users_public: [{ id: 'u-no-email', email: null }],
            tasks: [{ id: 't-3', title: 'X', due_date: '2026-04-01', root_id: null, assignee_id: 'u-no-email', is_complete: false }],
            projects: [],
            notification_log: [],
        };

        const summary = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-20T12:00:00Z'), defaultRender, emailSender);

        expect(summary.sent).toBe(0);
        expect(emailSender).not.toHaveBeenCalled();
        expect(db.notification_log).toHaveLength(1);
        expect(db.notification_log[0].error).toBe('no_email_address');
    });

    it('logs failure when sendEmail returns ok:false', async () => {
        emailSender.mockResolvedValueOnce({ ok: false, error: 'send_failed' });
        const db: FakeDb = {
            notification_preferences: [{ user_id: 'u-1', email_overdue_digest: 'daily', timezone: 'UTC' }],
            users_public: [{ id: 'u-1', email: 'u1@example.com' }],
            tasks: [{ id: 't-4', title: 'Late', due_date: '2026-04-10', root_id: null, assignee_id: 'u-1', is_complete: false }],
            projects: [],
            notification_log: [],
        };

        const summary = await dispatchOverdueDigest(makeSupabase(db), new Date('2026-04-20T12:00:00Z'), defaultRender, emailSender);

        expect(summary.failed).toBe(1);
        expect(db.notification_log).toHaveLength(1);
        expect(db.notification_log[0].error).toBe('send_failed');
    });
});
