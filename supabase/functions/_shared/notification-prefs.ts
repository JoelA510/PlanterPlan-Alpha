// Pure helpers shared by the Wave 30 dispatch edge functions. Kept here (not
// in-line with a specific function's index.ts) so both `dispatch-push` and the
// Task 3 `dispatch-notifications` / `overdue-digest` can import without the
// Deno-only Supabase + esm.sh transitive deps. Node-friendly = vitest-testable.

export type NotificationEventType = 'mentions' | 'overdue' | 'assignment'

export interface NotificationPrefsLite {
    user_id: string
    push_mentions: boolean
    push_overdue: boolean
    push_assignment: boolean
    quiet_hours_start: string | null
    quiet_hours_end: string | null
    timezone: string
}

// `Intl.DateTimeFormat` is expensive to instantiate. Memoize one formatter per
// timezone so a batch dispatch to 1000 users sharing UTC pays the cost once,
// not 1000×. The map persists across calls within a single Deno function
// invocation; Gemini's PR review flagged the per-call construction.
const formatterByTz = new Map<string, Intl.DateTimeFormat>()
function formatterFor(timezone: string): Intl.DateTimeFormat {
    let fmt = formatterByTz.get(timezone)
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
        })
        formatterByTz.set(timezone, fmt)
    }
    return fmt
}

/**
 * Returns `true` when `now` — when rendered in the user's tz — falls inside the
 * closed [start, end] window on the 24-hour clock. Handles wrap-across-midnight
 * windows (e.g., 22:00–07:00).
 *
 * Uses `Intl.DateTimeFormat` for tz-aware formatting, not raw date math — so
 * this helper stays styleguide-compliant and runs identically in Node and Deno.
 */
export function inQuietHours(
    now: Date,
    timezone: string,
    start: string | null,
    end: string | null,
): boolean {
    if (!start || !end) return false
    const parts = formatterFor(timezone).formatToParts(now)
    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
    const nowMin = hh * 60 + mm

    const startMin = toMinutes(start)
    const endMin = toMinutes(end)

    if (startMin <= endMin) {
        return nowMin >= startMin && nowMin <= endMin
    }
    // Wraps across midnight.
    return nowMin >= startMin || nowMin <= endMin
}

function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

/** Maps an event type to the matching `push_*` column on notification_preferences. */
export function pushPrefColumnFor(event: NotificationEventType): keyof Pick<NotificationPrefsLite, 'push_mentions' | 'push_overdue' | 'push_assignment'> {
    switch (event) {
        case 'mentions': return 'push_mentions'
        case 'overdue': return 'push_overdue'
        case 'assignment': return 'push_assignment'
    }
}
