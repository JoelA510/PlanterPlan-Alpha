## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read CLAUDE.md for conventions and architecture.

The build is clean as of Wave 19. Before Wave 20 work can begin, a small cleanup pass runs first — see `WAVE_19_CLEANUP_PLAN.md` at the repo root. If that document has not yet been executed and merged, do it before starting anything below.

**Wave 19 recap** (already merged to `main`):
- §3.3 Date Engine — project date shift was already wired (Wave 17); added Sonner toast feedback ("X tasks rescheduled") in EditProjectModal.
- §3.6 Progress Visualization — replaced linear progress bar in ProjectHeader with a recharts donut ring chart.
- §3.5 Template Publishing — added Published/Unpublished toggle for templates using `settings.published` JSONB (no DB migration). API filters in `listTemplates`, `searchTemplates`, and new `listAllVisibleTemplates` method. Hooks call `useAuth()` internally for visibility filtering.
- Docs fix — corrected AGENT_CONTEXT.md §3a depth cap (1, not 4) and documented `reconcileAncestors`/`deriveParentStatus` re-open behavior.

**Wave 19 cleanup pass** (tracked in `WAVE_19_CLEANUP_PLAN.md`, to land before Wave 20):
- Hardened `recalculateProjectDates` to skip tasks completed by either `is_complete` or `status === 'completed'`.
- Added the missing Published toggle + initial `isPublished` state to `CreateTemplateModal` so new templates save `settings.published` explicitly.
- Fixed `useDashboard.activeProjects` to filter by `PROJECT_STATUS.IN_PROGRESS` instead of the nonexistent `'active'` literal.
- Pointed `listAllVisibleTemplates` at `tasks_with_primary_resource` so the master library grid gets primary-resource joins like its sibling methods.
- Backfilled unit tests for the `shiftedCount` return value on `useUpdateProject` and the publish-toggle behavior on `EditProjectModal` (new baseline ≥387 passing — see `WAVE_19_CLEANUP_PLAN.md`).

## Task

**Before starting new work**, confirm `WAVE_19_CLEANUP_PLAN.md` has been executed and merged. If not, execute it first and get the test baseline to ≥387 green.

Then read `spec.md` for the current roadmap (v1.5.0) and pick up the next items in priority order:

1. **§3.6 Project Status Report** — Report interface featuring reporting month selection, donut charts, and lists of completed, overdue, and upcoming milestones. The `Reports.tsx` page already has a PieChart for task distribution and a progress bar. Extend it with month picker, milestone lists, and a more detailed breakdown. Key files: `src/pages/Reports.tsx`, `src/shared/api/planterClient.ts` (`getWithStats`), `src/shared/ui/chart.tsx`.

2. **§3.6 Task List Views & Filters** — Dedicated UI tables/pages to view tasks isolated by Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All Tasks, Milestones, and My Tasks. Include chronological/alphabetical sorting. The `/tasks` route (`TasksPage`) already exists. Key files: `src/pages/TasksPage.tsx` (or create), `src/features/tasks/components/`, `src/shared/api/planterClient.ts`.

3. **§3.3 Nightly CRON status transitions** — Supabase Edge Function or pg_cron job to automatically transition task statuses based on dates ('Not Yet Due' → 'Current' → 'Due Soon' → 'Overdue'). The `due_soon_threshold` is stored per-project in `tasks.settings.due_soon_threshold`. Key files: `src/shared/constants/domain.ts` (status values), `docs/db/schema.sql`, `supabase/functions/`.

4. **§3.3 Kanban Board V2** — Native column-to-column drag-and-drop with strict type safety, replacing the V1 math-heavy board. The current board is in `ProjectBoardView.tsx`. Key files: `src/features/tasks/components/ProjectBoardView.tsx`, `src/features/tasks/hooks/`.

## Key references
- `CLAUDE.md` — conventions, commands, architecture overview
- `WAVE_19_CLEANUP_PLAN.md` — pre-Wave-20 cleanup spec (must be green before starting)
- `docs/architecture/*.md` — domain SSoT (read before refactoring)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/db/app.types.ts` — domain types
- `src/shared/api/planterClient.ts` — all DB access
- `.gemini/styleguide.md` — strict typing rules (no `any`, use `unknown` at boundaries)

## Ground rules
- Run `npm run build` after code changes to verify
- Run `npm test` to confirm no regressions (baseline: ≥387 — see WAVE_19_CLEANUP_PLAN.md)
- Do not weaken ESLint rules or add `any`
- Commit with clear messages and push to main
