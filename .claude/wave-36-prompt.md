## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 35 shipped to `main`:
- Stripe Checkout + Customer Portal + signed Webhook
- Three subscription tiers (Free / Pro / Network) with project + member limits enforced via DB triggers + UI gates
- Discount codes mapped to Stripe promotions
- New `subscriptions`, `subscription_events`, `discount_codes` tables; Settings → Billing tab; admin discount-codes page
- Closed `auth-rbac.md` Licensing Enforcement gap

Spec is at **1.20.0**. Outstanding roadmap: §3.7 External Integrations (this wave — last §3.7 item), Wave 37 architecture-doc gap closures, Wave 38 release readiness.

Wave 36 ships **External Integrations** (§3.7 last bullet): Zoho CRM/Analytics sync, AWS S3 unmanaged file uploads, ICS calendar feeds, and a generic webhook subscriber. Each is a separate task; the wave is intentionally large but all four integrations follow the same patterns (per-user OAuth/token storage + per-event webhook fanout) so they share a lot of plumbing.

**Test baseline going into Wave 36:** Wave 35 shipped at ≥740 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress.

**Read `.claude/wave-testing-strategy.md` before starting.** Wave 36 specific: zero existing-test impact (all four integrations are new + isolated). For `webhook-dispatch.test.ts`, jsdom should provide `crypto.subtle` for HMAC; verify by `console.log(typeof crypto.subtle)` in a one-off test if anything fails. AWS SDK mocks live per-test via `vi.mock('@aws-sdk/s3-request-presigner', ...)` since these are Deno-only deps that don't bundle into frontend tests.

## Pre-flight verification (run before any task)

1. `git log --oneline` includes the 3 Wave 35 commits + docs sweep.
2. External prerequisites — log in PR descriptions:
   - **Task 1 (Zoho)**: Zoho developer app registered with `ZohoCRM.modules.ALL` + `ZohoAnalytics.data.READ` scopes; `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI` set in Supabase secrets.
   - **Task 2 (S3)**: AWS S3 bucket exists; CORS configured per `docs/operations/s3-cors-setup.md`; `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` set; `S3_MAX_UPLOAD_BYTES` defaults to `104857600` (100 MB) if unset.
   - **Task 3 (ICS)**: no external prerequisite.
   - **Task 4 (Webhooks)**: requires the Wave 27 `activity_log` to be populated. Verify by `psql -c "SELECT count(*) FROM public.activity_log"` returns >0.
3. Pinned dep versions for the edge functions (Deno ESM URLs):
   - AWS S3: `https://esm.sh/@aws-sdk/client-s3@3.700.0` + `https://esm.sh/@aws-sdk/s3-request-presigner@3.700.0`
   - Web Push (already in Wave 30): no addition.
   - Zoho HTTP: native Deno fetch — no SDK.
4. **Cron scheduling** — Wave 36's `zoho-sync` and `webhook-dispatch` are cron-driven. `pg_cron` is intentionally NOT enabled (per `supabase/functions/nightly-sync/README.md` and Wave 30's documentation). Use Supabase Dashboard's Scheduled Triggers or external scheduler. Add entries to `docs/operations/edge-function-schedules.md` (Wave 30) for both new functions.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-36-zoho-sync`
- Task 2 → `claude/wave-36-s3-uploads`
- Task 3 → `claude/wave-36-ics-feeds`
- Task 4 → `claude/wave-36-webhooks`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 36 scope

Four tasks. Each is a self-contained integration that doesn't depend on the others. **Order does not matter** — the listed numbering is suggested only.

---

### Task 1 — Zoho CRM / Analytics sync

**Commit:** `feat(wave-36): zoho oauth + per-user token storage + project/contact sync`

1. **Migration** (`docs/db/migrations/2026_04_18_zoho_integration.sql`, NEW)
   - `CREATE TABLE public.zoho_connections (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, access_token text NOT NULL, refresh_token text NOT NULL, expires_at timestamptz NOT NULL, scope text, account_url text NOT NULL, connected_at timestamptz NOT NULL DEFAULT now(), last_synced_at timestamptz)`.
   - `CREATE TABLE public.zoho_sync_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, direction text NOT NULL CHECK (direction IN ('zoho_to_planter','planter_to_zoho')), entity_type text NOT NULL, planter_id uuid, zoho_id text, action text NOT NULL CHECK (action IN ('created','updated','skipped','failed')), error text, synced_at timestamptz NOT NULL DEFAULT now())`.
   - RLS: `zoho_connections` SELECT/UPDATE/DELETE `user_id = auth.uid()`. INSERT via the OAuth-callback edge function only. `zoho_sync_log` SELECT `user_id = auth.uid() OR is_admin(auth.uid())`. INSERT via sync function only.
   - Mirror into `docs/db/schema.sql`.

2. **Zoho OAuth flow** (`supabase/functions/zoho-oauth-init/`, `supabase/functions/zoho-oauth-callback/`, NEW)
   - **`zoho-oauth-init`**: GET. Builds the Zoho OAuth URL (`accounts.zoho.com/oauth/v2/auth`) with `scope=ZohoCRM.modules.ALL,ZohoAnalytics.data.READ` + `state=<user_id-signed-jwt>` + `redirect_uri=<callback>`. Returns a redirect.
   - **`zoho-oauth-callback`**: GET with `code` + `state`. Verifies the state JWT, exchanges code for `access_token` + `refresh_token`, stores in `zoho_connections`. Redirects back to `/settings/integrations?zoho=connected` with toast.

3. **Sync edge function** (`supabase/functions/zoho-sync/`, NEW: `index.ts` + `README.md`)
   - Cron schedule: hourly (avoid faster — Zoho API rate limits are aggressive).
   - For each `zoho_connections` row: refresh token if expiring soon → fetch CRM Deals + Contacts → mirror as Projects + People in PlanterPlan (use `planterClient` semantics; one Deal = one PlanterPlan project; one Contact = one `people` row).
   - **Conflict handling**: if a project already exists with the same `settings.zoho_deal_id`, update; otherwise create. Mirror the Wave 22 `settings.spawnedFromTemplate` provenance pattern.
   - Logs every operation to `zoho_sync_log`.
   - **Bidirectional?** Out of scope for v1 — read-only from Zoho. PlanterPlan → Zoho push is documented as a Wave 36.5 follow-up if user demand justifies.

4. **Settings → Integrations tab** (`src/pages/Settings.tsx`)
   - New "Integrations" tab. Shows: Zoho status (connected / disconnected), connect/disconnect buttons, last sync time, recent sync log entries.
   - Tabs are extensible — Tasks 3 + 4 add their own UI here.

5. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `integrations.getZohoConnection()`, `integrations.disconnectZoho()`.
   - `integrations.listZohoSyncLog(opts?)`.

6. **Architecture doc** (`docs/architecture/integrations.md`, NEW)
   - Sections: Zoho (this task), S3 Uploads (Task 2), ICS Feeds (Task 3), Webhooks (Task 4). Each section documents: data flow, auth model, storage location, failure handling.

7. **Tests**
   - `Testing/unit/shared/api/planterClient.integrations.zoho.test.ts` (NEW)
   - `Testing/unit/supabase/functions/zoho-oauth-callback.test.ts` (NEW) — state JWT verification, token storage.
   - `Testing/unit/supabase/functions/zoho-sync.test.ts` (NEW) — token-refresh path, deal-to-project mapping, dedupe via `settings.zoho_deal_id`.

**DB migration?** Yes — two tables.

**Out of scope:** Zoho Analytics deep integration (only the CRM Deals + Contacts mirror this wave). Bidirectional sync. Custom field mapping UI (the field map is hardcoded for v1; admins customize in code if needed).

---

### Task 2 — AWS S3 unmanaged file uploads

**Commit:** `feat(wave-36): s3 presigned-url upload pipeline for task resources`

1. **Migration** (`docs/db/migrations/2026_04_18_s3_uploads.sql`, NEW)
   - Extend `task_resources` table with two new columns: `external_storage_provider text CHECK (external_storage_provider IS NULL OR external_storage_provider IN ('s3'))`, `external_storage_url text`. Existing `storage_bucket` + `storage_path` are for Supabase Storage; the new columns are for S3.
   - Mirror into `docs/db/schema.sql`.

2. **Presigned-URL edge function** (`supabase/functions/s3-presign-upload/`, NEW: `index.ts` + `README.md`)
   - POST `/s3-presign-upload` with `{ task_id, filename, content_type, size }`. Authenticated.
   - Validates: `task_id` belongs to a project the user is a member of (RLS-equivalent check); `size <= 100 MB` (configurable via env `S3_MAX_UPLOAD_BYTES`).
   - Generates a presigned PUT URL via AWS SDK for S3 (Deno ESM). Bucket from env `S3_BUCKET`, region from `AWS_REGION`. Object key: `tenant/<organization_id>/task/<task_id>/<uuid>-<filename>`.
   - Returns `{ presigned_url, public_url, expires_at }`.

3. **Confirm-upload function** (`supabase/functions/s3-confirm-upload/`, NEW)
   - POST `/s3-confirm-upload` with `{ task_id, public_url, filename, content_type, size }`. Authenticated.
   - HEAD request to `public_url` to verify the upload landed.
   - Inserts a `task_resources` row with `external_storage_provider = 's3'`, `external_storage_url = public_url`, `resource_type = 'file'`.
   - Returns the inserted row.

4. **Upload UI** (`src/features/tasks/components/TaskResources.tsx`)
   - Add a "Large file upload (S3)" button next to the existing "Add resource" affordances. Disabled when the user's org has no `S3_BUCKET` configured (per-org bucket override is deferred — global bucket for v1; document this in the architecture doc).
   - Drag-and-drop area for files >5 MB (smaller files use the existing Supabase Storage path).
   - Two-step flow: presign → upload directly to S3 from the browser → confirm.

5. **CORS docs** (`docs/operations/s3-cors-setup.md`, NEW)
   - Step-by-step S3 bucket CORS configuration for browser PUTs from the PlanterPlan app domain (and any white-label domain registered in `organizations.primary_domain`).

6. **Architecture doc** (`docs/architecture/integrations.md` — fill in S3 section)

7. **Tests**
   - `Testing/unit/supabase/functions/s3-presign-upload.test.ts` (NEW) — auth check, size limit, key format.
   - `Testing/unit/supabase/functions/s3-confirm-upload.test.ts` (NEW)
   - `Testing/unit/features/tasks/components/TaskResources.s3.test.tsx` (NEW) — drag-drop UI, presign call, browser PUT mock, confirm call.

**DB migration?** Yes — two columns added to `task_resources`.

**Out of scope:** Per-org S3 bucket (deferred — global bucket for v1; org isolation via key prefix is fine). Multi-part upload for files >100 MB (deferred). Server-side virus scanning (deferred — recommended via S3 event hook + Lambda; Wave 36.5+).

---

### Task 3 — ICS calendar feeds

**Commit:** `feat(wave-36): per-user signed ICS feed of upcoming tasks`

1. **Migration** (`docs/db/migrations/2026_04_18_ics_tokens.sql`, NEW)
   - `CREATE TABLE public.ics_feed_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, token text NOT NULL UNIQUE, label text, project_filter uuid[], created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, last_accessed_at timestamptz)`.
   - Index on `(token)` for the public lookup.
   - RLS: SELECT/INSERT/UPDATE/DELETE `user_id = auth.uid()`.
   - Mirror into `docs/db/schema.sql`.

2. **ICS feed edge function** (`supabase/functions/ics-feed/`, NEW: `index.ts` + `README.md`)
   - GET `/ics-feed?token=:token`. **Public** (unauthenticated — token is the credential).
   - Looks up token; if missing or `revoked_at IS NOT NULL`, returns 404.
   - Updates `last_accessed_at`.
   - Queries `tasks` for the token's `user_id` filtered by `assignee_id = user_id`, `due_date IS NOT NULL`, `due_date >= now() - 30 days`. Optional `project_filter` narrows by `root_id IN (...)`.
   - Renders an iCalendar (`.ics`) document — one VEVENT per task, with VALARM 1 day before. Use `text/calendar` content-type.

3. **Settings UI** (`src/pages/Settings.tsx` — Integrations tab from Task 1)
   - "Calendar feeds" section.
   - "Generate new feed" button: prompts for label + project filter (multi-select of user's projects), generates a random 32-char token via `crypto.randomUUID()`-style helper, returns the iCal URL.
   - Lists existing feeds with copy-URL + revoke buttons.

4. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `integrations.listIcsFeedTokens()`, `integrations.createIcsFeedToken({ label, project_filter })`, `integrations.revokeIcsFeedToken(id)`.

5. **Architecture doc** (`docs/architecture/integrations.md` — fill in ICS section)

6. **Tests**
   - `Testing/unit/supabase/functions/ics-feed.test.ts` (NEW) — token lookup, 404 on revoked, ICS rendering correctness, project filter.
   - `Testing/unit/shared/api/planterClient.integrations.ics.test.ts` (NEW)

**DB migration?** Yes — one table.

**Out of scope:** Two-way calendar sync (Google Calendar / Outlook write-back) — that's a much larger integration, deferred. Per-task subscription / single-task .ics download (deferred — feed-only for v1).

---

### Task 4 — Generic webhook subscriber

**Commit:** `feat(wave-36): per-user webhook subscriptions for activity-log events`

1. **Migration** (`docs/db/migrations/2026_04_18_webhook_subscriptions.sql`, NEW)
   - `CREATE TABLE public.webhook_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, target_url text NOT NULL CHECK (target_url ~* '^https://'), secret text NOT NULL, event_types text[] NOT NULL DEFAULT ARRAY['task.created','task.status_changed','comment.posted'], project_filter uuid[], active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), last_delivered_at timestamptz, last_failure text)`.
   - `CREATE TABLE public.webhook_deliveries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE, event_type text NOT NULL, payload jsonb NOT NULL, response_status int, response_body text, attempts int NOT NULL DEFAULT 0, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`.
   - Index on `webhook_deliveries.subscription_id, created_at DESC`.
   - RLS: `webhook_subscriptions` SELECT/INSERT/UPDATE/DELETE `user_id = auth.uid()`. `webhook_deliveries` SELECT via the subscription's user.
   - Mirror into `docs/db/schema.sql`.

2. **Dispatch edge function** (`supabase/functions/webhook-dispatch/`, NEW: `index.ts` + `README.md`)
   - Cron schedule: every minute. Picks up new `activity_log` rows since the last tick (track `last_activity_log_id` in a small key-value `kv_metadata` table or in a `webhook_dispatch_state` row).
   - For each new activity: matches against active `webhook_subscriptions` (event_type intersects, project_filter matches), POSTs the payload with `X-PlanterPlan-Signature` HMAC header (signed with `secret`).
   - Records every attempt in `webhook_deliveries`. Retries up to 3 times with exponential backoff. After 3 failures, marks subscription `last_failure` and continues; after 10 consecutive failures, sets `active = false` and emails the owner.

3. **Settings UI** (`src/pages/Settings.tsx` — Integrations tab)
   - "Webhooks" section.
   - "Add webhook" form: target URL, event-type checkboxes, project filter, auto-generated secret with copy button.
   - Lists existing webhooks with status, recent-delivery counts, edit/disable/delete buttons.
   - Click a webhook → drawer with recent `webhook_deliveries` (status, attempt count, response body preview).

4. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `integrations.listWebhooks()`, `integrations.createWebhook(...)`, `integrations.updateWebhook(id, ...)`, `integrations.deleteWebhook(id)`, `integrations.listWebhookDeliveries(subscriptionId, opts?)`.

5. **Architecture doc** (`docs/architecture/integrations.md` — fill in Webhooks section)
   - Document the HMAC signing contract so consumers can verify on receipt.

6. **Tests**
   - `Testing/unit/supabase/functions/webhook-dispatch.test.ts` (NEW) — event filtering, retry+backoff, deactivation after 10 failures, HMAC signature.
   - `Testing/unit/shared/api/planterClient.integrations.webhooks.test.ts` (NEW)

**DB migration?** Yes — two tables + index.

**Out of scope:** Custom payload templating (deferred — fixed payload per event for v1). Per-event-type rate limits (deferred). Bulk replay UI for failed deliveries (deferred).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.7 External Integrations from `[ ]` to `[x]` with sub-bullets per integration. Bump version to **1.21.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Integrations (Wave 36)" golden-path bullet.
3. **`docs/architecture/integrations.md`** is in (filled across all four tasks).
4. **`docs/operations/s3-cors-setup.md`** is in (Task 2).
5. **`docs/dev-notes.md`** — add: "**Active:** Zoho sync is read-only (CRM → PlanterPlan). Bidirectional push deferred. S3 uploads use a global bucket (per-org bucket deferred). Webhooks are best-effort with 3-retry exponential backoff; bulk replay UI deferred."
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 36 (External Integrations)`, update `last_completed`, `spec_version`, add `wave_36_highlights:` block.
7. **`CLAUDE.md`** — add the new tables (`zoho_connections`, `zoho_sync_log`, `ics_feed_tokens`, `webhook_subscriptions`, `webhook_deliveries`) to Tables. New "Integrations" subsection with env var inventory (Zoho client id/secret, AWS keys/region/bucket, Resend already in env from Wave 22). Add the new edge functions to the Cron Jobs list.
8. **`.env.example`** — add `ZOHO_CLIENT_ID=`, `ZOHO_CLIENT_SECRET=`, `ZOHO_REDIRECT_URI=`, `AWS_ACCESS_KEY_ID=`, `AWS_SECRET_ACCESS_KEY=`, `AWS_REGION=`, `S3_BUCKET=`, `S3_MAX_UPLOAD_BYTES=`.

Land docs as `docs(wave-36): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Zoho end-to-end** — connect a Zoho account → trigger sync (manual + cron) → confirm CRM Deals appear as PlanterPlan projects with `settings.zoho_deal_id` stamped. Re-sync → no duplicates.
2. **S3 upload** — drag a 50 MB file onto a task → presign returns → browser PUT to S3 succeeds → confirm creates `task_resources` row → file appears in the resources list with the S3 URL.
3. **ICS feed** — generate a feed → copy URL → import into Google Calendar → tasks appear with correct due dates + reminders.
4. **Webhook delivery** — set up a webhook subscription pointing to a webhook.site URL → trigger a task creation → webhook fires within one cron tick → HMAC signature verifies on the receiving end.
5. **Failure handling** — register a webhook to an invalid URL → confirm 3 retries + `last_failure` stamped + after 10 failures the subscription auto-deactivates.
6. **No FSD drift** — every integration's UI lives in `features/settings/`; data layer in `planterClient.integrations.*`; no shared imports back from features.
7. **Type drift** — multiple new tables hand-edited; verify all are in sync.
8. **Test-impact reconciled** — zero existing-test impact (all four integrations are new + isolated); webhook HMAC test verifies signature; ICS test parses generated `.ics` for structural correctness; cron schedules added to `docs/operations/edge-function-schedules.md`; no `it.skip`. Test count ≥ baseline + new tests.
9. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 + §8.6 (cron schedules go to operations doc, NOT pg_cron — HALT if any plan reference says otherwise).

## Commit & Push to Main (mandatory — gates Wave 37)

After all four Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 4 task commits + 1 docs sweep commit on top of Wave 35.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 37** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4. Cron schedules go to `docs/operations/edge-function-schedules.md` (Wave 30) — `pg_cron` is NOT enabled (§8.6 of the protocol).**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean (tsc -b && vite build). FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean
```

Manual smoke per Wave Review.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/notifications.md` — Wave 30 dispatch pipeline; Task 4 mirrors the cron-driven dispatch + retry pattern
- `docs/architecture/dashboard-analytics.md` — Wave 27 `activity_log` is the source for Task 4 webhooks
- Zoho OAuth + CRM API docs — read before Task 1
- AWS S3 presigned URL docs — read before Task 2
- iCalendar (RFC 5545) reference — read before Task 3
- HMAC signing standards (Stripe webhook docs are a good model) — Task 4

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror six new migrations / extensions)
- `docs/architecture/integrations.md` (filled across all four tasks)
- `docs/AGENT_CONTEXT.md` (Wave 36 golden path)
- `docs/dev-notes.md` (multiple integration deferrals noted)
- `src/shared/db/database.types.ts` (six new tables / columns)
- `src/shared/db/app.types.ts` (corresponding row types)
- `src/shared/api/planterClient.ts` (`integrations.*` namespace)
- `src/pages/Settings.tsx` (Integrations tab — extends from Task 1)
- `src/features/tasks/components/TaskResources.tsx` (S3 upload UI)
- `spec.md` (flip §3.7 External Integrations to `[x]`, bump to 1.21.0)
- `repo-context.yaml` (Wave 36 highlights)
- `CLAUDE.md` (Tables + Integrations subsection + Cron Jobs)
- `.env.example` (8 new env vars across Zoho + AWS)

**Will create:**
- `docs/db/migrations/2026_04_18_zoho_integration.sql`
- `docs/db/migrations/2026_04_18_s3_uploads.sql`
- `docs/db/migrations/2026_04_18_ics_tokens.sql`
- `docs/db/migrations/2026_04_18_webhook_subscriptions.sql`
- `docs/architecture/integrations.md`
- `docs/operations/s3-cors-setup.md`
- `supabase/functions/zoho-oauth-init/{index.ts,README.md}`
- `supabase/functions/zoho-oauth-callback/{index.ts,README.md}`
- `supabase/functions/zoho-sync/{index.ts,README.md}`
- `supabase/functions/s3-presign-upload/{index.ts,README.md}`
- `supabase/functions/s3-confirm-upload/{index.ts,README.md}`
- `supabase/functions/ics-feed/{index.ts,README.md}`
- `supabase/functions/webhook-dispatch/{index.ts,README.md}`
- Tests under `Testing/unit/...` mirroring the source paths (~12 new test files)

**Explicitly out of scope this wave:**
- Bidirectional Zoho sync
- Per-org S3 bucket
- Multi-part S3 upload >100 MB
- Server-side virus scanning
- Two-way calendar sync (Google / Outlook)
- Custom webhook payload templating
- Webhook bulk-replay UI

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (ICS rendering uses `date-engine` for the DTSTART/DTEND ISO strings); no direct `supabase.from()` in components (`planterClient.integrations.*`); Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; new deps allowed: AWS S3 SDK (Deno ESM), Stripe (already from Wave 35) — motivate each in the PR with bundle-size impact (Deno-only deps don't affect frontend bundle); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only; webhook delivery secret is generated server-side and shown to the user **once** (in the create response) — never stored in plaintext on the frontend, never logged in error toasts.
