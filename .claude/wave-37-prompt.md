## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 36 shipped to `main`:
- Zoho CRM read-only sync (Deals → Projects, Contacts → People)
- AWS S3 presigned-URL uploads for large task resources
- Per-user signed ICS calendar feeds
- Generic webhook subscriber with HMAC signing + retry/backoff/auto-deactivate

Spec is at **1.21.0**. The functional roadmap is **complete** — every `[ ]` in §3.1–§3.8 is `[x]`. The remaining work in this planning suite is two-fold:

- **Wave 37 (this wave): close every architecture-doc known-gap that's been deferred over the prior waves.** These are smaller, technically-debt-shaped items that didn't justify a wave each but together close the documentation's "Known Gaps" inventory.
- **Wave 38: final QA + release readiness for the 1.0.0 cutover.**

The known-gaps list this wave attacks (sourced from `docs/architecture/*.md` + `docs/dev-notes.md` + `repo-context.yaml`):

1. **`date-engine.md`**: Algorithms for auto-adjusting dates currently lack logic for skipping weekends and regional holidays.
2. **`team-management.md`**: Escrowing permissions/invites for emails that do not yet have an active Supabase App User account requires extensive flow testing.
3. **`library-templates.md`**: Versioning of templates — currently, if an Admin updates a Template, existing Projects created from it are not updated (intended), but tracking the original template version on the Project instance is missing.
4. **`projects-phases.md`**: Template Immutability — Logic to prevent users from deleting specific items that originated from a Master Template (allowing deletion only for custom post-instantiation additions) is not yet fully enforced.
5. **`repo-context.yaml` health metrics**: Virtualization needed for 1000+ tasks (medium tech-debt).

**Test baseline going into Wave 37:** Wave 36 shipped at ≥770 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress. This wave adds no new functional surfaces — just hardening — so the test count delta is modest (~30-50 new tests).

## Pre-flight verification (run before any task)

1. `git log --oneline` includes the 4 Wave 36 commits + docs sweep.
2. **CRITICAL**: `public.project_invites` already exists in the schema with columns `id, project_id, email, role, token, created_at, expires_at` (per Wave 23 schema map). Wave 37 Task 2 **extends** this table — does NOT create a new `pending_invites` table. Verify via `\d public.project_invites` in psql before starting Task 2.
3. Wave 34 added `public.organizations` and `tasks.organization_id` — Wave 37 Task 1 (holiday calendars) FK-references `organizations`.
4. The existing tasks-table columns: `is_locked`, `prerequisite_phase_id`, `task_type` (Wave 25), `template_version` (NOT YET — Task 3 adds), `cloned_from_task_id` (NOT YET — Task 4 adds).
5. The existing `clone_project_template` RPC exists and has the signature `(p_template_id uuid, p_new_parent_id uuid, p_new_origin text, p_user_id uuid, p_title text DEFAULT NULL, p_description text DEFAULT NULL, p_start_date date DEFAULT NULL, p_due_date date DEFAULT NULL)` per Wave 23 schema map. Tasks 3 + 4 modify this RPC carefully (preserve signatures).
6. `react-virtuoso` is NOT yet a dependency. Task 5 adds it.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-37-date-engine-weekends-holidays`
- Task 2 → `claude/wave-37-invite-escrow`
- Task 3 → `claude/wave-37-template-versioning`
- Task 4 → `claude/wave-37-template-immutability`
- Task 5 → `claude/wave-37-task-virtualization`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 37 scope

Five tasks, each closing one documented known-gap. The wave is broad but each task is intentionally tight — no task should produce a PR over ~500 LOC.

---

### Task 1 — Weekends + holidays in the date engine

**Commit:** `feat(wave-37): date-engine skips weekends + per-org holiday calendars`

1. **Per-org holiday calendar** (`docs/db/migrations/2026_04_18_holiday_calendars.sql`, NEW)
   - `CREATE TABLE public.holiday_calendars (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, label text NOT NULL, country_code text, start_date date NOT NULL, end_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`.
   - `UNIQUE (organization_id, start_date, end_date, label)`.
   - Index on `(organization_id, start_date)`.
   - **Seed common US/Canada holidays** for 2026-2027 in the default `planterplan` org via the migration (Christmas, New Year's, Independence Day, etc.). Don't seed for other orgs — they configure their own.
   - RLS: SELECT for any org member; INSERT/UPDATE/DELETE for `org_admin` or global admin.
   - Mirror into `docs/db/schema.sql`.

2. **Date engine carve-out** (`src/shared/lib/date-engine/index.ts`)
   - New helper `addBusinessDays(startIso: string, days: number, holidays: HolidaySet): string` — adds N days, skipping weekends and any date in the holiday set.
   - New helper `nextBusinessDay(iso: string, holidays: HolidaySet): string` — advances to the next non-weekend, non-holiday day if currently on one.
   - **`recalculateProjectDates` opt-in**: a new `{ skipWeekendsAndHolidays?: boolean }` parameter (default false to preserve current behavior). When true, date shifts use the new `addBusinessDays` instead of `addDaysToDate` (the existing date-engine export — `addDays` does not exist). Caller (`EditProjectModal`) reads a per-project setting `settings.skip_weekends_and_holidays` (boolean, default false).

3. **Settings UI** (`src/features/projects/components/EditProjectModal.tsx`)
   - New checkbox "Skip weekends + holidays when shifting dates" gated to project owner. Default OFF for backward compat.
   - Tooltip explains: "When enabled, project date shifts will skip Saturdays, Sundays, and your organization's configured holidays."

4. **Org holiday admin UI** (`src/pages/admin/AdminHolidayCalendars.tsx`, NEW + linked from `AdminLayout` if global-admin OR from `AdminOrganizationDetail` if org-admin)
   - List per-org holidays. Add/edit/delete entries.
   - "Import from country" dropdown that auto-populates a year of national holidays for `country_code` (use a small hardcoded JSON of common-country holiday lists in `src/shared/constants/holiday-presets.ts`).

5. **Architecture doc** (`docs/architecture/date-engine.md`)
   - Flip the "Algorithms for auto-adjusting dates currently lack logic for skipping weekends and regional holidays" known-gap to **Resolved (Wave 37)**.
   - Document the opt-in nature, the per-org holiday store, and the BC-preserving default.

6. **Tests**
   - `Testing/unit/shared/lib/date-engine/business-days.test.ts` (NEW) — `addBusinessDays` covers: skip weekend boundary; skip multi-day holiday range; backward day count; holidays empty set fallback to weekends only; consecutive holidays.
   - `Testing/unit/features/projects/components/EditProjectModal.weekendsHolidays.test.tsx` (NEW) — checkbox toggles `settings.skip_weekends_and_holidays`; date shifts route through `addBusinessDays` when enabled.

**DB migration?** Yes — one table.

**Out of scope:** Per-task holiday override (deferred — opt-in is at project level for v1). Recurring annual holidays (each year is a fresh entry; auto-rolling deferred). Half-day holidays.

---

### Task 2 — Invite escrow for non-yet-signed-up emails

**Commit:** `feat(wave-37): pending invite escrow + auto-claim on user signup`

**CRITICAL CONTEXT**: the `public.project_invites` table **already exists** (per Wave 23 schema map: `id, project_id, email, role, token, created_at, expires_at` with `expires_at = now() + 7 days`). It's used by the existing `invoke_user_to_project()` RPC + the Wave 30-era `invite-by-email` edge function. **Do NOT create a new `pending_invites` table** — extend `project_invites` instead.

1. **Migration** (`docs/db/migrations/2026_04_18_invite_escrow.sql`, NEW). Use this exact DDL:

```sql
-- Migration: Wave 37 — extend project_invites for escrow + auto-claim
-- Date: 2026-04-18
-- Description:
--   Adds claim tracking to the existing `project_invites` table so invites sent
--   to emails not yet in `auth.users` survive past their original 7-day expiry,
--   and an AFTER INSERT trigger on `auth.users` auto-claims pending invites
--   matching the new user's email.
--
--   The existing 7-day expiry default is bumped to 90 days for new escrowed
--   rows (existing rows untouched). Email-existence at invite time is checked
--   by the invite-by-email edge function (not the DB) — this migration is
--   purely structural.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_claim_pending_invites_on_signup ON auth.users;
--   DROP FUNCTION IF EXISTS public.claim_pending_invites_on_signup();
--   ALTER TABLE public.project_invites DROP COLUMN IF EXISTS claimed_at;
--   ALTER TABLE public.project_invites DROP COLUMN IF EXISTS claimed_by;
--   -- expires_at default change is forward-only; old rows already have 7-day defaults applied at insert time

ALTER TABLE public.project_invites
  ADD COLUMN claimed_at timestamptz,
  ADD COLUMN claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Bump the default expiry on NEW rows from 7 days to 90 days
ALTER TABLE public.project_invites
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');

-- Case-insensitive lookup index
CREATE INDEX IF NOT EXISTS idx_project_invites_email_lower
  ON public.project_invites (lower(email))
  WHERE claimed_at IS NULL;

-- AFTER INSERT trigger on auth.users — auto-claim
CREATE OR REPLACE FUNCTION public.claim_pending_invites_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  FOR v_invite IN
    SELECT id, project_id, role
    FROM public.project_invites
    WHERE lower(email) = lower(NEW.email)
      AND claimed_at IS NULL
      AND expires_at > now()
  LOOP
    -- Add to project_members (idempotent on (project_id, user_id))
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (v_invite.project_id, NEW.id, v_invite.role)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Mark the invite claimed
    UPDATE public.project_invites
    SET claimed_at = now(), claimed_by = NEW.id
    WHERE id = v_invite.id;

    -- Enqueue a "you were added" notification (cheap; deduped by user_id+payload)
    INSERT INTO public.notification_log (user_id, channel, event_type, payload)
    VALUES (NEW.id, 'email', 'invite_claimed', jsonb_build_object('project_id', v_invite.project_id, 'role', v_invite.role));
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_invites_on_signup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_invites_on_signup() TO authenticated;

CREATE TRIGGER trg_claim_pending_invites_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.claim_pending_invites_on_signup();

-- RLS additions for invitee SELECT (existing policies stay intact)
CREATE POLICY "Invites: invitee can see own pending"
ON public.project_invites
FOR SELECT
TO authenticated
USING (
  claimed_at IS NULL
  AND lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);

CREATE POLICY "Invites: invitee can delete own pending"
ON public.project_invites
FOR DELETE
TO authenticated
USING (
  claimed_at IS NULL
  AND lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);
```

Mirror everything (column adds, default change, index, function, trigger, two new policies) into `docs/db/schema.sql`. The existing `project_invites` policies (`"Create invites for project members"`, `"Delete invites for project members"`, `"View invites for project members"` — owner/editor scope) stay untouched.

**Generated types** — extend the existing `project_invites` block in `src/shared/db/database.types.ts`:

```ts
project_invites: {
  Row: {
    // ... existing columns ...
    claimed_at: string | null
    claimed_by: string | null
  }
  Insert: { /* same with claimed_at?, claimed_by? */ }
  Update: { /* same */ }
  // ... Relationships unchanged ...
}
```

2. **Updated invite flow** (`supabase/functions/invite-by-email/index.ts` — already exists)
   - When the invitee email is NOT in `auth.users`, instead of failing, INSERT into `project_invites` (the existing table) and dispatch the email with a "Sign up to claim your invite to ___" message + signup link. The 90-day expiry default kicks in automatically.
   - When the invitee IS in `auth.users`, behavior unchanged (insert into `project_members` directly via existing path).

3. **Auto-claim trigger on signup** — already in the migration above.

4. **Settings → Pending Invites surfacing** (`src/pages/Settings.tsx`)
   - When the user has any unclaimed `project_invites` matching their email (RLS auto-filters via the new SELECT policy), show a small banner / new section in Profile tab listing them with "Accept" (auto-claim already fires on signup; this is for invites sent AFTER signup) / "Reject" (DELETE via the new policy) buttons.
   - Owner-side: extend the existing Team management UI in `src/pages/Team.tsx` (or wherever invite management lives — verify by grepping for `project_invites`) to filter pending vs. claimed.

5. **Architecture doc** (`docs/architecture/team-management.md`)
   - Flip the "Escrowing permissions/invites for emails that do not yet have an active Supabase App User account requires extensive flow testing" known-gap to **Resolved (Wave 37)**. Document the column additions, the auto-claim trigger, the 90-day expiry, and the invitee-side SELECT/DELETE RLS policies.

6. **Tests**
   - `Testing/unit/supabase/functions/invite-by-email.escrow.test.ts` (NEW) — non-existent-email path inserts into `project_invites`; existing-email path unchanged.
   - Manual `psql` smoke at `docs/db/tests/invite_escrow_claim.sql` — pending invite for `alice@x.com` exists with `claimed_at IS NULL`; sign up `alice@x.com` → `project_members` row materializes; `project_invites.claimed_at` populates; `notification_log` row appears.

**DB migration?** Yes — column adds + default change + index + trigger function + trigger + 2 new RLS policies. All additive (existing columns + policies untouched).

**Out of scope:** Pending invites scoped to `organization_id` (Wave 34 added orgs but Wave 37 invite-escrow stays per-project; org-scoped invites are a Wave 38+ polish). Resending pending-invite emails on a cron schedule (manual resend only).

---

### Task 3 — Template versioning

**Commit:** `feat(wave-37): stamp template version on cloned instances + admin version log`

1. **Migration** (`docs/db/migrations/2026_04_18_template_versioning.sql`, NEW)
   - Add column `template_version int NOT NULL DEFAULT 1` to `public.tasks` (only meaningful on `origin = 'template'` rows).
   - On every UPDATE to a template task (text/structure changes), increment `template_version`. Trigger: `BEFORE UPDATE ON public.tasks WHEN OLD.origin = 'template' AND NEW.origin = 'template'` and any of `(title, description, days_from_start, duration, settings)` changed → `NEW.template_version = OLD.template_version + 1`.
   - Stamp the cloned root with the source template's version: in the `clone_project_template` RPC (existing), when cloning, copy `source.template_version` into the cloned root's `settings.cloned_from_template_version`.
   - **Don't** propagate updates to existing instances (intended behavior per the architecture doc) — this wave just makes the version trackable.
   - Mirror into `docs/db/schema.sql`.

2. **Admin Templates UI** (`src/pages/admin/AdminTemplates.tsx` — extend existing or NEW if absent)
   - Show `template_version` in the template list.
   - Per-instance view (drilldown): "Projects cloned from this template" list with each instance's `cloned_from_template_version` so admins can spot stale clones.

3. **Architecture doc** (`docs/architecture/library-templates.md`)
   - Flip "Versioning of templates" known-gap to **Resolved (Wave 37)**. Document the trigger + the stamp on clone + the deliberate non-propagation.

4. **Tests**
   - `Testing/unit/shared/api/planterClient.template.versioning.test.ts` (NEW) — `Task.update` on a template increments version; `Task.clone` stamps `settings.cloned_from_template_version`.
   - Manual `psql` smoke at `docs/db/tests/template_versioning.sql` — increment behavior + clone stamp.

**DB migration?** Yes — one column + one trigger + one RPC modification.

**Out of scope:** UI to "update this project to the latest template version" (deferred — would require a complex three-way merge; intentional non-propagation per architecture doc). Per-task versioning (only template-roots get version stamps — sub-task versioning is too granular for v1).

---

### Task 4 — Template immutability (origin tracking on cloned tasks)

**Commit:** `feat(wave-37): track template-origin on cloned tasks + UI guard against deletion`

1. **Migration** (`docs/db/migrations/2026_04_18_task_template_origin.sql`, NEW)
   - Add column `cloned_from_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL` to `public.tasks`. Stamped during `clone_project_template`. NULL means "post-instantiation custom addition".
   - Index on `cloned_from_task_id`.
   - Modify `clone_project_template` RPC: every cloned task carries the source task's id in `cloned_from_task_id`.
   - Backfill: NULL for all existing rows (we don't have provenance for them; document this in the migration header).
   - Mirror into `docs/db/schema.sql`.

2. **App-side delete guard** (`src/features/tasks/components/TaskDetailsView.tsx`, `src/features/tasks/hooks/useTaskMutations.ts`)
   - When the user attempts to delete a task with `cloned_from_task_id IS NOT NULL` AND they are NOT the project owner: surface a modal: "This task originated from the project template. Only the project owner can delete template-origin tasks." Cancel / "Delete anyway" (owner-only).
   - When the user IS the owner: proceed without the modal (owners can delete anything).

3. **Visual indicator** (`src/features/tasks/components/TaskItem.tsx`)
   - Subtle "T" badge on rows with `cloned_from_task_id IS NOT NULL` — tooltip: "From template".

4. **Architecture doc** (`docs/architecture/projects-phases.md`)
   - Flip the "Template Immutability" known-gap to **Resolved (Wave 37)**. Document the new column + the UI gate + the owner-bypass.

5. **Tests**
   - `Testing/unit/features/tasks/components/TaskDetailsView.deleteGuard.test.tsx` (NEW) — modal appears for non-owners on template-origin tasks; bypassed for owners; not shown on custom additions.
   - Manual `psql` smoke at `docs/db/tests/task_template_origin.sql` — clone a project; every task has `cloned_from_task_id` populated. Add a custom task; `cloned_from_task_id IS NULL`.

**DB migration?** Yes — one column + RPC modification.

**Out of scope:** Server-side enforcement of the delete restriction (the UI gate is enough for v1; a server-side guard would require a per-row policy that's brittle — the owner-bypass behavior is more naturally expressed in app code). Tracking edits to template-origin tasks (deferred — only deletion is gated for v1).

---

### Task 5 — Task-tree virtualization for 1000+ tasks

**Commit:** `perf(wave-37): virtualize TaskList for projects with 500+ tasks`

1. **Library** — add `react-virtuoso`. One new dep, motivated in PR (TanStack-Table-friendly virtual scroller; well-maintained; small bundle ~15 KB; alternative `react-window` evaluated and rejected because Virtuoso handles dynamic-height rows better, which is the common case in PlanterPlan's task tree).

2. **Virtualized list wrapper** (`src/features/tasks/components/TaskList.virtualized.tsx`, NEW)
   - When the project has >500 tasks total, swap the standard `TaskList` render path for the Virtuoso-backed one.
   - Same row component (`TaskItem.tsx`); just hosted inside `Virtuoso`'s `itemContent` callback.
   - Drag-and-drop reordering still works via dnd-kit's auto-scroll within the Virtuoso scroll container; verify with manual smoke.

3. **Threshold check** (`src/features/tasks/components/TaskList.tsx`)
   - At the top of `TaskList`, count the flattened tree size; if >500, render `TaskList.virtualized.tsx`; else render the existing path. This keeps the small-project rendering identical.

4. **Architecture doc** (`repo-context.yaml`)
   - Flip the `health_metrics.technical_debt.medium: ["Virtualization needed for 1000+ tasks"]` entry to `low` or remove entirely; replace with: `"Virtualization shipped Wave 37 for projects ≥500 tasks via react-virtuoso"`.

5. **Tests**
   - `Testing/unit/features/tasks/components/TaskList.virtualized.test.tsx` (NEW) — virtualized path renders for >500 tasks; standard path renders for <500.
   - **Performance smoke** documented in PR: seed a project with 1500 tasks via SQL; render time should be <200ms on a baseline laptop. Use the Performance tab to capture.

**DB migration?** No.

**Out of scope:** Virtualizing the gantt chart (Wave 28's gantt-task-react has its own virtualization). Virtualizing the comment list (Wave 26 — most tasks have <50 comments; deferred). Virtualizing the activity log (Wave 27 — paginated already).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — no roadmap items to flip (Wave 36 closed the last). However, append a short note in §3.8 "Technical Hardening & Infrastructure": "Wave 37 closed every architecture-doc known-gap (date-engine weekends/holidays, invite escrow, template versioning, template immutability, task-list virtualization)." Bump version to **1.22.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Hardening Pass (Wave 37)" golden-path bullet listing the five subsurfaces.
3. **`docs/architecture/date-engine.md`** — weekends/holidays gap → Resolved.
4. **`docs/architecture/team-management.md`** — invite-escrow gap → Resolved.
5. **`docs/architecture/library-templates.md`** — template-versioning gap → Resolved.
6. **`docs/architecture/projects-phases.md`** — template-immutability gap → Resolved.
7. **`docs/dev-notes.md`** — confirm currency. Add: "**Resolved (Wave 37):** every architecture-doc known-gap closed. Active list is now empty for the first time since Wave 16."
8. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 37 (Hardening + Gap Closures)`, update `last_completed`, `spec_version`, add `wave_37_highlights:` block. Update `health_metrics` to remove the virtualization tech-debt entry.
9. **`CLAUDE.md`** — add `holiday_calendars` to Tables. **DO NOT** add a `pending_invites` row — `project_invites` (existing) gained the `claimed_at`/`claimed_by` columns; update its description in CLAUDE.md to reflect that. New "Performance" subsection: virtualization threshold (>500 tasks). Note the new `template_version` and `cloned_from_task_id` columns on `tasks`.

Land docs as `docs(wave-37): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Date engine BC** — open an existing project (no holiday opt-in) → make a date shift → behavior identical to pre-Wave-37 (no skipping). Toggle the opt-in → repeat → dates skip weekends + configured holidays.
2. **Invite escrow** — invite `alice@x.com` (not in auth.users) → `project_invites` row with `claimed_at IS NULL` + 90-day `expires_at`. Sign up as `alice@x.com` → `project_members` row materializes; `project_invites.claimed_at` populates.
3. **Template versioning** — edit a template → `template_version` increments. Clone → `settings.cloned_from_template_version` matches the new version. Edit again → existing instance's stamp does NOT update (intentional).
4. **Template immutability** — clone a project → every task has `cloned_from_task_id`. As editor (not owner), attempt to delete a template-origin task → modal blocks. As owner → proceeds.
5. **Virtualization** — seed 1500 tasks; open the project → renders smoothly; scroll to bottom → DOM has only ~30 rendered rows. Drag-drop still works.
6. **No FSD drift** — every new file lives in the right slice. Helpers in `lib/`, hooks in `hooks/`, components in `components/`. No barrel files. No `shared/` → `features/` imports.
7. **Type drift** — `database.types.ts` hand-edited cleanly across the four migrations.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 38)

After all five Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 5 task commits + 1 docs sweep commit on top of Wave 36.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 38** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npm test          # baseline + new tests
git status        # clean
```

Manual smoke per Wave Review.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/date-engine.md` — Task 1 host
- `docs/architecture/team-management.md` — Task 2 host
- `docs/architecture/library-templates.md` — Task 3 host
- `docs/architecture/projects-phases.md` — Task 4 host
- `repo-context.yaml` — Task 5 health-metrics update
- `src/shared/lib/date-engine/index.ts` — Task 1 surface
- `supabase/functions/invite-by-email/` — Task 2 surface
- `src/shared/api/planterClient.ts` (`Task.clone`) — Tasks 3 + 4 hooks
- `src/features/tasks/components/TaskList.tsx` — Task 5 surface

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror four new migrations)
- `docs/architecture/date-engine.md` / `team-management.md` / `library-templates.md` / `projects-phases.md` (4 known-gaps → Resolved)
- `docs/AGENT_CONTEXT.md` (Wave 37 golden path)
- `docs/dev-notes.md` (active list now empty)
- `src/shared/db/database.types.ts` (multiple new tables + columns)
- `src/shared/db/app.types.ts` (corresponding row types + helpers)
- `src/shared/api/planterClient.ts` (template clone version stamping)
- `src/shared/lib/date-engine/index.ts` (`addBusinessDays`, `nextBusinessDay`)
- `src/features/projects/components/EditProjectModal.tsx` (weekends/holidays opt-in)
- `src/features/tasks/components/TaskList.tsx` (virtualization threshold)
- `src/features/tasks/components/TaskDetailsView.tsx` (delete guard)
- `src/features/tasks/components/TaskItem.tsx` (template badge)
- `src/pages/Settings.tsx` (Pending Invites tab)
- `src/pages/admin/AdminLayout.tsx` (Holiday Calendars + extended Templates link)
- `package.json` (one new dep: react-virtuoso)
- `spec.md` (§3.8 hardening note, bump to 1.22.0)
- `repo-context.yaml` (Wave 37 highlights + health-metrics update)
- `CLAUDE.md` (Tables + Performance subsection)

**Will create:**
- `docs/db/migrations/2026_04_18_holiday_calendars.sql`
- `docs/db/migrations/2026_04_18_invite_escrow.sql`
- `docs/db/migrations/2026_04_18_template_versioning.sql`
- `docs/db/migrations/2026_04_18_task_template_origin.sql`
- `docs/db/tests/invite_escrow_claim.sql`
- `docs/db/tests/template_versioning.sql`
- `docs/db/tests/task_template_origin.sql`
- `src/features/tasks/components/TaskList.virtualized.tsx`
- `src/pages/admin/AdminHolidayCalendars.tsx`
- `src/shared/constants/holiday-presets.ts`
- Tests under `Testing/unit/...` (~7 new test files)

**Explicitly out of scope this wave:**
- Per-task holiday override
- Recurring annual holiday auto-roll
- Pending-invite resend cron
- Per-org pending-invite scoping
- Template "update this project to latest version" UI
- Server-side enforcement of template-origin delete (UI gate only for v1)
- Virtualizing comment lists / activity logs (deferred)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (Task 1's new business-day helpers ARE the date math; everything else routes through them); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work — Tasks 3 + 4 are this wave's most cross-cutting work and depend on the `origin` field everywhere; only add dependencies if truly necessary (Wave 37 adds **one**: `react-virtuoso`); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only.
