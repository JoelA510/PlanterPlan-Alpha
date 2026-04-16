## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

The build is clean as of Wave 20. Branch `claude/wave-20-qa-gate-H8JaP` is green (`npm test` → 423/423 passing, `npm run build` clean) and ready to merge. Wave 21 begins after that PR lands on `main`.

**Wave 20 recap** (shipped on `claude/wave-20-qa-gate-H8JaP`, pending merge):
- §3.3 **Kanban Board V2** — native column-to-column drag-and-drop in `src/features/tasks/components/board/` (`BoardColumn.tsx`, `BoardTaskCard.tsx`, `ProjectBoardView.tsx`). `deriveUrgency` helper extracted into `src/shared/lib/date-engine/index.ts`.
- §3.3 **Nightly CRON status transitions** — `supabase/functions/nightly-sync/index.ts` now transitions tasks across `not_started → in_progress → due_soon → overdue` based on per-project `settings.due_soon_threshold`. README documents the cron contract.
- §3.6 **Project Status Report** — `src/pages/Reports.tsx` now has a reporting-month picker and lists of completed / overdue / upcoming milestones. Data sourced from extended `useProjectReports` (`src/features/projects/hooks/useProjectReports.ts`).
- §3.6 **Task List Views & Filters** — `/tasks` (`src/pages/TasksPage.tsx`) now supports filtered views (Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All, Milestones, My Tasks) with chronological/alphabetical sorting, powered by the new `useTaskFilters` hook (`src/features/tasks/hooks/useTaskFilters.ts`).
- Docs fix — `docs/architecture/date-engine.md` Overdue definition corrected to dual-signal (`is_complete` OR `status === 'completed'`) to match the Wave 19 hardening.

**Test baseline going into Wave 21: ≥423 passing across 30 suites.** Do not regress.

## Wave 21 cleanup pass (run first, before any new feature code)

These items close out Wave 20 bookkeeping that the feat commits deferred. Land them as a single `chore:` or `docs:` commit at the start of the wave.

1. **Spec close-out** (`spec.md`):
   - Flip `§3.3 Nightly CRON job ...` from `[ ]` to `[x]` and append a short note referencing `supabase/functions/nightly-sync/`.
   - Flip `§3.6 Project Status Report` from `[ ]` to `[x]` and reference `src/pages/Reports.tsx` + `useProjectReports`.
   - Flip `§3.6 Task List Views & Filters` from `[ ]` to `[x]` and reference `TasksPage.tsx` + `useTaskFilters`.
   - Bump the header from `Version 1.5.0 (Wave 18 — ...)` to `Version 1.6.0 (Wave 20 — Reports, Task Views & Nightly CRON)` with today's `Last Updated` date.
2. **AGENT_CONTEXT sync** (`docs/AGENT_CONTEXT.md`):
   - Add `useTaskFilters` to the tasks-domain hooks map.
   - Note the extended `Reports.tsx` month-picker + milestone lists in the routes section.
   - Note the nightly-sync function now owns urgency-status transitions (link to `supabase/functions/nightly-sync/README.md`).
   - If the golden paths list mentions the old board math, replace it with the Kanban V2 file paths.
3. **Architecture doc check** (`docs/architecture/*.md`):
   - `tasks-subtasks.md`: confirm Kanban V2 is reflected in any state-machine or DnD notes.
   - `date-engine.md`: confirm the new nightly-sync transition sequence is noted under Integration Points.
   - `dashboard-analytics.md`: if it references the old report surface, update to match the new Reports page.
4. **Verification gate** before shipping cleanup: `npm run lint` → 0 errors, `npm run build` → clean, `npm test` → ≥423 passing, `git status` → clean.

Once cleanup is green, commit and push, then proceed to Task section.

## Task

Pick up the following roadmap items in priority order. Do the smallest change that satisfies each one — no drive-by refactors (per `.gemini/styleguide.md` §2). Stop and hand back if the scope grows materially.

1. **§3.6 Supervisor Reports** — Add a `supervisor_email` field to project setup (extend `EditProjectModal` / create flow) and auto-dispatch the Wave 20 Status Report on the 2nd of each month. Reuse the existing Supabase Edge Function pattern from `supabase/functions/nightly-sync/` (pg_cron scheduled at day-of-month = 2). Key files: `src/features/projects/components/EditProjectModal.tsx`, `src/shared/db/app.types.ts`, `supabase/functions/` (new `supervisor-report/index.ts`), `docs/db/schema.sql` (new column + migration). Consistency plan required — touching schema.

2. **§3.3 Automation Engine — Recurring Tasks** — Support "Every Monday" / "First of Month" style recurrence by letting the existing `supabase/functions/nightly-sync/` clone a template task into a new instance when its recurrence rule fires. Model the rule as a JSONB field on `tasks.settings` (no new table — follow the `settings.published` precedent). Key files: `src/shared/db/app.types.ts`, `src/features/tasks/components/EditTaskModal.tsx` (recurrence picker), `src/shared/api/planterClient.ts`, `supabase/functions/nightly-sync/index.ts`. Uses `date-engine` — never raw `Date.setDate`.

3. **§3.2 Secondary Projects & Archive Filtering** — Let users toggle between multiple active projects and hide archived/completed ones from the active menu. No schema change — filter on the existing `tasks.status` for root tasks (`parent_task_id = null`). Key files: `src/features/dashboard/hooks/useDashboard.ts` (already uses `PROJECT_STATUS.IN_PROGRESS`), `src/shared/components/` (project switcher UI), `src/pages/Dashboard.tsx`.

4. **§3.3 Task Detail Enhancements** — On the task detail pane, show related tasks in the same milestone and add an "Email task details" action with a saved-address memory (persist to the user profile, not `people`). Key files: `src/features/tasks/components/EditTaskModal.tsx` (or detail pane equivalent), `src/shared/api/planterClient.ts` (sibling-fetch method), `src/shared/contexts/AuthContext.tsx` (profile address memory).

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/db/app.types.ts` — domain types (re-exported from generated Supabase types)
- `src/shared/api/planterClient.ts` — all DB access (never call `supabase.from()` in components)
- `src/shared/lib/date-engine/index.ts` — use for **all** date math (never raw `Date.setDate`)
- `supabase/functions/nightly-sync/` — Wave 20 cron infra to extend, not duplicate

## Ground rules

- **Build after every change**: `npm run build` (tsc -b + vite build) must stay clean — zero tolerance for unused locals/params.
- **Tests**: `npm test` baseline is **≥423 passing**. New features must add unit tests (place under `Testing/unit/...` mirroring the source tree).
- **Lint**: `npm run lint` → zero errors. Do not weaken ESLint rules, do not add `any` (use `unknown` at boundaries).
- **No barrel files** — import directly from source paths.
- **No `.js` or `.jsx`** — TypeScript only.
- **No raw date math** — use `date-engine` helpers.
- **No direct `supabase.from()` in components** — go through `planterClient` + React Query hooks.
- **Tailwind**: utility classes only, no arbitrary values (`w-[17px]` is forbidden), no pure black (`slate-900`/`zinc-900` instead).
- **Optimistic rollback**: every optimistic update must force-refetch in a catch block.
- **Schema changes** (items 1 and 2) require a consistency plan: migration SQL in `docs/db/schema.sql`, RLS policies reviewed against `docs/architecture/auth-rbac.md`, `npm run generate:types` (or equivalent) to refresh `database.types.ts`.
- **Commit hygiene**: atomic, revertable, clear messages (`feat(wave-21): ...`, `chore(wave-21): ...`, `docs(wave-21): ...`). Push to `main` only after all four verification commands pass.
- **Debugging cap**: 5 attempts per failure per `.gemini/styleguide.md` §7; if stuck, report findings and stop.
