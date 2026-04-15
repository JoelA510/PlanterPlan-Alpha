## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read CLAUDE.md for conventions and architecture.

The build is fully clean as of Wave 18: `npm run build` (0 errors), `npm run lint` (0 errors), `npm test` (385/385 passing). No blockers.

**Wave 18 recap** (already merged to `main`): Milestone auto-completion (bubble-up + reconcile ancestors on re-open), date bubble-up wired into task CRUD, password change + Security tab in Settings, TS 5.9 infra fix.

## Task

Read `spec.md` for the current roadmap (v1.5.0). Then pick up the next items in priority order and implement them:

1. **§3.3 Date Engine — Project date shift** — When a project's start date is changed, recalculate and assign relative due dates to all incomplete child tasks. The function `recalculateProjectDates` already exists in `src/shared/lib/date-engine/index.ts` and computes delta-shifted dates. The gap: it is not wired into the project edit flow. Wire it into `EditProjectModal.tsx` (or the mutation that saves project settings) so that changing a project's start date triggers a batch update of all descendant task dates. Key files: `src/shared/lib/date-engine/index.ts` (`recalculateProjectDates`), `src/features/projects/components/EditProjectModal.tsx`, `src/features/projects/hooks/useProjectMutations.ts`, `src/shared/api/planterClient.ts`.

2. **§3.6 Progress Visualization** — Add a project progress donut chart visible across task list views. The dashboard already has `recharts` (via `charts-cMl1u18i.js` chunk in the build). Use the existing `getWithStats` method in `planterClient.ts` which returns `{ totalTasks, completedTasks, progress }`. Display a small donut/ring chart in the project header area of `ProjectTasksView.tsx` or `ProjectHeader.tsx`. Key files: `src/features/tasks/components/ProjectTasksView.tsx`, `src/features/projects/components/ProjectHeader.tsx`, `src/shared/api/planterClient.ts` (`getWithStats`), `src/shared/ui/chart.tsx`.

3. **§3.5 Template Publishing** (if time permits) — Add a "Published/Unpublished" toggle for templates. Templates with `published = false` should be hidden from the library search for non-creators. This likely requires a new boolean column on the `tasks` table (or a field in the `settings` JSONB), a filter in `TaskWithResources.listTemplates` / `searchTemplates`, and a toggle UI in the template editor.

4. **Docs fix** — `docs/AGENT_CONTEXT.md` §3a is stale: it says the bubble-up depth is "capped at 4" but the actual code uses `depth > 1`. It also doesn't mention the `reconcileAncestors` / `deriveParentStatus` logic added in commit `767377b` (un-completes ancestors when a child is re-opened). Update §3a to match the current `updateStatus` implementation in `planterClient.ts`.

## Key references
- `CLAUDE.md` — conventions, commands, architecture overview
- `docs/architecture/*.md` — domain SSoT (read before refactoring)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/db/app.types.ts` — domain types
- `src/shared/api/planterClient.ts` — all DB access
- `src/shared/lib/date-engine/index.ts` — date calculations (fragile, test thoroughly)
- `.gemini/styleguide.md` — strict typing rules (no `any`, use `unknown` at boundaries)

## Ground rules
- Run `npm run build` after code changes to verify
- Run `npm test` to confirm no regressions (baseline: 385/385)
- Do not weaken ESLint rules or add `any`
- Commit with clear messages and push to main
