// Pure dispatch loop, factored out of `index.ts` so vitest can import + test it
// without spinning up Deno.serve or esm.sh. The Deno entry point injects the
// real Supabase client and a web-push-backed `sender`; tests inject mocks.

import {
    inQuietHours,
    pushPrefColumnFor,
    type NotificationEventType,
    type NotificationPrefsLite,
} from '../_shared/notification-prefs.ts'

export interface DispatchBody {
    user_ids: string[]
    title: string
    body: string
    url?: string
    tag?: string
    event_type: NotificationEventType
}

export interface PushSubRow {
    id: string
    user_id: string
    endpoint: string
    p256dh: string
    auth: string
}

export interface SupabaseLike {
    from: (table: string) => {
        select: (cols: string) => {
            in: (col: string, values: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
        delete: () => {
            eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
        }
    }
}

export interface SendResult {
    statusCode: number
    headers?: Record<string, string>
}

export type SendFn = (sub: PushSubRow, payload: string) => Promise<SendResult>

export interface DispatchResult {
    sent: number
    skipped: number
    failed: number
}

async function logDispatch(
    supabase: SupabaseLike,
    row: {
        user_id: string
        event_type: string
        payload: Record<string, unknown>
        error?: string | null
        provider_id?: string | null
    },
): Promise<void> {
    await supabase.from('notification_log').insert({
        user_id: row.user_id,
        channel: 'push',
        event_type: row.event_type,
        payload: row.payload,
        error: row.error ?? null,
        provider_id: row.provider_id ?? null,
    })
}

/**
 * Core dispatch loop. For each user: check prefs → check quiet hours → fetch
 * subscriptions → call `send` for each. Records every outcome in notification_log.
 * On 410/404 from the sender: DELETEs the stale subscription row.
 */
export async function dispatchToUsers(
    supabase: SupabaseLike,
    body: DispatchBody,
    now: Date,
    send: SendFn,
): Promise<DispatchResult> {
    const prefColumn = pushPrefColumnFor(body.event_type)

    const prefsRes = await supabase
        .from('notification_preferences')
        .select('user_id, push_mentions, push_overdue, push_assignment, quiet_hours_start, quiet_hours_end, timezone')
        .in('user_id', body.user_ids)
    if (prefsRes.error) throw new Error(prefsRes.error.message)
    const prefsByUser = new Map<string, NotificationPrefsLite>()
    for (const p of (prefsRes.data ?? []) as NotificationPrefsLite[]) prefsByUser.set(p.user_id, p)

    const subsRes = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', body.user_ids)
    if (subsRes.error) throw new Error(subsRes.error.message)
    const subsByUser = new Map<string, PushSubRow[]>()
    for (const s of (subsRes.data ?? []) as PushSubRow[]) {
        const bucket = subsByUser.get(s.user_id) ?? []
        bucket.push(s)
        subsByUser.set(s.user_id, bucket)
    }

    // Payload is identical across every subscription for a single dispatch call,
    // so build it ONCE up front. Previously it was stringified inside the
    // per-subscription loop (Gemini PR review).
    const payload = JSON.stringify({
        title: body.title,
        body: body.body,
        url: body.url ?? '/',
        tag: body.tag,
    })

    // Process users in parallel; within each user, process subscriptions in
    // parallel. `Promise.allSettled` guarantees a single failure can't poison
    // the batch. Sequential awaits would be fine for 1–10 users but risked
    // edge-function timeouts for large fan-outs (Gemini PR review).
    const perUser = await Promise.allSettled(
        body.user_ids.map(async (uid): Promise<DispatchResult> => {
            const prefs = prefsByUser.get(uid)
            if (!prefs) {
                await logDispatch(supabase, { user_id: uid, event_type: body.event_type, payload: { title: body.title }, error: 'prefs_missing' })
                return { sent: 0, skipped: 1, failed: 0 }
            }
            if (prefs[prefColumn] !== true) {
                await logDispatch(supabase, { user_id: uid, event_type: body.event_type, payload: { title: body.title }, error: 'pref_disabled' })
                return { sent: 0, skipped: 1, failed: 0 }
            }
            if (inQuietHours(now, prefs.timezone, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
                await logDispatch(supabase, { user_id: uid, event_type: body.event_type, payload: { title: body.title }, error: 'quiet_hours' })
                return { sent: 0, skipped: 1, failed: 0 }
            }

            const subs = subsByUser.get(uid) ?? []
            if (subs.length === 0) {
                await logDispatch(supabase, { user_id: uid, event_type: body.event_type, payload: { title: body.title }, error: 'no_subscription' })
                return { sent: 0, skipped: 1, failed: 0 }
            }

            const subResults = await Promise.allSettled(subs.map(async (s) => {
                try {
                    const result = await send(s, payload)
                    const providerId = result.headers?.['x-message-id'] ?? null
                    await logDispatch(supabase, {
                        user_id: uid,
                        event_type: body.event_type,
                        payload: { title: body.title, endpoint_id: s.id },
                        provider_id: providerId,
                    })
                    return 'sent' as const
                } catch (err) {
                    const status = (err as { statusCode?: number }).statusCode
                    if (status === 410 || status === 404) {
                        await supabase.from('push_subscriptions').delete().eq('id', s.id)
                        await logDispatch(supabase, {
                            user_id: uid,
                            event_type: body.event_type,
                            payload: { title: body.title, endpoint_id: s.id },
                            error: '410_gone',
                        })
                    } else {
                        await logDispatch(supabase, {
                            user_id: uid,
                            event_type: body.event_type,
                            payload: { title: body.title, endpoint_id: s.id },
                            error: String(status ?? (err as Error).message),
                        })
                    }
                    return 'failed' as const
                }
            }))

            let uSent = 0
            let uFailed = 0
            for (const r of subResults) {
                // `fn` never throws; `.catch` inside returns 'failed'. If something DOES
                // throw unexpectedly, count it as a failure (defensive).
                if (r.status === 'fulfilled') {
                    if (r.value === 'sent') uSent += 1
                    else uFailed += 1
                } else {
                    uFailed += 1
                }
            }
            return { sent: uSent, skipped: 0, failed: uFailed }
        }),
    )

    let sent = 0
    let skipped = 0
    let failed = 0
    for (const r of perUser) {
        if (r.status === 'fulfilled') {
            sent += r.value.sent
            skipped += r.value.skipped
            failed += r.value.failed
        } else {
            // Entire per-user task threw (e.g., logDispatch I/O failure).
            failed += 1
        }
    }
    return { sent, skipped, failed }
}
