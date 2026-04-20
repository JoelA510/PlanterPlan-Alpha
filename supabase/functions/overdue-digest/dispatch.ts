// Pure overdue-digest loop, factored out of `index.ts` so vitest can drive
// the cadence + frequency matrix (daily / weekly-in-user-tz) without Deno.serve.
//
// Algorithm:
//   1. SELECT notification_preferences WHERE email_overdue_digest != 'off'.
//   2. For each user: if weekly, include only when the user's LOCAL day is
//      Monday (computed via Intl.DateTimeFormat with the user's timezone).
//   3. For each included user: fetch their assigned, not-complete, overdue
//      tasks. Skip if empty.
//   4. Render + send the email. Log the outcome to `notification_log`.

import type { OverdueDigestPayload, OverdueTaskSummary } from '../_shared/email.ts'

export interface DigestPrefsRow {
    user_id: string
    email_overdue_digest: 'off' | 'daily' | 'weekly'
    timezone: string
}

export interface DigestUserRow {
    id: string
    email: string | null
}

export interface DigestTaskRow {
    id: string
    title: string | null
    due_date: string | null
    root_id: string | null
}

/**
 * A minimal PostgrestFilterBuilder stand-in. The real supabase-js chain
 * implements PromiseLike at every node so `await` resolves the query; our
 * tests build a fake chain with the same shape.
 */
export interface SelectFilter<T> extends PromiseLike<{ data: T[] | null; error: { message: string } | null }> {
    neq(col: string, value: string): SelectFilter<T>
    in(col: string, values: string[]): SelectFilter<T>
    eq(col: string, value: string | boolean): SelectFilter<T>
    lt(col: string, value: string): SelectFilter<T>
    is(col: string, value: null | boolean): SelectFilter<T>
}

export interface SupabaseLike {
    from: (table: string) => {
        select: <T = unknown>(cols: string) => SelectFilter<T>
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
}

export interface DigestEmailRenderer {
    (payload: OverdueDigestPayload): { subject: string; html: string; text: string }
}

export type DigestEmailSender = (to: string, subject: string, html: string, text: string) => Promise<{ ok: boolean; id?: string; error?: string }>

export interface DigestSummary {
    eligible_users: number
    users_with_overdue: number
    sent: number
    failed: number
}

/**
 * Returns `true` iff `now` — when rendered in `timezone` — falls on a Monday.
 * Uses `Intl.DateTimeFormat({ weekday: 'short' })` so the day-of-week is
 * computed in the user's local calendar, not UTC.
 */
export function isMondayInTimezone(now: Date, timezone: string): boolean {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
    }).format(now)
    return weekday === 'Mon'
}

/**
 * Entry point. Returns a summary of the pass. Individual user errors are
 * caught and logged to `notification_log`; a single failure doesn't poison
 * the batch.
 */
export async function dispatchOverdueDigest(
    supabase: SupabaseLike,
    now: Date,
    render: DigestEmailRenderer,
    sendEmail: DigestEmailSender,
): Promise<DigestSummary> {
    const summary: DigestSummary = {
        eligible_users: 0,
        users_with_overdue: 0,
        sent: 0,
        failed: 0,
    }

    const prefsRes = await supabase
        .from('notification_preferences')
        .select<DigestPrefsRow>('user_id, email_overdue_digest, timezone')
        .neq('email_overdue_digest', 'off')
    if (prefsRes.error) throw new Error(prefsRes.error.message)

    const prefs = (prefsRes.data ?? []) as DigestPrefsRow[]

    const eligible = prefs.filter((p) => {
        if (p.email_overdue_digest === 'daily') return true
        return isMondayInTimezone(now, p.timezone)
    })
    summary.eligible_users = eligible.length
    if (eligible.length === 0) return summary

    const userIds = eligible.map((p) => p.user_id)

    const usersRes = await supabase
        .from('users_public')
        .select<DigestUserRow>('id, email')
        .in('id', userIds)
    const usersById = new Map<string, DigestUserRow>()
    if (!usersRes.error) {
        for (const u of (usersRes.data ?? []) as DigestUserRow[]) usersById.set(u.id, u)
    }

    const todayIso = now.toISOString().slice(0, 10)

    for (const pref of eligible) {
        const user = usersById.get(pref.user_id)
        if (!user?.email) {
            await insertDigestLog(supabase, pref.user_id, { error: 'no_email_address' })
            continue
        }

        const tasksRes = await supabase
            .from('tasks')
            .select<DigestTaskRow>('id, title, due_date, root_id')
            .eq('assignee_id', pref.user_id)
            .eq('is_complete', false)
            .lt('due_date', todayIso)
        if (tasksRes.error) {
            await insertDigestLog(supabase, pref.user_id, { error: tasksRes.error.message })
            summary.failed += 1
            continue
        }

        const rawTasks = (tasksRes.data ?? []) as DigestTaskRow[]
        if (rawTasks.length === 0) continue
        summary.users_with_overdue += 1

        const rootIds = Array.from(new Set(rawTasks.map((t) => t.root_id).filter((id): id is string => !!id)))
        const projectTitles = await loadProjectTitles(supabase, rootIds)

        const tasks: OverdueTaskSummary[] = rawTasks.map((t) => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            project_title: (t.root_id && projectTitles.get(t.root_id)) || null,
        }))

        const payload: OverdueDigestPayload = {
            recipient_email: user.email,
            cadence: pref.email_overdue_digest === 'weekly' ? 'weekly' : 'daily',
            tasks,
        }
        const rendered = render(payload)
        const result = await sendEmail(user.email, rendered.subject, rendered.html, rendered.text)

        if (result.ok) {
            await insertDigestLog(supabase, pref.user_id, {
                provider_id: result.id ?? null,
                cadence: pref.email_overdue_digest,
                task_count: tasks.length,
            })
            summary.sent += 1
        } else {
            await insertDigestLog(supabase, pref.user_id, { error: result.error ?? 'send_failed' })
            summary.failed += 1
        }
    }

    return summary
}

async function loadProjectTitles(supabase: SupabaseLike, rootIds: string[]): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>()
    if (rootIds.length === 0) return map
    const res = await supabase
        .from('tasks')
        .select<{ id: string; title: string | null }>('id, title')
        .in('id', rootIds)
    if (res.error) return map
    for (const row of (res.data ?? []) as Array<{ id: string; title: string | null }>) {
        map.set(row.id, row.title)
    }
    return map
}

async function insertDigestLog(
    supabase: SupabaseLike,
    userId: string,
    extra: { provider_id?: string | null; error?: string; cadence?: string; task_count?: number },
): Promise<void> {
    await supabase.from('notification_log').insert({
        user_id: userId,
        channel: 'email',
        event_type: 'overdue_digest_sent',
        payload: {
            cadence: extra.cadence ?? null,
            task_count: extra.task_count ?? null,
        },
        provider_id: extra.provider_id ?? null,
        error: extra.error ?? null,
    })
}
