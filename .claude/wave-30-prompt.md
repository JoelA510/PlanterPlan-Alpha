## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 29 shipped to `main`:
- Checkpoint project kind (`settings.project_kind = 'date' | 'checkpoint'`) + sequential unlock + donut viz
- Advanced Access (Phase Lead) — `settings.phase_lead_user_ids[]` on phase/milestone rows + additive RLS UPDATE policy via `user_is_phase_lead`

Spec is at **1.14.0**. Outstanding roadmap: §3.7 Push & Email Notifications (this wave), §3.7 Advanced Admin / White Labeling / Store / External Integrations (later waves), §3.8 PWA + Offline (Wave 32), §3.1 Localization (Wave 31), plus Wave 37's architecture-doc gap closures.

Wave 30 wires the **Push & Email Notifications** stack (§3.7). Email infrastructure already exists from Wave 22 (`supabase/functions/_shared/email.ts` + Resend integration). This wave layers in **Web Push** (browser native), **user notification preferences**, **mention resolution + delivery** for Wave 26 comments, and a **daily/weekly digest** edge function. Notifications are first-class enough to deserve their own wave but not so large they need splitting — three tasks, all interlocking.

**Gate baseline going into Wave 30:** confirm the current `main` baseline. Run `npm run lint`, `npm run build`, `npx vitest run`. Note that the existing `EMAIL_PROVIDER_API_KEY` + `RESEND_FROM_ADDRESS` env vars must already be set in your local Supabase environment for the email half of this wave to be testable; if they aren't, the function degrades to log-only (Wave 22 contract preserved).

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-30-notification-prefs`
- Task 2 → `claude/wave-30-web-push`
- Task 3 → `claude/wave-30-mention-and-digest`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 30 scope

Three tasks. Task 1 lays the data foundation (preferences). Task 2 wires the Web Push transport. Task 3 ships the actual notification triggers (mentions + digest) on top of those rails.

---

### Task 1 — Notification preferences + dispatch model

**Commit:** `feat(wave-30): notification_preferences table + planterClient API + Settings UI`

The data layer that every later notification feature reads from.

1. **Migration** (`docs/db/migrations/2026_XX_XX_notification_preferences.sql`, NEW)
   - Two tables:
     - `public.notification_preferences (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email_mentions boolean NOT NULL DEFAULT true, email_overdue_digest text NOT NULL DEFAULT 'daily' CHECK (email_overdue_digest IN ('off','daily','weekly')), email_assignment boolean NOT NULL DEFAULT true, push_mentions boolean NOT NULL DEFAULT true, push_overdue boolean NOT NULL DEFAULT true, push_assignment boolean NOT NULL DEFAULT false, quiet_hours_start time, quiet_hours_end time, timezone text NOT NULL DEFAULT 'UTC', updated_at timestamptz NOT NULL DEFAULT now())`.
     - `public.notification_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, channel text NOT NULL CHECK (channel IN ('email','push')), event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, sent_at timestamptz NOT NULL DEFAULT now(), provider_id text, error text)`. Append-only audit trail of every notification dispatch attempt (sent or failed) — used for debugging and rate-limit windowing.
   - Indexes: `idx_notification_log_user_id_sent_at` on `(user_id, sent_at DESC)`; `idx_notification_log_event_type` on `(event_type, sent_at DESC)`.
   - Trigger `trg_notification_preferences_handle_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()`.
   - **RLS** — enable on both:
     - `notification_preferences`: SELECT/UPDATE `user_id = auth.uid()`. INSERT `user_id = auth.uid()`. DELETE denied (use UPDATE to disable, not DELETE).
     - `notification_log`: SELECT `user_id = auth.uid() OR is_admin(auth.uid())`. INSERT/UPDATE/DELETE denied except via SECURITY DEFINER inside the dispatch functions (Tasks 2 + 3 use this).
   - **Auto-bootstrap row**: `CREATE FUNCTION public.bootstrap_notification_prefs() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END; $$ SECURITY DEFINER`. Bind via `CREATE TRIGGER trg_bootstrap_notification_prefs AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_notification_prefs()`. Backfill: `INSERT INTO public.notification_preferences (user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING`.
   - Mirror everything into `docs/db/schema.sql`.

2. **Domain types** (`src/shared/db/app.types.ts`)
   - `NotificationPreferencesRow/Update` for the prefs table.
   - `NotificationLogRow` for the log table.
   - Hand-add both to `database.types.ts`.

3. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `notifications.getPreferences(): Promise<NotificationPreferencesRow>` — wraps the `SELECT * WHERE user_id = auth.uid()` (RLS handles the filter).
   - `notifications.updatePreferences(patch: NotificationPreferencesUpdate): Promise<NotificationPreferencesRow>`.
   - `notifications.listLog(opts?: { limit?: number; before?: string; eventType?: string }): Promise<NotificationLogRow[]>` — for the "My Notifications" Settings tab in step 5.

4. **Hooks** (`src/features/settings/hooks/useNotificationPreferences.ts`, NEW)
   - `useNotificationPreferences()` — `useQuery({ queryKey: ['notificationPreferences'] })`.
   - `useUpdateNotificationPreferences()` — `useMutation` with optimistic update + rollback.
   - `useNotificationLog(opts)` — `useQuery({ queryKey: ['notificationLog', opts] })`.

5. **Settings UI** (`src/pages/Settings.tsx` — extend the existing tab structure)
   - New "Notifications" tab between Profile and Security.
   - Sections:
     - **Email** (toggle group): Mentions, Overdue Digest (Off/Daily/Weekly), Task Assignment.
     - **Push** (toggle group; show "Enable browser push" prompt when not yet subscribed — wires up in Task 2): Mentions, Overdue Tasks, Task Assignment.
     - **Quiet hours**: time pickers for start/end, timezone dropdown (autopopulated from `Intl.DateTimeFormat().resolvedOptions().timeZone`).
   - Sonner toast on save.
   - "Recent notifications" collapsed `<details>` rendering `useNotificationLog({ limit: 20 })` for transparency.

6. **Architecture doc** (`docs/architecture/auth-rbac.md`)
   - New `## Notification Preferences (Wave 30)` section under Business Rules. Document: per-user prefs row, bootstrap trigger, append-only log, RLS contract.

7. **Tests**
   - `Testing/unit/shared/api/planterClient.notifications.test.ts` (NEW)
   - `Testing/unit/features/settings/hooks/useNotificationPreferences.test.tsx` (NEW)
   - `Testing/unit/pages/Settings.notifications.test.tsx` (NEW) — tab renders, fields persist on save
   - Manual `psql` smoke at `docs/db/tests/notification_prefs_bootstrap.sql` — confirm the auth.users INSERT trigger creates a prefs row.

**DB migration?** Yes — additive (two tables + 1 trigger + 1 backfill).

**Out of scope:** quiet-hours enforcement in Tasks 2/3 (those tasks read the column but the actual "skip during quiet hours" gate ships in Task 3 as part of the digest/dispatch-decision logic — keep the table column ready). Per-project preference overrides (deferred — global per-user is enough for v1).

---

### Task 2 — Web Push transport

**Commit:** `feat(wave-30): web push subscription + service worker + delivery edge function`

Browser-native push notifications via VAPID. The user opts in from the Settings tab built in Task 1; once subscribed, the dispatch edge function (Task 3) fans out via `web-push` from Deno.

1. **Generate VAPID keys** (one-time, document in PR description, not committed)
   - Use `npx web-push generate-vapid-keys`. Public key goes into `VITE_VAPID_PUBLIC_KEY` (committed via `.env.example`); private key goes into `VAPID_PRIVATE_KEY` Supabase secret.

2. **Subscriptions table** (`docs/db/migrations/2026_XX_XX_push_subscriptions.sql`, NEW)
   - `public.push_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, endpoint text NOT NULL, p256dh text NOT NULL, auth text NOT NULL, user_agent text, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz)`.
   - `UNIQUE (user_id, endpoint)`.
   - RLS: SELECT/INSERT/DELETE `user_id = auth.uid()`; UPDATE `user_id = auth.uid()` (only `last_used_at` should ever change client-side; server-side update via dispatch func uses SECURITY DEFINER).
   - Mirror into `docs/db/schema.sql`.

3. **Service worker** (`public/sw.js`, NEW; **NOTE this is the one file in this codebase that may be `.js` because service workers run outside the React/TS bundle pipeline** — call this exception out in the PR description and the file's own comment header)
   - Listens for `push` events. Body shape (matches dispatch in step 6): `{ title, body, url, icon, tag }`. Calls `self.registration.showNotification(title, { body, icon, data: { url } })`.
   - Listens for `notificationclick` — opens `event.notification.data.url` in a new tab (`clients.openWindow`).
   - Lifecycle: `install` → `self.skipWaiting()`; `activate` → `clients.claim()`. Standard PWA-friendly setup so Wave 32 can extend it without rewriting.

4. **Subscription hook** (`src/features/settings/hooks/usePushSubscription.ts`, NEW)
   - `usePushSubscription()` returns `{ subscription, isSubscribing, subscribe(), unsubscribe(), isSupported, permissionState }`.
   - `subscribe()`:
     - `Notification.requestPermission()` → bail if denied.
     - `navigator.serviceWorker.register('/sw.js')` then wait for `ready`.
     - `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VITE_VAPID_PUBLIC_KEY) })`.
     - POST the resulting `PushSubscription` to `planter.entities.PushSubscription.create({ endpoint, p256dh, auth, user_agent })`.
   - `unsubscribe()`: `registration.pushManager.getSubscription()` → `subscription.unsubscribe()` → `planter.entities.PushSubscription.delete()`.
   - `isSupported = 'serviceWorker' in navigator && 'PushManager' in window`.

5. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `entities.PushSubscription.create(payload)`, `entities.PushSubscription.list()`, `entities.PushSubscription.delete(endpoint)`.

6. **Dispatch edge function** (`supabase/functions/dispatch-push/`, NEW: `index.ts` + `README.md`)
   - Triggered via `planter.functions.invoke('dispatch-push', { body: { user_ids: string[], title, body, url, tag } })` from inside other edge functions (Task 3 calls this).
   - Loads `VAPID_PRIVATE_KEY` + `VITE_VAPID_PUBLIC_KEY` from env. Uses `web-push` from Deno (`https://esm.sh/web-push@3`).
   - For each user → loads `push_subscriptions` rows → sends one push per row → on failure, marks the subscription stale (DELETE if 410 Gone, leave intact otherwise).
   - **Honor `notification_preferences.push_*` toggles** — fetched and joined per user before sending. The `event_type` parameter on the request maps to one of `mentions | overdue | assignment`; the function checks the matching `push_*` boolean.
   - **Honor quiet hours** — if the user's `quiet_hours_start <= local_now <= quiet_hours_end` (in their `timezone`), skip + log to `notification_log` with `error = 'quiet_hours'`.
   - Inserts a `notification_log` row per attempt (success or skip).
   - README documents env vars, request shape, and the failure mode contract.

7. **Settings UI integration** (`src/pages/Settings.tsx`)
   - In the Push section built in Task 1, add the "Enable browser push" button driven by `usePushSubscription`. Disabled state with a tooltip when `isSupported === false`. Toggle each individual push event (mentions/overdue/assignment) only enables when `subscription` exists.

8. **Tests**
   - `Testing/unit/features/settings/hooks/usePushSubscription.test.tsx` (NEW) — mocks `navigator.serviceWorker` and `Notification`; exercises subscribe/unsubscribe/permission-denied branches.
   - `Testing/unit/supabase/functions/dispatch-push.test.ts` (NEW) — pure unit test of the dispatcher's branching: pref-disabled → skip + log; quiet hours → skip + log; 410 stale → DELETE; 200 → log success; multiple subscriptions per user → loop.

**DB migration?** Yes — one new table + RLS.

**Out of scope:** iOS Safari push (gated on Wave 32 PWA install — iOS only allows Web Push for installed PWAs); rich notifications with action buttons (deferred); badge counters (deferred); native mobile push (Wave 32 RxDB territory at the earliest).

---

### Task 3 — Mention resolution + comment notifications + daily/weekly digest

**Commit:** `feat(wave-30): mention resolution, comment notifications, and overdue digest dispatch`

Wires the actual triggers. Three subsurfaces.

1. **Mention resolution** (`src/features/tasks/lib/comment-mentions.ts` — extend Wave 26's file)
   - New `resolveMentions(handles: string[]): Promise<{ handle: string; user_id: string | null }[]>` — looks up each `@handle` against `auth.users` (or a `users` view if the codebase already has one). Returns user_ids when matched, `null` when not.
   - Resolved mention uuids are written to `task_comments.mentions[]` at INSERT time. The comment composer in `CommentComposer.tsx` (Wave 26) calls `resolveMentions` after `extractMentions` and persists the resolved uuids — falling back to passing the raw handle through when resolution fails.

2. **Comment-mention dispatch trigger** (`docs/db/migrations/2026_XX_XX_comment_mention_dispatch.sql`, NEW)
   - `CREATE FUNCTION public.dispatch_comment_mentions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER ...`. After INSERT on `task_comments`: for each uuid in `NEW.mentions`, enqueue a notification by inserting a `notification_log` row with `event_type = 'mention_pending'` and the comment payload. **Don't send directly from the trigger** — the actual email + push happens in a `dispatch-notifications` edge function call below, which the cron triggers every minute (or near-real-time via a follow-up DB notification — start with cron, escalate if latency feels bad).
   - Mirror into `docs/db/schema.sql`.

3. **Email + Push dispatch edge function** (`supabase/functions/dispatch-notifications/`, NEW: `index.ts` + `README.md`)
   - Runs every minute via `pg_cron` or Supabase scheduled-trigger.
   - Picks up `notification_log` rows with `event_type = 'mention_pending'` (or `'assignment_pending'` etc.). For each:
     - Loads the recipient's `notification_preferences`.
     - Sends email via `_shared/email.ts` (Resend) when `email_mentions === true` and outside quiet hours.
     - Calls `dispatch-push` (Task 2's function) when `push_mentions === true` and outside quiet hours.
     - Updates the `notification_log` row's `event_type` from `mention_pending` to `mention_sent` (or `mention_skipped`) so the next cron tick doesn't re-process.
   - **Idempotency**: the `event_type` flip is the lock. Race-safety via `UPDATE … SET event_type = 'mention_processing' WHERE event_type = 'mention_pending' RETURNING *` — only the first runner picks each row.
   - README documents the pending → processing → sent state machine and the cron schedule.

4. **Overdue digest function** (`supabase/functions/overdue-digest/`, NEW: `index.ts` + `README.md`)
   - Daily cron (e.g. 8am UTC). Builds per-user digest of overdue tasks the user is the assignee on (or the project owner is for projects without an explicit assignee — keep the targeting tight to avoid spam).
   - Honors `notification_preferences.email_overdue_digest`:
     - `'off'` → skip user.
     - `'daily'` → always include.
     - `'weekly'` → include only on Mondays (UTC).
   - Renders via a pure `renderOverdueDigestEmail(payload)` helper in `_shared/email.ts` (mirrors the Wave 22 `renderSupervisorReportEmail` pattern). Subject: "PlanterPlan — N overdue tasks".
   - Sends via `_shared/email.ts`. Logs to `notification_log` with `event_type = 'overdue_digest_sent'`.

5. **Schedule the new functions** (`supabase/migrations/` or `supabase/cron.sql`)
   - `dispatch-notifications` → every minute.
   - `overdue-digest` → daily at 8am UTC.
   - The existing `nightly-sync` schedule from Wave 20+21 stays unchanged.

6. **Architecture doc**
   - New `docs/architecture/notifications.md` (NEW) — dedicated doc for the notification stack since it now spans 3 edge functions, 3 tables, and a service worker. Sections: Data model (refs Task 1's tables), Triggers (refs Task 3's mention dispatch + future hooks), Transports (Email via Resend, Push via VAPID/`dispatch-push`), Pipeline (pending → processing → sent state machine), User Preferences, Quiet Hours, Failure modes (stale push subscription cleanup, email bounces).
   - Update `docs/architecture/dashboard-analytics.md` Admin Notifications bullet to flip from "TODO" to "Resolved (Wave 30) — see `notifications.md`."

7. **Tests**
   - `Testing/unit/features/tasks/lib/comment-mentions.test.ts` — extend Wave 26's file with `resolveMentions` cases (matched + unmatched + mixed).
   - `Testing/unit/supabase/functions/dispatch-notifications.test.ts` (NEW) — state-machine transitions; pref-respect; quiet-hours skip; idempotency on concurrent runs (mock the UPDATE … RETURNING contention).
   - `Testing/unit/supabase/functions/overdue-digest.test.ts` (NEW) — frequency matrix (daily/weekly Monday vs. Tuesday); zero-overdue user → no email; payload shape covered by `renderOverdueDigestEmail` test in `_shared/email.test.ts`.
   - Manual smoke documented in PRs: post a comment with `@otheruser` → confirm `notification_log` row appears; cron runs → email lands in Resend; push lands in browser.

**DB migration?** Yes — one trigger function + binding. Plus the cron schedule rows.

**Out of scope:**
- Notification snooze / batching beyond quiet hours (deferred — could be a Wave 33 nice-to-have).
- Per-project notification overrides (deferred).
- In-app inbox / bell icon (deferred — the Settings "Recent notifications" panel covers transparency for v1; a richer inbox can land alongside Wave 33 admin work).
- SMS or other transports.

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.7 Push & Email Notifications from `[ ]` to `[x]` with sub-bullets pointing to `docs/architecture/notifications.md`. Bump version to **1.15.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Notifications Stack (Wave 30)" golden-path bullet pointing to `notifications.md` + `notification_preferences` + `push_subscriptions` + the three edge functions.
3. **`docs/architecture/notifications.md`** (NEW) is in. Cross-links from `auth-rbac.md` (preferences RLS) and `dashboard-analytics.md` (admin notification bullet flipped to Resolved).
4. **`docs/dev-notes.md`** — add a new active entry: "Service worker exception — `public/sw.js` is the **only** non-TypeScript file in `src/`. Documented exception per Wave 30. Migrating to TS workbox build is deferred." Track this so future TS-purity sweeps don't accidentally try to convert it.
5. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 30 (Push + Email Notifications)`, update `last_completed`, `spec_version`, add `wave_30_highlights:` block.
6. **`CLAUDE.md`** — add `notification_preferences`, `notification_log`, `push_subscriptions` to the Tables list. Add `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY` to the Environment section. Note the `dispatch-notifications` and `overdue-digest` cron schedules under a new "Cron Jobs" subsection.
7. **`.env.example`** — add `VITE_VAPID_PUBLIC_KEY=`.

Land docs as `docs(wave-30): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **End-to-end manual smoke** — sign up a brand new user → confirm a `notification_preferences` row appears via the bootstrap trigger. Subscribe to push from Settings → confirm a `push_subscriptions` row lands. Comment with `@thisuser` from another account → wait one cron tick → email arrives + push fires.
2. **Quiet hours** — set quiet hours to `00:00–23:59` UTC → trigger a notification → the dispatch should log `error = 'quiet_hours'` and skip both transports.
3. **Stale push subscription** — delete the browser subscription manually (`navigator.serviceWorker.controller?.postMessage('unsubscribe')` or via DevTools → Application → Service Workers → unregister) → trigger a push → the dispatcher should DELETE the row on 410.
4. **Idempotency** — manually invoke `dispatch-notifications` twice in quick succession → no duplicate emails / pushes per pending event.
5. **No FSD drift** — `usePushSubscription` lives in `features/settings/hooks/`; `comment-mentions.ts` extension in `features/tasks/lib/`; no shared imports back from features.
6. **Service worker exception is documented** — comment header in `public/sw.js`; entry in `dev-notes.md`.
7. **Type drift** — `database.types.ts` hand-edited cleanly.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 31)

After all three Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 3 task commits + 1 docs sweep commit on top of Wave 29.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 31** until `main` is green and the docs are up.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke (see Wave Review for details).

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `supabase/functions/_shared/email.ts` — Wave 22 Resend wrapper to extend with `renderOverdueDigestEmail`
- `supabase/functions/supervisor-report/` — precedent for an edge function that loads prefs + dispatches via Resend + supports a `dry_run` mode
- `src/features/tasks/components/TaskComments/CommentComposer.tsx` — Wave 26 host for mention resolution
- Web Push (`web-push` npm + ESM Deno equivalent) — read API contract before implementing Task 2

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror three new migrations)
- `docs/architecture/auth-rbac.md` (Notification Preferences section)
- `docs/architecture/dashboard-analytics.md` (Admin Notifications gap → Resolved)
- `docs/AGENT_CONTEXT.md` (Wave 30 golden path)
- `docs/dev-notes.md` (service-worker TS-exception entry)
- `src/shared/db/database.types.ts` (3 new tables)
- `src/shared/db/app.types.ts` (Notification types)
- `src/shared/api/planterClient.ts` (`notifications.*` + `entities.PushSubscription`)
- `src/pages/Settings.tsx` (Notifications tab)
- `src/features/tasks/lib/comment-mentions.ts` (extend with `resolveMentions`)
- `src/features/tasks/components/TaskComments/CommentComposer.tsx` (call `resolveMentions` before persist)
- `supabase/functions/_shared/email.ts` (add `renderOverdueDigestEmail`)
- `spec.md` (flip §3.7 to `[x]`, bump to 1.15.0)
- `repo-context.yaml` (Wave 30 highlights)
- `CLAUDE.md` (tables + env + cron jobs sections)
- `.env.example` (VAPID public key)

**Will create:**
- `docs/db/migrations/2026_XX_XX_notification_preferences.sql`
- `docs/db/migrations/2026_XX_XX_push_subscriptions.sql`
- `docs/db/migrations/2026_XX_XX_comment_mention_dispatch.sql`
- `docs/db/tests/notification_prefs_bootstrap.sql`
- `docs/architecture/notifications.md`
- `public/sw.js`
- `src/features/settings/hooks/useNotificationPreferences.ts`
- `src/features/settings/hooks/usePushSubscription.ts`
- `supabase/functions/dispatch-push/index.ts`
- `supabase/functions/dispatch-push/README.md`
- `supabase/functions/dispatch-notifications/index.ts`
- `supabase/functions/dispatch-notifications/README.md`
- `supabase/functions/overdue-digest/index.ts`
- `supabase/functions/overdue-digest/README.md`
- `Testing/unit/shared/api/planterClient.notifications.test.ts`
- `Testing/unit/features/settings/hooks/useNotificationPreferences.test.tsx`
- `Testing/unit/features/settings/hooks/usePushSubscription.test.tsx`
- `Testing/unit/pages/Settings.notifications.test.tsx`
- `Testing/unit/supabase/functions/dispatch-push.test.ts`
- `Testing/unit/supabase/functions/dispatch-notifications.test.ts`
- `Testing/unit/supabase/functions/overdue-digest.test.ts`

**Explicitly out of scope this wave:**
- Notification snooze / batching
- Per-project preference overrides
- In-app inbox / bell icon (deferred to Wave 33 if user demand justifies)
- SMS / Slack / Discord transports
- iOS Safari push without PWA install (waits on Wave 32)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only across `src/` — **with one documented exception** (`public/sw.js`); no `.js` / `.jsx` files in the React app code; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (digest day-of-week comparison goes through `date-engine`); no direct `supabase.from()` in components (Notification settings UI uses `planterClient`); Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; one new dep allowed: `web-push` (Deno ESM); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
