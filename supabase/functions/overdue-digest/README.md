# overdue-digest (Wave 30 Task 3)

Cron-scheduled edge function that emails each user a rollup of their
assigned, not-complete, overdue tasks. Cadence is per-user:
`notification_preferences.email_overdue_digest` ∈ `'off' | 'daily' | 'weekly'`.

## Cadence

| Cadence | Runs when |
| --- | --- |
| `off` | Never — user is filtered out. |
| `daily` | Every run includes the user. |
| `weekly` | Included only when `now`, formatted in the user's `timezone`, falls on a Monday. Tz-aware day-of-week via `Intl.DateTimeFormat({ weekday: 'short', timeZone })`. |

Users whose overdue-task set is empty on their eligible day get no email
(no "good news" digest — reduces notification fatigue).

## Contract

```
POST (no body required) → { success: true, eligible_users, users_with_overdue, sent, failed }
```

## Required environment

| Variable | Scope | Description |
| --- | --- | --- |
| `SUPABASE_URL` | function | Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | function (secret) | Bypasses RLS for cross-user prefs + tasks reads and `notification_log` INSERTs. |
| `EMAIL_PROVIDER_API_KEY` | function (secret) | Resend API key. Missing → `sendEmail` returns `{ ok: false }`, row logged as `error = 'Email provider not configured'`. |
| `RESEND_FROM_ADDRESS` | function | Verified Resend sender. |

Email recipient resolution uses the `users_public` view
(see `dispatch-notifications/README.md` for the one-line view definition).
Missing view → users with `'daily' | 'weekly'` prefs but no resolvable
email get `error = 'no_email_address'` logged.

## Scheduling

Recommended: **08:00 UTC daily** via Supabase Dashboard → Edge Functions →
Scheduled Triggers. See `docs/operations/edge-function-schedules.md` for
the full table of recommendations.

**`pg_cron` is intentionally NOT enabled in this codebase.** Daily is the
right frequency even for weekly-cadence users because the function's
Monday-in-user-tz check ensures weekly emails fire exactly once per week
per user.

## Logging

Every attempt writes one row to `public.notification_log`:

* `channel = 'email'`, `event_type = 'overdue_digest_sent'`.
* `payload = { cadence, task_count }`.
* Success → `error = null`, `provider_id = <resend message id>`.
* Failure → `error = <reason>` (e.g., `'no_email_address'`, `'Email dispatch failed'`).

## Local smoke

```bash
supabase functions serve overdue-digest --env-file ./supabase/.env.local

# Seed at least one overdue task assigned to a user whose
# notification_preferences.email_overdue_digest is 'daily'.
curl -X POST http://127.0.0.1:54321/functions/v1/overdue-digest \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Verify
SELECT id, user_id, event_type, error, provider_id, payload
FROM public.notification_log
WHERE event_type = 'overdue_digest_sent'
ORDER BY sent_at DESC LIMIT 5;
```
