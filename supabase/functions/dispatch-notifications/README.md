# dispatch-notifications (Wave 30 Task 3)

Cron-driven dispatcher that fans out `mention_pending` rows in
`notification_log` to email + push per each recipient's
`notification_preferences`. Mention rows are enqueued by the
`trg_enqueue_comment_mentions` trigger on `public.task_comments` (see
`docs/db/migrations/2026_04_18_comment_mention_dispatch.sql`).

## State machine

Each row in `notification_log` moves through this lifecycle:

```
mention_pending ──► mention_processing ──► mention_sent
                                        │
                                        ├─► mention_skipped  (pref_disabled | quiet_hours | prefs_missing)
                                        │
                                        └─► mention_failed   (all transports failed)
```

The `pending → processing` claim is done via:

```sql
UPDATE public.notification_log
SET event_type = 'mention_processing', sent_at = now()
WHERE id = $1 AND event_type = 'mention_pending'
RETURNING *
```

Because the `event_type` match is in the WHERE clause, only the first
concurrent runner wins. Any other runner on the same row gets `rowCount = 0`
and moves on. This is the idempotency guarantee on concurrent cron ticks
without any distributed lock.

## Contract

```
POST (no body required) → { success: true, claimed, sent_email, sent_push, skipped, failed }
```

## Transport decisions per recipient

For each claimed row, the dispatcher:

1. Loads the recipient's `notification_preferences` row.
2. Checks `inQuietHours(now, timezone, quiet_hours_start, quiet_hours_end)`
   → skip with `error = 'quiet_hours'` if inside the window.
3. If `email_mentions = false` AND `push_mentions = false` → skip with
   `error = 'pref_disabled'`.
4. If `email_mentions = true`: call `_shared/email.ts:sendEmail(...)` with
   the recipient's address (resolved via the `users_public` view or
   equivalent — see notes below).
5. If `push_mentions = true`: POST to the sibling `dispatch-push` function
   with `{ user_ids: [recipient], title, body, url, tag, event_type: 'mentions' }`.
   `dispatch-push` handles VAPID send + 410-cleanup + per-sub logging.
6. Terminal state: `mention_sent` if at least one transport succeeded,
   `mention_failed` if every enabled transport failed. Per-transport
   failure reasons are concatenated into `notification_log.error` (for
   debugging) even on a successful terminal state.

## Required environment

| Variable | Scope | Description |
| --- | --- | --- |
| `SUPABASE_URL` | function | Project URL. Used for self-invoking `dispatch-push`. |
| `SUPABASE_SERVICE_ROLE_KEY` | function (secret) | Bypasses RLS for cross-user reads + log state transitions. Also bearer for invoking `dispatch-push`. |
| `EMAIL_PROVIDER_API_KEY` | function (secret) | Resend API key. Missing → email send degrades to `ok: false`, dispatcher still tries push. |
| `RESEND_FROM_ADDRESS` | function | Verified Resend sender. Missing → same as above. |

The push transport's VAPID env is read by the sibling `dispatch-push`
function — this dispatcher doesn't need VAPID directly.

## Recipient email lookup

Mention dispatch needs the recipient's email address. This function
queries a lightweight `users_public` view (SELECT `id, email`) to resolve
`user_id → email`. If that view doesn't exist in your environment, the
dispatcher falls back to push-only (`email` branch logs
`no_email_address`). Add the view via a one-liner if needed:

```sql
CREATE OR REPLACE VIEW public.users_public AS
SELECT id, email FROM auth.users;
GRANT SELECT ON public.users_public TO service_role;
```

The service-role bearer is the only caller — no RLS is needed. Clients
never reach this view.

## Scheduling

Recommended: **every minute** via Supabase Dashboard → Edge Functions →
Scheduled Triggers. See `docs/operations/edge-function-schedules.md` for
the full table of recommendations.

**`pg_cron` is intentionally NOT enabled in this codebase.** If your
operator wants a different cadence (every 5 minutes is a reasonable
low-volume alternative), adjust the schedule — the state machine is
idempotent so no duplicates can arise from overlapping ticks.

## Local smoke

```bash
supabase functions serve dispatch-notifications --env-file ./supabase/.env.local

curl -X POST http://127.0.0.1:54321/functions/v1/dispatch-notifications \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expect `{ success: true, claimed: N, ... }` where `N` is the count of
`mention_pending` rows picked up.

To drive an end-to-end trace:

```sql
-- seed a pending mention row manually
INSERT INTO public.notification_log (user_id, channel, event_type, payload)
VALUES ('<target-user-uuid>', 'email', 'mention_pending',
  '{ "comment_id": "<id>", "task_id": "<id>", "author_id": "<id>",
     "body_preview": "Hello world" }'::jsonb);
-- invoke the function (above)
-- verify
SELECT id, event_type, error, provider_id FROM public.notification_log
WHERE user_id = '<target-user-uuid>' ORDER BY sent_at DESC LIMIT 5;
```
