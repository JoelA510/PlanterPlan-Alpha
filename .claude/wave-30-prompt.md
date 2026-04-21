## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 29 shipped to `main`:
- Checkpoint project kind (`settings.project_kind = 'date' | 'checkpoint'`) + sequential unlock UX + donut viz
- Advanced Access (Phase Lead) — `settings.phase_lead_user_ids[]` + `user_is_phase_lead` recursive ancestor RLS

Spec is at **1.14.0**. Outstanding: §3.7 Push & Email Notifications (this wave), §3.7 Admin / White-Label / Store / Integrations (Waves 33–36), §3.8 PWA + Offline (Wave 32), §3.1 Localization (Wave 31), Wave 37 doc-gap closures.

Wave 30 wires the **Push & Email Notifications** stack (§3.7). Email infrastructure exists from Wave 22 (`supabase/functions/_shared/email.ts` + Resend integration; `EMAIL_PROVIDER_API_KEY` env var). This wave layers in **Web Push** (browser native), **user notification preferences**, **mention resolution + delivery** for Wave 26 comments, and **daily/weekly digest** edge functions.

**Test baseline going into Wave 30:** Wave 29 shipped at ≥620 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress.

**Read `.claude/wave-testing-strategy.md` before starting.** Wave 30 specific: install `Testing/test-utils/mocks/service-worker.ts` and `Testing/test-utils/mocks/notification-api.ts` (NEW); call both from a `beforeAll` in `Testing/setupTests.ts` so every test starts with stub implementations of `navigator.serviceWorker` and `Notification`. Individual tests can override `Notification.permission = 'granted'` etc. Existing `useTaskComments` test (Wave 26) doesn't break because the new `resolveMentions` step in `CommentComposer` falls through to verbatim handles when the RPC mock returns an error.

## Pre-flight verification (run before any task)

1. `git log --oneline -5` includes the 3 Wave 29 commits.
2. These files exist:
   - `supabase/functions/_shared/email.ts` (Wave 22 — Resend wrapper to extend)
   - `supabase/functions/supervisor-report/{index.ts,README.md}` (precedent for cron-driven pref-respecting dispatch)
   - `supabase/functions/nightly-sync/{index.ts,README.md}` (precedent for cron-driven pass)
   - `src/features/tasks/lib/comment-mentions.ts` (Wave 26 — `extractMentions`; Wave 30 extends with `resolveMentions`)
   - `src/features/tasks/components/TaskComments/CommentComposer.tsx` (Wave 26 — calls `extractMentions` on submit; Wave 30 layers `resolveMentions`)
   - `src/pages/Settings.tsx` (current tabs: Profile, Security; Wave 30 adds Notifications)
   - `src/shared/api/planterClient.ts`
   - `src/shared/db/app.types.ts`
3. `EMAIL_PROVIDER_API_KEY` and `RESEND_FROM_ADDRESS` env vars exist in your local Supabase environment. If absent, the new dispatch functions in this wave will degrade to log-only (mirrors Wave 22 contract).
4. **CRITICAL**: per `supabase/functions/nightly-sync/README.md`, `pg_cron` is intentionally NOT enabled in this codebase. The operator must schedule edge functions externally — options:
   - Supabase Dashboard's "Scheduled Triggers" feature (preferred — UI-driven; documented in Supabase Dashboard).
   - GitHub Actions cron schedule POST'ing the function URL.
   - `cron-job.org` or similar external pinger.
   - Manual `pg_cron` enablement requires `CREATE EXTENSION pg_cron;` + Supabase plan support — **do NOT enable in this wave**.
   Wave 30's new dispatch functions require operator scheduling. Document in each new README which schedule to use; ship the function code regardless.
5. Existing tables (per Wave 27 schema map): `admin_users, people, project_invites, project_members, rag_chunks, task_relationships, task_resources, tasks, task_comments, activity_log` (10 tables). Wave 30 adds 3 more: `notification_preferences`, `notification_log`, `push_subscriptions`.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-30-notification-prefs`
- Task 2 → `claude/wave-30-web-push`
- Task 3 → `claude/wave-30-mention-and-digest`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 30 scope

Three tasks. Task 1 lays the data foundation. Task 2 wires Web Push transport. Task 3 ships the actual notification triggers (mentions + digest) on top of those rails.

---

### Task 1 — Notification preferences + dispatch model

**Commit:** `feat(wave-30): notification_preferences + notification_log + Settings UI`

**Migration**: `docs/db/migrations/2026_04_18_notification_preferences.sql` (NEW). Use this DDL:

```sql
-- Migration: Wave 30 — notification preferences + log
-- Date: 2026-04-18
-- Description:
--   Two tables that every notification feature reads from. Bootstrap trigger
--   creates a default prefs row for every existing and future auth.users row.
--   Append-only notification_log audit trail used for debugging, idempotency,
--   and user-visible "recent notifications" tab.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_bootstrap_notification_prefs ON auth.users;
--   DROP FUNCTION IF EXISTS public.bootstrap_notification_prefs();
--   DROP TABLE IF EXISTS public.notification_log CASCADE;
--   DROP TABLE IF EXISTS public.notification_preferences CASCADE;

CREATE TABLE public.notification_preferences (
  user_id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_mentions       boolean     NOT NULL DEFAULT true,
  email_overdue_digest text        NOT NULL DEFAULT 'daily' CHECK (email_overdue_digest IN ('off','daily','weekly')),
  email_assignment     boolean     NOT NULL DEFAULT true,
  push_mentions        boolean     NOT NULL DEFAULT true,
  push_overdue         boolean     NOT NULL DEFAULT true,
  push_assignment      boolean     NOT NULL DEFAULT false,
  quiet_hours_start    time,
  quiet_hours_end      time,
  timezone             text        NOT NULL DEFAULT 'UTC',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL CHECK (channel IN ('email','push')),
  event_type  text        NOT NULL,
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  provider_id text,
  error       text
);

CREATE INDEX idx_notification_log_user_id_sent_at ON public.notification_log (user_id, sent_at DESC);
CREATE INDEX idx_notification_log_event_type      ON public.notification_log (event_type, sent_at DESC);

CREATE TRIGGER trg_notification_preferences_handle_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log         ENABLE ROW LEVEL SECURITY;

-- RLS: notification_preferences
CREATE POLICY "Notif prefs: select own"  ON public.notification_preferences FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notif prefs: insert own"  ON public.notification_preferences FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notif prefs: update own"  ON public.notification_preferences FOR UPDATE  TO authenticated USING (user_id = auth.uid());
-- DELETE not exposed; UPDATE is the off-switch.

-- RLS: notification_log (SELECT-only for users, plus admin)
CREATE POLICY "Notif log: select own or admin"
ON public.notification_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
-- INSERT/UPDATE/DELETE denied at policy level — only SECURITY DEFINER dispatch functions write.

-- Bootstrap: create a prefs row for every auth.users INSERT
CREATE OR REPLACE FUNCTION public.bootstrap_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_notification_prefs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_notification_prefs() TO authenticated;

CREATE TRIGGER trg_bootstrap_notification_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.bootstrap_notification_prefs();

-- Backfill prefs for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

Mirror into `docs/db/schema.sql`.

**Generated types** — hand-add to `src/shared/db/database.types.ts` under `Database['public']['Tables']`:

```ts
notification_preferences: {
  Row: {
    user_id: string
    email_mentions: boolean
    email_overdue_digest: 'off' | 'daily' | 'weekly'
    email_assignment: boolean
    push_mentions: boolean
    push_overdue: boolean
    push_assignment: boolean
    quiet_hours_start: string | null  // 'HH:MM:SS'
    quiet_hours_end: string | null
    timezone: string
    updated_at: string
  }
  Insert: {
    user_id: string
    email_mentions?: boolean
    email_overdue_digest?: 'off' | 'daily' | 'weekly'
    email_assignment?: boolean
    push_mentions?: boolean
    push_overdue?: boolean
    push_assignment?: boolean
    quiet_hours_start?: string | null
    quiet_hours_end?: string | null
    timezone?: string
    updated_at?: string
  }
  Update: { /* same shape with all optional */ }
  Relationships: []
},
notification_log: {
  Row: {
    id: string
    user_id: string
    channel: 'email' | 'push'
    event_type: string
    payload: Json
    sent_at: string
    provider_id: string | null
    error: string | null
  }
  Insert: { /* same shape, id/sent_at optional */ }
  Update: { /* … */ }
  Relationships: []
},
```

**Domain types** — append to `src/shared/db/app.types.ts`:

```ts
// ----------------------------------------------------------------------------
// Notifications (Wave 30)
// ----------------------------------------------------------------------------
export type NotificationPreferencesRow    = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];
export type NotificationLogRow            = Database['public']['Tables']['notification_log']['Row'];
```

**planterClient methods** — append to `src/shared/api/planterClient.ts`:

```ts
export const notifications = {
  getPreferences: () => Promise<NotificationPreferencesRow>,                    // RLS auto-filters to own
  updatePreferences: (patch: NotificationPreferencesUpdate) => Promise<NotificationPreferencesRow>,
  listLog: (opts?: { limit?: number; before?: string; eventType?: string }) => Promise<NotificationLogRow[]>,
};
```

**Hooks** — `src/features/settings/hooks/useNotificationPreferences.ts` (NEW):

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { planter } from '@/shared/api/planterClient';
import type { NotificationPreferencesUpdate } from '@/shared/db/app.types';

export function useNotificationPreferences() {
  return useQuery({ queryKey: ['notificationPreferences'], queryFn: planter.notifications.getPreferences });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: NotificationPreferencesUpdate) => planter.notifications.updatePreferences(patch),
    onMutate: async (patch) => { /* optimistic update */ },
    onError: (_err, _patch, ctx) => {
      qc.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.error('Could not save preferences');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notificationPreferences'] }),
  });
}

export function useNotificationLog(opts?: { limit?: number; before?: string; eventType?: string }) {
  return useQuery({ queryKey: ['notificationLog', opts], queryFn: () => planter.notifications.listLog(opts) });
}
```

**Settings UI** — `src/pages/Settings.tsx`. Read the file first to find the existing tab structure (Wave 18 added Security tab; current tabs: Profile, Security). Add a new "Notifications" tab between Profile and Security.

Sections inside the tab:
* **Email** — three rows: Mentions toggle (`<Switch>` from `src/shared/ui/switch.tsx`); Overdue Digest `<Select>` (Off/Daily/Weekly); Task Assignment toggle.
* **Push** — header row "Enable browser push" → `<Button>` that wires Task 2's `usePushSubscription`. When subscription is null, the three push toggles below are disabled with a tooltip "Enable browser push first."
* **Quiet hours** — two `<Input type="time">` for start/end; `<Select>` for timezone (autopopulate options from `Intl.supportedValuesOf?.('timeZone')` if available, else hardcoded common list).
* **Recent notifications** — collapsed `<details>` rendering `useNotificationLog({ limit: 20 })` for transparency.

On every change, call `useUpdateNotificationPreferences().mutate({...patch})`. Sonner toast on success.

**Architecture doc** — append to `docs/architecture/auth-rbac.md`:

```md
### Notification Preferences (Wave 30)

Per-user `public.notification_preferences` row, bootstrapped by `trg_bootstrap_notification_prefs` AFTER INSERT on `auth.users`. Append-only `public.notification_log` audit trail per dispatch attempt (sent or skipped).

**RLS**:
* `notification_preferences`: SELECT/INSERT/UPDATE for `user_id = auth.uid()`. DELETE not exposed.
* `notification_log`: SELECT for `user_id = auth.uid() OR is_admin(auth.uid())`. INSERT/UPDATE/DELETE denied at policy level — only SECURITY DEFINER dispatch functions write.

**Quiet hours**: stored as `TIME` in user-supplied `timezone`. Tasks 2 + 3 dispatch functions skip + log when local-now is in the quiet window.

Migration: `docs/db/migrations/2026_04_18_notification_preferences.sql`.
```

**Tests**:
* `Testing/unit/shared/api/planterClient.notifications.test.ts` (NEW) — three method shapes.
* `Testing/unit/features/settings/hooks/useNotificationPreferences.test.tsx` (NEW) — optimistic update + rollback.
* `Testing/unit/pages/Settings.notifications.test.tsx` (NEW) — tab renders; field changes fire mutations.
* Manual `psql` smoke at `docs/db/tests/notification_prefs_bootstrap.sql` — INSERT a row into `auth.users` → assert a `notification_preferences` row materializes via the trigger.

**DB migration?** Yes — 2 tables + 1 trigger function + 1 trigger + 1 backfill.

**Out of scope:** Quiet-hours enforcement in Tasks 2/3 (those tasks read the column; the actual gate ships in Task 3 dispatcher). Per-project preference overrides.

---

### Task 2 — Web Push transport

**Commit:** `feat(wave-30): web push subscription + service worker + dispatch-push edge function`

Browser-native push notifications via VAPID. The user opts in from the Settings tab (Task 1); once subscribed, the dispatch edge function (Task 3) fans out via `web-push` from Deno.

**1. Generate VAPID keys** — one-time, document in PR description, **not committed**:

```bash
npx web-push generate-vapid-keys
```

Output goes into env:
* `VITE_VAPID_PUBLIC_KEY` — committed to `.env.example` as a key only (no value).
* `VAPID_PRIVATE_KEY` — Supabase secret only.
* `VAPID_SUBJECT` — `mailto:ops@planterplan.example` (a contact for push-service operators); committed to `.env.example` as a key.

**2. Subscriptions table** — `docs/db/migrations/2026_04_18_push_subscriptions.sql` (NEW):

```sql
-- Migration: Wave 30 — push subscriptions
-- Date: 2026-04-18
-- Description:
--   One row per (user, browser-endpoint). RLS scopes to own; the dispatch
--   function (SECURITY DEFINER) reads across users and DELETEs stale rows
--   on 410 Gone responses.
--
-- Revert path:
--   DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text        NOT NULL,
  p256dh        text        NOT NULL,
  auth          text        NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Push subs: select own"  ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Push subs: insert own"  ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Push subs: delete own"  ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
-- UPDATE not exposed to clients; dispatch function uses SECURITY DEFINER.
```

Mirror into `docs/db/schema.sql`.

**3. Service worker** — `public/sw.js` (NEW). **DOCUMENTED EXCEPTION TO TS-ONLY RULE** — service workers must be plain JS in this codebase because the Wave 32 PWA / workbox setup hasn't shipped yet; Wave 32 will subsume this file with a TS-built workbox worker. Add this header:

```js
/**
 * PlanterPlan service worker — push notification handler.
 *
 * EXCEPTION: this is the only non-TypeScript file in src/. Wave 32 will
 * subsume it with a workbox-built TS worker (`src/sw.ts`) and DELETE this file.
 * Tracked in docs/dev-notes.md.
 */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'PlanterPlan', body: event.data.text() }; }
  const { title = 'PlanterPlan', body = '', url = '/', icon = '/icon-192.png', tag } = payload;
  event.waitUntil(self.registration.showNotification(title, { body, icon, tag, data: { url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});
```

**4. Subscription hook** — `src/features/settings/hooks/usePushSubscription.ts` (NEW). Returns `{ subscription, isSubscribing, subscribe, unsubscribe, isSupported, permissionState }`. Uses `Notification.requestPermission()`, `navigator.serviceWorker.register('/sw.js')`, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: ... })`. Posts the resulting `PushSubscription` to `planter.entities.PushSubscription.create(...)`. Includes a `urlBase64ToUint8Array` helper inline (standard 10-line snippet from MDN).

`isSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window`.

**5. planterClient methods** — `src/shared/api/planterClient.ts`. Add `entities.PushSubscription.{ create, list, deleteByEndpoint }`. The `deleteByEndpoint` is for unsubscribe; Task 3's dispatcher uses a separate SECURITY DEFINER path to DELETE on 410 Gone.

**6. Dispatch edge function** — `supabase/functions/dispatch-push/` (NEW: `index.ts` + `README.md`). Triggered via `planter.functions.invoke('dispatch-push', { body: { user_ids, title, body, url, tag, event_type } })` from inside other edge functions (Task 3 calls this).

Implementation notes:
* Imports `web-push` from `https://esm.sh/web-push@3.6.7` (pinned). Verify the URL works at write time; if it doesn't, find the closest `web-push@3.x` ESM-compatible URL and pin it.
* Loads `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` from env.
* For each user: load `push_subscriptions` rows + `notification_preferences` row.
* Skip when the matching `push_*` boolean is false; log to `notification_log` with `error = 'pref_disabled'`.
* Skip when the user is in quiet hours (compute local time via `new Intl.DateTimeFormat(undefined, { timeZone: prefs.timezone, ... })`); log with `error = 'quiet_hours'`.
* Send one push per subscription. On 410 Gone: DELETE the subscription row. On other failures: log with `error = '<status>'`. On success: log with `provider_id = result.headers.get('x-message-id')` (or whatever Resend/web-push exposes).
* All log INSERTs go through SECURITY DEFINER (the function uses the SUPABASE_SERVICE_ROLE_KEY).

The `event_type` parameter is one of `mentions | overdue | assignment` and maps to which `push_*` column to check.

**7. Settings UI integration** — `src/pages/Settings.tsx`. Wire the "Enable browser push" button in the Push section (Task 1) to `usePushSubscription`. Disabled state with tooltip when `isSupported === false`.

**8. Tests**:
* `Testing/unit/features/settings/hooks/usePushSubscription.test.tsx` (NEW) — mock `navigator.serviceWorker` + `Notification`; subscribe / unsubscribe / permission-denied branches.
* `Testing/unit/supabase/functions/dispatch-push.test.ts` (NEW) — pref-disabled skip + log; quiet-hours skip + log; 410 → DELETE; 200 → log success; multiple subs per user.

**DB migration?** Yes — one new table.

**Out of scope:** iOS Safari push without PWA install (Wave 32 enables PWA; iOS Safari push requires installed PWA — gated to Wave 32+); rich notifications with action buttons; badge counters; native mobile push.

---

### Task 3 — Mention resolution + comment-mention dispatch + daily/weekly digest

**Commit:** `feat(wave-30): resolve mentions, dispatch comment notifications, send overdue digest`

Wires the actual triggers and the cron-driven dispatcher. Three subsurfaces.

**1. Mention resolution** — extend `src/features/tasks/lib/comment-mentions.ts` (Wave 26 file):

```ts
import { planter } from '@/shared/api/planterClient';

/**
 * Resolve @-handles to auth.users ids. Wave 30 stores resolved uuids in
 * task_comments.mentions; the comment composer in CommentComposer.tsx
 * calls this between extractMentions and the create mutation.
 *
 * Failure mode: handles that don't match any user are passed through
 * verbatim — the dispatch function in supabase/functions/dispatch-notifications/
 * skips entries it can't parse as uuid.
 */
export async function resolveMentions(handles: string[]): Promise<string[]> {
  if (handles.length === 0) return [];
  // SECURITY: this read goes through RLS — the user's auth.users SELECT scope.
  // Use a new planter helper that wraps a small RPC — the auth.users table
  // isn't directly exposed via planterClient.entities by default.
  const resolved = await planter.rpc<{ user_id: string | null }[]>('resolve_user_handles', { p_handles: handles });
  if (resolved.error) return handles; // pass through on failure
  return resolved.data?.map((r) => r.user_id ?? '').filter((s): s is string => s.length > 0) ?? handles;
}
```

`resolve_user_handles(p_handles text[])` is a new SECURITY DEFINER RPC that maps each handle to a uuid (looks up `auth.users.email` LIKE `<handle>@%` OR `auth.users.user_metadata->>'username' = <handle>`). Add to the same migration as the dispatch trigger:

```sql
CREATE OR REPLACE FUNCTION public.resolve_user_handles(p_handles text[])
RETURNS TABLE(handle text, user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT h, u.id
  FROM unnest(p_handles) AS h
  LEFT JOIN auth.users u
    ON lower(u.email) LIKE lower(h) || '@%'
    OR lower(u.raw_user_meta_data ->> 'username') = lower(h);
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_user_handles(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_user_handles(text[]) TO authenticated;
```

**2. Comment-mention dispatch trigger** — `docs/db/migrations/2026_04_18_comment_mention_dispatch.sql` (NEW). Adds `resolve_user_handles` (above) AND a trigger that enqueues notifications:

```sql
CREATE OR REPLACE FUNCTION public.enqueue_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Skip if no mentions; skip if author is mentioned (no self-notify)
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  FOREACH v_user_id IN ARRAY (
    SELECT array_agg(DISTINCT t::uuid)
    FROM unnest(NEW.mentions) AS t
    WHERE t IS NOT NULL AND t::uuid != NEW.author_id
  )
  LOOP
    INSERT INTO public.notification_log (user_id, channel, event_type, payload)
    VALUES (
      v_user_id,
      'email',  -- placeholder channel; dispatcher decides email vs push per prefs
      'mention_pending',
      jsonb_build_object('comment_id', NEW.id, 'task_id', NEW.task_id, 'author_id', NEW.author_id, 'body_preview', substring(NEW.body, 1, 140))
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_comment_mentions
AFTER INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_comment_mentions();
```

(The `mentions` column is `text[]` per Wave 26's schema; we coerce to uuid in the trigger. If the resolve helper returns the handle verbatim for an unmatched user, the cast fails silently — good.)

Mirror into `docs/db/schema.sql`.

**3. Email + push dispatch edge function** — `supabase/functions/dispatch-notifications/` (NEW). Cron-scheduled (operator chooses; recommend every minute via Supabase Scheduled Triggers — see Pre-flight #4). README documents the schedule recommendation.

State machine for each `notification_log` row:
1. `event_type = 'mention_pending'` (set by the trigger)
2. Dispatcher picks rows with `event_type LIKE '%_pending'` AND tries to claim:

```sql
UPDATE public.notification_log
SET event_type = REPLACE(event_type, '_pending', '_processing'),
    sent_at = now()
WHERE id = $1 AND event_type = $2  -- single row, by id from the SELECT
RETURNING *;
```

Only the first runner wins per row (`event_type` matches in WHERE). Any other concurrent runner gets 0 rows → moves on.

3. Dispatcher loads recipient prefs, decides email/push transport, sends via `_shared/email.ts` (Resend) and/or invokes `dispatch-push`.
4. On success: UPDATE `event_type = REPLACE(..., '_processing', '_sent')`, set `provider_id`.
5. On failure: UPDATE `event_type = REPLACE(..., '_processing', '_failed')`, set `error`.

README documents this state machine end-to-end.

**4. Overdue digest function** — `supabase/functions/overdue-digest/` (NEW). Cron-scheduled daily at 8am UTC (operator chooses). Logic:
* `SELECT user_id, email_overdue_digest, timezone FROM notification_preferences WHERE email_overdue_digest != 'off'`.
* For `'daily'`: include user always.
* For `'weekly'`: include only on Mondays — compute via the user's timezone, NOT UTC. (The Resend dispatch payload should reflect the user's view of the week.)
* For each included user, query their assigned/owned overdue tasks (status = 'overdue', not is_complete, due_date < now). Skip user if zero.
* Render via new pure helper `renderOverdueDigestEmail(payload)` in `_shared/email.ts` (mirrors Wave 22 `renderSupervisorReportEmail` pattern). Subject: `"PlanterPlan — N overdue task(s)"`.
* Send via `_shared/email.ts`. Log to `notification_log` with `event_type = 'overdue_digest_sent'`.

**5. Cron schedule documentation** — `docs/operations/edge-function-schedules.md` (NEW):

```md
# Edge Function Cron Schedules

PlanterPlan does not enable `pg_cron` in the database. Schedule the edge functions externally.

| Function | Recommended schedule | How to set up |
| --- | --- | --- |
| `nightly-sync` | `0 5 * * *` (05:00 UTC daily) | Supabase Dashboard → Edge Functions → Scheduled Triggers, OR GitHub Actions cron job POST'ing the function URL |
| `supervisor-report` | `0 9 2 * *` (09:00 UTC, day 2 of month) | same as above |
| `dispatch-notifications` | `* * * * *` (every minute) | Supabase Scheduled Triggers preferred |
| `overdue-digest` | `0 8 * * *` (08:00 UTC daily) | Supabase Scheduled Triggers preferred |

If using Supabase Dashboard scheduling, ensure the function's `--no-verify-jwt` flag is set if the schedule trigger doesn't carry a JWT (depends on Supabase plan).
```

**6. Architecture doc** — `docs/architecture/notifications.md` (NEW):

```md
# Notification Stack (Wave 30)

## Data model
* `notification_preferences` (per-user; bootstrap trigger; quiet hours; per-event toggles)
* `notification_log` (append-only audit; SELECT by user or admin; INSERT denied except via SECURITY DEFINER dispatch)
* `push_subscriptions` (per browser endpoint; UNIQUE on user_id+endpoint)

## Triggers
* `trg_bootstrap_notification_prefs` — AFTER INSERT on `auth.users` → creates default prefs row.
* `trg_enqueue_comment_mentions` — AFTER INSERT on `task_comments` → enqueues a `mention_pending` row in `notification_log` per resolved mention uuid (skips author).

## Transports
* **Email** — Resend via `supabase/functions/_shared/email.ts` (Wave 22). Requires `EMAIL_PROVIDER_API_KEY` + `RESEND_FROM_ADDRESS`. Degrades to log-only when env unset.
* **Push** — Web Push via VAPID; `web-push@3.6.7` from Deno ESM. Requires `VAPID_PRIVATE_KEY` + `VITE_VAPID_PUBLIC_KEY` + `VAPID_SUBJECT`. Service worker at `public/sw.js` (TS exception, see dev-notes; subsumed by Wave 32 workbox).

## Dispatch state machine
`<event>_pending → <event>_processing → <event>_sent | <event>_failed | <event>_skipped`. Single-runner-per-row via UPDATE...WHERE event_type=<previous_state>. Quiet hours and pref-disabled both produce `_skipped` outcomes with `error` populated.

## Cron schedules
See `docs/operations/edge-function-schedules.md`. `pg_cron` intentionally NOT enabled — operator chooses Supabase Scheduled Triggers, GitHub Actions, or external pinger.

## User preferences
Settings → Notifications tab exposes: per-event email/push toggles, overdue-digest cadence (off/daily/weekly), quiet hours (start/end + timezone), and a recent-notifications transparency panel.
```

**7. Tests**:
* `Testing/unit/features/tasks/lib/comment-mentions.test.ts` — extend with `resolveMentions` cases (matched, unmatched, mixed).
* `Testing/unit/supabase/functions/dispatch-notifications.test.ts` (NEW) — state-machine transitions; pref-respect; quiet-hours skip; idempotency on concurrent runs (mock the UPDATE...RETURNING contention).
* `Testing/unit/supabase/functions/overdue-digest.test.ts` (NEW) — frequency matrix (daily; weekly Monday vs Tuesday in user timezone); zero-overdue user → no email; payload shape covered by `renderOverdueDigestEmail` test in `_shared/email.test.ts`.
* Manual smokes documented in PRs.

**DB migration?** Yes — one trigger function + binding + one RPC.

**Out of scope:**
- Notification snooze / batching beyond quiet hours
- Per-project preference overrides
- In-app inbox / bell icon (deferred — Wave 33 may add)
- SMS / Slack / Discord transports

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-30): documentation currency sweep`. Operations:

1. **`spec.md`**:
   - §3.7: flip `[ ] **Push & Email Notifications** ...` → `[x]` with sub-bullets per task.
   - Bump header to `> **Version**: 1.15.0 (Wave 30 — Push + Email Notifications)`. Update `Last Updated`.

2. **`docs/AGENT_CONTEXT.md`** — add "Notifications Stack (Wave 30)" golden-path bullet pointing to `notifications.md`, the three tables, the four edge functions.

3. **`docs/architecture/notifications.md`** is in (Task 3).

4. **`docs/architecture/auth-rbac.md`** — Notification Preferences section in (Task 1).

5. **`docs/operations/edge-function-schedules.md`** is in (Task 3).

6. **`docs/dev-notes.md`** — add: `**Active:** Service worker exception — `public/sw.js` is the only non-TypeScript file in `src/`. Documented exception per Wave 30. Migrating to TS workbox build is Wave 32 (subsume + delete this file).`

7. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 30 (Push + Email Notifications)'`, `last_completed: 'Wave 30'`, `spec_version: '1.15.0'`.
   - `wave_30_highlights:` listing 3 tables, 4 edge functions, the dispatch state machine, the pg_cron-disabled note, the service-worker exception.

8. **`CLAUDE.md`**:
   - Tables list: add `notification_preferences`, `notification_log`, `push_subscriptions`.
   - Environment: add `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`.
   - New "Cron Jobs / Scheduled Tasks" subsection: cross-link `docs/operations/edge-function-schedules.md` and note that `pg_cron` is intentionally NOT enabled.
   - "Conventions": one-line note: "Service worker (`public/sw.js`) is the documented JS exception, slated for TS conversion in Wave 32."

9. **`.env.example`** — add `VITE_VAPID_PUBLIC_KEY=` (note: only the public key is in the example; private and subject are server secrets).

Land docs as `docs(wave-30): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **End-to-end manual smoke** — sign up a brand new user → confirm a `notification_preferences` row appears via the bootstrap trigger. Subscribe to push from Settings → confirm a `push_subscriptions` row lands. Comment with `@thisuser` from another account → wait one cron tick → email arrives + push fires.
2. **Quiet hours** — set quiet hours covering "now" → trigger a notification → dispatcher skips both transports + logs `error = 'quiet_hours'`.
3. **Stale push subscription** — manually delete the browser subscription via DevTools → Application → Service Workers → unregister → trigger a push → dispatcher DELETEs the row on 410.
4. **State machine idempotency** — manually invoke `dispatch-notifications` twice in quick succession → no duplicate emails / pushes per pending row.
5. **Cron schedule doc** — open `docs/operations/edge-function-schedules.md` and verify the four schedules are listed with the operator's chosen scheduler.
6. **No FSD drift** — `usePushSubscription` lives in `features/settings/hooks/`; `comment-mentions.ts` extension stays in `features/tasks/lib/`.
7. **Service-worker exception is documented** — comment header in `public/sw.js`; entry in `dev-notes.md`.
8. **Type drift** — `database.types.ts` hand-edited cleanly; do not regen.
9. **Test-impact reconciled** — `Testing/test-utils/mocks/service-worker.ts` + `notification-api.ts` installed and called from `setupTests.ts`; existing `useTaskComments.test.tsx` (Wave 26) still green (resolveMentions falls through on RPC mock failure); no `it.skip`. Test count ≥ baseline + new tests.
10. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 (HALT on any failure).

## Commit & Push to Main (mandatory — gates Wave 31)

After all three task PRs and the docs sweep merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits: 3 task commits + 1 docs sweep on top of Wave 29.
3. `git push origin main`. CI green.
4. **Do not start Wave 31** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4. If any check fails, STOP — do not push, do not advance.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean. FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean
```

## Key references

- `CLAUDE.md` — conventions
- `.gemini/styleguide.md` — strict typing, FSD, Tailwind, optimistic-rollback (the **service worker JS exception** is the only carve-out, scoped to `public/sw.js` only; documented in dev-notes)
- `docs/architecture/notifications.md` — created in Task 3
- `supabase/functions/_shared/email.ts` — Wave 22 Resend wrapper to extend
- `supabase/functions/supervisor-report/{index.ts,README.md}` — precedent for an edge function that loads prefs + dispatches via Resend
- `supabase/functions/nightly-sync/README.md` — explains the `pg_cron` not-enabled stance + scheduling alternatives
- `src/features/tasks/components/TaskComments/CommentComposer.tsx` — Wave 26 host for mention resolution
- Web Push API docs — `https://developer.mozilla.org/en-US/docs/Web/API/Push_API`
- `web-push` Deno ESM at `https://esm.sh/web-push@3.6.7` (verify URL works at write time)

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror three new migrations)
- `docs/architecture/auth-rbac.md` (Notification Preferences section)
- `docs/AGENT_CONTEXT.md` (Wave 30 golden path)
- `docs/dev-notes.md` (service-worker TS exception entry)
- `src/shared/db/database.types.ts` (3 new tables)
- `src/shared/db/app.types.ts` (NotificationPreferencesRow, NotificationLogRow, NotificationPreferencesUpdate)
- `src/shared/api/planterClient.ts` (`notifications.*`, `entities.PushSubscription`)
- `src/pages/Settings.tsx` (Notifications tab)
- `src/features/tasks/lib/comment-mentions.ts` (extend with `resolveMentions`)
- `src/features/tasks/components/TaskComments/CommentComposer.tsx` (call `resolveMentions` before persist)
- `supabase/functions/_shared/email.ts` (add `renderOverdueDigestEmail`)
- `spec.md` (flip §3.7 Push & Email, bump to 1.15.0)
- `repo-context.yaml` (Wave 30 highlights)
- `CLAUDE.md` (tables, env, cron jobs subsection, JS exception note)
- `.env.example` (VAPID public key)

**Will create:**
- `docs/db/migrations/2026_04_18_notification_preferences.sql`
- `docs/db/migrations/2026_04_18_push_subscriptions.sql`
- `docs/db/migrations/2026_04_18_comment_mention_dispatch.sql`
- `docs/db/tests/notification_prefs_bootstrap.sql`
- `docs/architecture/notifications.md`
- `docs/operations/edge-function-schedules.md`
- `public/sw.js` (with documented JS exception header)
- `src/features/settings/hooks/useNotificationPreferences.ts`
- `src/features/settings/hooks/usePushSubscription.ts`
- `supabase/functions/dispatch-push/{index.ts,README.md}`
- `supabase/functions/dispatch-notifications/{index.ts,README.md}`
- `supabase/functions/overdue-digest/{index.ts,README.md}`
- Tests under `Testing/unit/...` mirroring source paths (~7 new test files)

**Explicitly out of scope this wave:**
- Notification snooze / batching
- Per-project preference overrides
- In-app inbox / bell icon (Wave 33 maybe)
- SMS / Slack / Discord transports
- iOS Safari push without PWA install (Wave 32 unblocks)
- pg_cron enablement

## Ground Rules

TypeScript only across `src/` — **with one documented exception**: `public/sw.js`. No barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; no raw date math (digest day-of-week comparison goes through `Intl.DateTimeFormat` with the user's `timezone`); no direct `supabase.from()` in components — Notification settings UI uses `planter.notifications.*` and `planter.entities.PushSubscription.*`; Tailwind utility classes only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; optimistic mutations must force-refetch in `onError`; max subtask depth = 1; template vs instance N/A this wave; **one new dep allowed: `web-push` (Deno ESM URL pinned at `https://esm.sh/web-push@3.6.7`)**; atomic revertable commits; build + lint + tests clean before every push; DB migrations are additive-only; **`pg_cron` MUST NOT be enabled in this wave** — schedule via Supabase Dashboard's Scheduled Triggers or external; document the schedule choice in each new function's README.
