# supervisor-report

Supabase Edge Function that assembles monthly Project Status Report payloads
for every project with a `supervisor_email` set on its root task, and
(eventually) dispatches them to the configured supervisor.

**Wave 22 status: live via Resend.** When both `EMAIL_PROVIDER_API_KEY`
(Resend API key) and `RESEND_FROM_ADDRESS` are set, the function POSTs a
monthly report email per project via `https://api.resend.com/emails`. When
either env var is missing, the function degrades to log-only — it writes
each payload as a JSON line to function logs. Callers can also force the
log-only path by passing `{ "dry_run": true }` in the JSON body.

## What it does

1. Selects every `tasks` row with `parent_task_id IS NULL` and
   `supervisor_email IS NOT NULL` (project roots with a supervisor).
2. Loads the full task tree for each root and derives the month's milestone
   lists — completed this month, overdue, and upcoming this month — using
   the same rules as the in-app report
   (`src/features/projects/hooks/useProjectReports.ts`). Keep the two in sync
   when the filter rules change.
3. Per project: if both `EMAIL_PROVIDER_API_KEY` and `RESEND_FROM_ADDRESS`
   are set (and `dry_run !== true`), the payload is rendered to subject/html/
   text and POSTed to Resend. Otherwise the payload JSON is logged. The
   response summarises how many projects were considered, how many payloads
   were built, and the dispatch/log/failure breakdown.

## Request body

Invocations may POST a JSON body to scope the run:

```json
{
  "project_id": "<uuid of a root task>",
  "dry_run": false
}
```

Both fields are optional. `project_id` restricts the run to a single project
(used by the "Send test report" button in Edit Project). `dry_run: true`
forces the log-only path even when the Resend env vars are set.

## Response

```json
{
  "success": true,
  "projects_considered": 4,
  "payloads_built": 4,
  "payloads_logged": 0,
  "payloads_dispatched": 4,
  "dispatch_failures": 0
}
```

`dispatch_failures` counts projects where the Resend POST returned a non-2xx
or threw — operators can alert on it for partial delivery.

## Env contract

| Var | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL (set by the platform). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role for RLS-bypassing reads (set by the platform). |
| `EMAIL_PROVIDER_API_KEY` | no | Resend API key. When unset, the function stays log-only. |
| `RESEND_FROM_ADDRESS` | no | Verified `from` address for Resend. Required alongside the API key. |

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
