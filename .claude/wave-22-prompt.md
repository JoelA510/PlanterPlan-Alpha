## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 21.5 shipped directly to `main`:
- `d9fc2fc feat(wave-21-5): archive filtering + task detail enhancements`
- `b1bf5d6 chore(deps): recover lint + build after dependabot major bumps`

Spec is at **1.8.0**. §3.2 Secondary Projects / Archive filtering and §3.3 Task Detail Enhancements are flipped to `[x]`. `EMAIL_PROVIDER_API_KEY` dispatch is still the open commitment in §6 Backlog (the `TODO(wave-22)` marker in `supabase/functions/supervisor-report/index.ts`).

**Gate baseline going into Wave 22: `npm run lint` → 0 errors (7 pre-existing warnings), `npm run build` clean, `npx vitest run` → 37 files / 483 tests passing.** Do not regress.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-22-supervisor-dispatch`
- Task 2 → `claude/wave-22-library-dedupe`
- Task 3 → `claude/wave-22-coaching-tasks`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 22 scope

Three tasks, each scoped tight. One closes §6 Backlog (explicit Wave 22 commitment), one closes the remaining §3.5 sub-item, and one closes half of §3.3 Specialized Task Types while also clearing the Coach Role Tagging known-gap in `docs/architecture/auth-rbac.md`.

---

### Task 1 — §6 Backlog: wire supervisor-report email dispatch

**Commit:** `feat(wave-22): wire supervisor-report email dispatch via Resend`

Closes the `TODO(wave-22)` marker in `supabase/functions/supervisor-report/index.ts` and the matching §6 Backlog bullet. Flips §3.6 Supervisor Reports away from "log-only" once live.

1. **Provider wrapper** (`supabase/functions/_shared/email.ts`, NEW)
   - Single HTTPS POST against `https://api.resend.com/emails`, using `EMAIL_PROVIDER_API_KEY` and a new `RESEND_FROM_ADDRESS` env var.
   - Export `sendEmail({ to, subject, html, text })` returning a sanitized `{ ok: boolean, id?: string, error?: string }` — no raw upstream error bodies leak to the caller (mirrors the `57081b6` error-sanitization pattern).
   - Export a pure `renderSupervisorReportEmail(payload)` returning `{ subject, html, text }` so the renderer can be unit-tested without hitting Resend.

2. **Dispatch path** (`supabase/functions/supervisor-report/index.ts`)
   - Replace the existing `TODO(wave-22)` no-op with a `sendEmail(...)` call.
   - Accept an optional JSON body `{ project_id?: string, dry_run?: boolean }`. `project_id` scopes the `roots` loop to a single root; `dry_run === true` builds + logs the payload but skips the POST (mirrors today's log-only behaviour).
   - Env fallback unchanged: if `EMAIL_PROVIDER_API_KEY` is unset, stay log-only so production without the key remains a strict no-op.
   - Bump the response shape to include `dispatch_failures` alongside the existing counters so operators can alert on partial delivery.

3. **README** (`supabase/functions/supervisor-report/README.md`)
   - Flip status from "log-only" to "live (Resend)". Document `RESEND_FROM_ADDRESS`, the `project_id` / `dry_run` body, and the new failure counter.

4. **"Send test report" button** (`src/features/projects/components/EditProjectModal.tsx`)
   - Secondary button next to the `supervisor_email` input, disabled until the field is a valid email **and** the modal is editing a saved project root (has `id`).
   - Calls `planter.functions.invoke('supervisor-report', { body: { project_id, dry_run: false } })`. Sonner toast on success / sanitized error.
   - Thin `functions.invoke` passthrough in `src/shared/api/planterClient.ts` — no `supabase.from()` leaking into the component.

5. **Tests**
   - `Testing/unit/supabase/functions/supervisor-report.render.test.ts` (NEW) — pure coverage of `renderSupervisorReportEmail` across completed / overdue / upcoming milestone arrays + the empty-state case.
   - `Testing/unit/features/projects/components/EditProjectModal.testSend.test.tsx` (NEW) — disabled states, invoke payload shape, success + sanitized-error toasts.

**DB migration?** No. New env var only (`RESEND_FROM_ADDRESS`).

**Out of scope:** `people`-table contact pickers, HTML templating beyond the payload we already build, any non-Resend provider.

---

### Task 2 — §3.5 sub-item: hide already-instantiated library tasks

**Commit:** `feat(wave-22): de-dupe library search against tasks already in the project`

Closes the `[ ]` bullet under §3.5 Master Library & Templates ("Intelligently hide library tasks already in the instance, and show topically related tasks"). Wave 22 ships only the *hide-already-present* half — "topically related" is a recommender problem that stays deferred.

1. **Stamp provenance on library copies** (`src/shared/api/planterClient.ts`)
   - Extend `Task.clone` so that after the `clone_project_template` RPC returns the cloned root, it issues a `Task.update` that **merges** `{ spawnedFromTemplate: templateId }` into the existing `settings` JSONB (do not replace — preserve existing keys like `published`, `due_soon_threshold`).
   - Idempotency key mirrors the recurrence pass's `settings.spawnedFromTemplate` convention (`supabase/functions/nightly-sync/index.ts`).

2. **Exclusion in search** (`src/features/library/hooks/useMasterLibrarySearch.ts`)
   - New optional prop `excludeTemplateIds: string[]`. Memoise to a `Set`. After the existing `phasesOnly` / query filter, drop any result whose `id` is in the set.

3. **Combobox forwarding** (`src/features/library/components/MasterLibrarySearch.tsx`)
   - Accept and forward `excludeTemplateIds`. Empty-state copy branches: "No matching templates found." stays the same when the unfiltered list was empty, but becomes "All matching templates are already in this project." when the exclusion drained a non-empty list.

4. **Callers** (`src/features/tasks/components/TaskFormFields.tsx`, `src/features/tasks/components/InlineTaskInput.tsx`, `src/features/tasks/components/TaskForm.tsx`)
   - Derive the active project's `spawnedFromTemplate` id set from the task tree already loaded in `TaskList` (no new network round-trip — lift via prop or via a new memo selector on `useTaskQuery`). Pass through to the combobox.

5. **Tests**
   - `Testing/unit/features/library/hooks/useMasterLibrarySearch.exclude.test.ts` (NEW) — exclusion list filters the expected ids; drained-list empty-state branch.
   - `Testing/unit/shared/api/planterClient.clone.stamp.test.ts` (NEW) — `Task.clone` issues the follow-up update with a merged `settings.spawnedFromTemplate` and preserves prior keys.

**DB migration?** No. Reuses the existing `tasks.settings` JSONB column.

**Known limitation:** instances created before Wave 22 won't carry the stamp, so they will still appear as "available" in the combobox until re-cloned. Call this out in the PR; backfill is not worth a migration.

**Out of scope:** recommender / "topically related" suggestions, any change to the `clone_project_template` RPC itself.

---

### Task 3 — §3.3 Specialized Task Types: Coaching task tagging

**Commit:** `feat(wave-22): coaching task tagging + RLS update policy for coach role`

Closes half of §3.3 Specialized Task Types (the Coaching half — the "Strategy Template" half stays deferred). Also closes the Coach Role Tagging known-gap in `docs/architecture/auth-rbac.md`.

1. **RLS migration** (`docs/db/migrations/2026_04_NN_coaching_task_rls.sql`, NEW)
   - One additive UPDATE policy on `tasks` allowing an authenticated user with `has_project_role(root_id, uid, ARRAY['coach'])` **and** `(settings->>'is_coaching_task')::bool IS TRUE` to update the row.
   - Existing owner/editor/admin policies are **unchanged**. The new policy only widens edit access; it does not narrow anything.
   - Mirror into `docs/db/schema.sql` so the SSoT stays accurate.

2. **Settings shape** (`src/shared/db/app.types.ts`)
   - Extend the documented `TaskSettings` shape with `is_coaching_task?: boolean`, alongside the existing `published`, `recurrence`, `spawnedFromTemplate`, `due_soon_threshold` entries.

3. **Form control** (`src/features/tasks/components/TaskForm.tsx` + `TaskFormFields.tsx`)
   - Shadcn `Checkbox` labeled "Coaching task", visible only to owners/editors (reuse the existing role check that gates other permission-scoped controls).
   - Wire through `react-hook-form` using the existing flat-fields-to-settings normaliser pattern from `src/features/tasks/lib/recurrence-form.ts`, so the form keeps its established data flow and the JSONB merge happens in one place.

4. **Badge** (`src/features/tasks/components/TaskDetailsView.tsx`)
   - Small "Coaching" badge rendered when `settings.is_coaching_task === true` so coaches see at a glance which assigned tasks they may edit.

5. **Architecture doc update** (`docs/architecture/auth-rbac.md`)
   - Flip the "Coach Role Tagging" known-gap to resolved; reference the new RLS policy + `settings.is_coaching_task` flag.

6. **Tests**
   - `Testing/unit/features/tasks/components/TaskForm.coaching.test.tsx` (NEW) — checkbox renders for owner/editor, hidden for coach/viewer, submits the expected payload.
   - `Testing/unit/features/tasks/components/TaskDetailsView.coachingBadge.test.tsx` (NEW) — badge visibility tracks the flag.
   - **RLS smoke test** — manual `psql` check documented in the PR description. No Postgres-level test harness exists in this repo yet; adding one is out of scope.

**DB migration?** Yes — one additive UPDATE policy. No new columns (uses existing JSONB).

**Out of scope:** auto-assignment of coaching tasks to a project Coach on creation (tag-only this wave; revisit alongside the Strategy Template half of §3.3 in a follow-up wave).

---

## Decisions locked in (confirmed during planning)

1. **Email provider → Resend** (single HTTPS POST, no SMTP stack in Deno).
2. **"Send test report" button → shipped** in this wave alongside the dispatch wiring.
3. **Coach auto-assignment → deferred**; Task 3 is tag-only.

---

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # ≥483 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** open any project → set supervisor email → click "Send test report" → success toast; payload appears in Resend dashboard (live) or function logs (dry-run). With `EMAIL_PROVIDER_API_KEY` unset, behaviour degrades cleanly to Wave-21 log-only.
- **Task 2:** add a library phase to a project → re-open "Search Master Library" → that phase no longer appears. Empty-state copy flips correctly when the full result set is drained.
- **Task 3:** as an owner, mark a task as Coaching → log in as a `coach`-role user on the same project → status checkbox is enabled on the tagged task and still disabled on a non-tagged sibling.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/db/app.types.ts` — domain types (re-exported from generated Supabase types)
- `src/shared/api/planterClient.ts` — all DB access (never call `supabase.from()` in components)
- `src/shared/lib/date-engine/index.ts` — use for **all** date math
- `supabase/functions/nightly-sync/index.ts` — precedent for `settings.spawnedFromTemplate` stamping (recurrence pass)
- `supabase/functions/supervisor-report/{index.ts,README.md}` — log-only dispatch surface to promote this wave
- `src/features/projects/hooks/useProjectReports.ts` — keep renderer payload-shape-compatible with this hook

## Critical Files

**Will edit:**
- `supabase/functions/supervisor-report/index.ts`
- `supabase/functions/supervisor-report/README.md`
- `src/shared/api/planterClient.ts` (functions.invoke passthrough + `Task.clone` stamping)
- `src/features/projects/components/EditProjectModal.tsx` (test-send button)
- `src/features/library/hooks/useMasterLibrarySearch.ts`
- `src/features/library/components/MasterLibrarySearch.tsx`
- `src/features/tasks/components/TaskForm.tsx`
- `src/features/tasks/components/TaskFormFields.tsx`
- `src/features/tasks/components/InlineTaskInput.tsx`
- `src/features/tasks/components/TaskDetailsView.tsx`
- `src/shared/db/app.types.ts` (`TaskSettings.is_coaching_task`)
- `docs/db/schema.sql` (mirror new RLS policy)
- `docs/architecture/auth-rbac.md` (Coach Role Tagging resolved)
- `docs/AGENT_CONTEXT.md` (wave-22 golden-path notes)
- `spec.md` (flip §3.5 sub-item + §3.3 Specialized Task Types (Coaching half); move §6 Supervisor dispatch from Backlog to shipped in §3.6; bump to 1.9.0)

**Will create:**
- `supabase/functions/_shared/email.ts`
- `docs/db/migrations/2026_04_NN_coaching_task_rls.sql`
- Unit tests under `Testing/unit/...` mirroring source paths (see each task's Tests section)

**Explicitly out of scope this wave:**
- Strategy Template half of §3.3 Specialized Task Types
- Auto-assignment of coaching tasks to a project Coach on creation
- Recommender / "topically related" library suggestions
- Collaboration Suite (threaded comments, audit log, realtime presence)
- Gantt chart
- PWA / offline mode
- Localization

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; keep `is_complete` and `status === 'completed'` in sync on any new status transitions; template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'`); frontend/Deno recurrence + date helpers stay in lock-step; only add dependencies if truly necessary (motivate in the PR); atomic revertable commits; build + lint + tests all clean before every push.
