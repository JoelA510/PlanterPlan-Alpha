# supervisor-report

Supabase Edge Function that assembles monthly Project Status Report payloads
for every project with a `supervisor_email` set on its root task, and
(eventually) dispatches them to the configured supervisor.

**Wave 21 status: log-only.** Email dispatch is gated behind
`EMAIL_PROVIDER_API_KEY`. When the key is unset (the only supported state in
Wave 21), the function builds the payload for each project and writes it to
function logs. Provider integration is tracked in `spec.md` §6 Backlog and
will land in a follow-up wave. See the `TODO(wave-22)` marker in `index.ts`.

## What it does

1. Selects every `tasks` row with `parent_task_id IS NULL` and
   `supervisor_email IS NOT NULL` (project roots with a supervisor).
2. Loads the full task tree for each root and derives the month's milestone
   lists — completed this month, overdue, and upcoming this month — using
   the same rules as the in-app report
   (`src/features/projects/hooks/useProjectReports.ts`). Keep the two in sync
   when the filter rules change.
3. Per project: if `EMAIL_PROVIDER_API_KEY` is set, invokes the dispatch path
   (no-op this wave); otherwise logs the payload JSON. The response summarises
   how many projects were considered, how many payloads were built, and how
   many were logged vs. dispatched.

## Response

```json
{
  "success": true,
  "projects_considered": 4,
  "payloads_built": 4,
  "payloads_logged": 4,
  "payloads_dispatched": 0
}
```

## Env contract

| Var | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL (set by the platform). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role for RLS-bypassing reads (set by the platform). |
| `EMAIL_PROVIDER_API_KEY` | no (Wave 21) | When set, the function will route payloads through a real dispatcher. Wiring deferred to Wave 22. |

## Timezone

Month/day boundaries are computed in UTC (matching
`useProjectReports`). A project in a late-UTC timezone may see a report cut
off one calendar day early relative to its local time — this is acceptable
for a monthly summary.

## Local smoke test

```bash
# 1. Serve the function locally
npx supabase functions serve supervisor-report

# 2. Invoke it
curl -i -X POST http://127.0.0.1:54321/functions/v1/supervisor-report \
  -H "Authorization: Bearer $(npx supabase status -o json | jq -r .services.SERVICE_ROLE_KEY)"

# 3. Inspect the payload(s)
#    Function logs will include lines like:
#    [supervisor-report] log-only payload {"project_id":"...", ...}
```

## Scheduling (operator)

This repository intentionally does **not** enable `pg_cron` or auto-register
a schedule. Follow the same pattern as `nightly-sync/README.md`. Target
cadence: monthly, on the 2nd of the month (one day after nightly-sync has
finalised end-of-month status transitions).

```sql
select cron.schedule(
  'supervisor-report-monthly',
  '0 6 2 * *',  -- 06:00 UTC on the 2nd of each month
  $$
    select net.http_post(
      url := 'https://<project-ref>.functions.supabase.co/supervisor-report',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <service-role-jwt>',
        'Content-Type',  'application/json'
      )
    ) as request_id;
  $$
);
```
