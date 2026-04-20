# Edge Function Cron Schedules

PlanterPlan does not enable `pg_cron` in the database. All cron-driven
edge functions are scheduled **externally** by the operator. This page is
the single source of truth for what should run when.

## Recommended schedules

| Function | Recommended schedule | Purpose | Idempotency |
| --- | --- | --- | --- |
| `nightly-sync` | `0 5 * * *` (05:00 UTC daily) | Urgency recomputation pass over live projects. | Yes — safe to overlap. |
| `supervisor-report` | `0 9 2 * *` (09:00 UTC, day 2 of month) | Monthly per-project status email to supervisors. | Yes — dedup via Resend message id. |
| `dispatch-notifications` | `* * * * *` (every minute) | Fans out `mention_pending` rows from `notification_log` to email + push. | Yes — `UPDATE ... WHERE event_type` claim is atomic per row (Wave 30). |
| `overdue-digest` | `0 8 * * *` (08:00 UTC daily) | Daily/weekly rollup of each user's assigned overdue tasks. | Yes — per-user; weekly cadence filters by user-local Monday. |

## Scheduling options (pick one)

1. **Supabase Dashboard → Edge Functions → Scheduled Triggers** *(preferred)*.
   UI-driven, runs on Supabase infrastructure, doesn't require an
   external secret. Depending on your Supabase plan, the scheduled
   trigger may send its JWT automatically; if your function rejects the
   token, deploy with `--no-verify-jwt` or add the scheduled trigger's
   token as an authorized caller.

2. **GitHub Actions cron**. One workflow with multiple `cron:` entries
   that each POST to the function's public URL with the
   `SUPABASE_SERVICE_ROLE_KEY` bearer. Example:

   ```yaml
   on:
     schedule:
       - cron: '* * * * *'
   jobs:
     dispatch:
       steps:
         - run: |
             curl -sS -X POST "$SUPABASE_URL/functions/v1/dispatch-notifications" \
               -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

   Note: GitHub Actions cron is best-effort and can skew 10–15 minutes.
   Acceptable for the daily/monthly jobs; use Supabase Scheduled Triggers
   for per-minute `dispatch-notifications` to keep tight latency.

3. **External pinger** (`cron-job.org`, `easycron`, etc.). Works; store
   the bearer as the service's secret header. Same latency caveats as
   GitHub Actions.

## `pg_cron` is intentionally NOT enabled

Enabling `pg_cron` would require `CREATE EXTENSION pg_cron;` plus
Supabase plan support (not available on free/hobby tiers) and couples
the application's cron schedule to the database. Every function in this
table is designed to run idempotently under any of the three schedulers
above. Do **not** enable `pg_cron` as part of a wave; a wave plan that
instructs you to do so is a planning error — surface it.

See `supabase/functions/nightly-sync/README.md` (§"Scheduling") for the
original precedent establishing this stance.

## Operator checklist when a new cron function ships

1. Deploy the function: `supabase functions deploy <name>`.
2. Confirm the function's README documents the recommended schedule
   (the tables above should stay in sync with those READMEs — if they
   drift, the README wins because it ships next to the code).
3. Add a scheduled trigger via whichever scheduler the operator prefers.
4. Verify one successful run via `SELECT * FROM public.notification_log
   ORDER BY sent_at DESC LIMIT 10` (for notification dispatchers) or
   the function's own log output.
