## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 27 shipped to `main`:
- `activity_log` table + write triggers + project Activity tab + per-task activity rail
- `useProjectPresence` + `<PresenceBar />` + per-row focus chips on `TaskList`

Spec is at **1.12.0**. §3.3 Collaboration Suite is fully `[x]`. The remaining functional roadmap is §3.6 Gantt Chart, §3.2 Checkpoint-Based Architecture, §3.7 platform/admin/monetization, §3.8 mobile infra, §3.1 localization, plus a handful of architecture-doc gap closures slated for Wave 37.

Wave 28 ships the §3.6 Gantt Chart. It's a single, focused frontend feature — no schema change, no backend work — but it touches the date-engine via the existing `updateParentDates` cascade and must be deeply respectful of the date-engine's invariants. **One task, large scope** rather than splitting into smaller pieces, because the gantt is a tightly-coupled rendering + interaction unit that gets worse when split across PRs.

**Gate baseline going into Wave 28:** confirm the current `main` baseline. Run `npm run lint` (0 errors, ≤7 warnings), `npm run build` (clean), `npx vitest run`. Record the test count from Wave 27's verification gate as the starting baseline.

## Branch

Single branch cut from `main`:
- → `claude/wave-28-gantt-chart`

Open one PR to `main` after the verification gate passes. Do **not** push directly to `main`.

## Wave 28 scope

**One task, two phases.** Phase A is the read-only gantt render (timeline of phases + milestones, optional toggle for tasks). Phase B is the interactive layer (drag a bar to shift dates, with date-engine cascade). Build Phase A first; ship Phase B in the same PR only if Phase A's verification gate is green and there's bandwidth — otherwise carve Phase B into Wave 28.5 and document the carve in `spec.md`. **Bias toward shipping both halves** — the read-only-only ship would be a half-feature.

---

### Task 1 — Gantt Chart at `/gantt`

**Commit:** `feat(wave-28): gantt chart route + render + drag-to-shift dates`

A timeline view of project phases and milestones (and optionally leaf tasks). Lives at a new route `/gantt?projectId=:id` (a full-bleed standalone route — does **not** live inside the project tabs since the timeline needs the full viewport width).

#### Phase A — read-only render

1. **Library decision** — pick **one** of:
   - **(a) `dhtmlx-gantt-community`** — heavy, MIT, comes with drag interactions out of the box. Bundle size: ~250 KB minified.
   - **(b) `gantt-task-react`** — light, MIT, ~30 KB; basic drag support; React-native API.
   - **(c) Roll our own** — D3 + svelte-style stacked HTML rows; full control, ~zero net bundle cost. Highest engineering cost but cleanest fit with our Tailwind aesthetic.
   - **Default recommendation: (b) `gantt-task-react`.** It's the only off-the-shelf option that ships in <50 KB and has a TypeScript-first API. If Phase B's drag UX is unacceptable on this lib, switch to (a) or (c) in a follow-up — that's a wave-sized decision, not an in-wave pivot.
   - Document the choice in the PR description with bundle-size delta from `npm run build` before/after.

2. **New route** (`src/pages/Gantt.tsx`, NEW; routing in `src/app/router.tsx` or wherever the route table lives)
   - Reads `projectId` from the URL query (`?projectId=:id`). Empty/missing → renders an empty state with a project-picker dropdown (reuse `ProjectSwitcher`-style list from `useDashboard.activeProjects`).
   - Uses the existing `useTaskQuery(projectId)` hook to load the project hierarchy. **Do not** add a separate fetch path — the gantt reads the same React Query cache as `TaskList`.

3. **Data shape adapter** (`src/features/gantt/lib/gantt-adapter.ts`, NEW)
   - Pure function `tasksToGanttRows(tasks: HierarchyTask[], opts: { includeLeafTasks: boolean }): GanttRow[]`.
   - Walks the hierarchy and emits one row per phase, milestone, and (optionally) leaf task. Skips subtasks always (max-depth-1 rule means subtasks are roll-ups under their parent task — they don't need their own bar).
   - For each row, derives `start`/`end` from `start_date`/`due_date`, falling back to the parent's bounds when null. Rows with no derivable bounds at all (truly free-floating) are excluded with a `_skipped: true` count returned alongside, so the UI can render "N tasks excluded — set a date to include them".
   - **Date math goes through `date-engine`.** Never compute durations or row positions with `new Date(...).getTime()` arithmetic in this file. Use `daysBetween`, `addDays`, etc.

4. **Gantt component** (`src/features/gantt/components/ProjectGantt.tsx`, NEW)
   - Wraps the chosen library. Props: `{ projectId: string; rows: GanttRow[]; onShiftDates?: (...) => Promise<void> }`.
   - Render config: phase rows use the brand color from `settings.color` if present (fallback brand-500); milestones use a contrast tone; leaf tasks (when toggled on) use slate-300. Today-line marker. Weekend tinting if the chosen lib supports it natively (skip otherwise — closing the date-engine weekend gap is Wave 37 work).
   - Toolbar: zoom (Day | Week | Month), filter (All | Phases only | Phases + Milestones | Everything), "Include leaf tasks" toggle, "Today" jump button, "Print/PDF" stub button (deferred — for Wave 33 admin tooling; render the button disabled with a tooltip "PDF export coming soon").
   - Empty state: "This project has no scheduled phases yet."
   - Loading: skeleton rows.

5. **Tests (Phase A)**
   - `Testing/unit/features/gantt/lib/gantt-adapter.test.ts` (NEW) — exhaustive: empty input; project-only (no phases); phase with no dates → uses parent bounds (project root dates); leaf-task toggle on/off; `_skipped` count for free-floating rows.
   - `Testing/unit/pages/Gantt.test.tsx` (NEW) — empty state when no `projectId`; project-picker renders; valid `projectId` mounts `<ProjectGantt />`.

#### Phase B — drag-to-shift dates

6. **Drag handler** (`src/features/gantt/hooks/useGanttDragShift.ts`, NEW)
   - `onShiftDates(taskId: string, newStart: string, newEnd: string)` calls `useUpdateTask` from `useTaskMutations` with both `start_date` and `due_date`. The existing mutation already routes through `updateParentDates` in its `onSettled` callback (Wave 18 wiring) so the cascade-up behavior comes for free.
   - **Strict bounds enforcement**: drag operations that would push a child outside its parent's bounds (e.g., dragging a milestone past the parent phase's end) are rejected with a Sonner toast: "Move the parent phase first." This mirrors the existing `dragDropUtils.ts` constraint pattern from the task list DnD.
   - Also: dragging a phase row that has children effectively shifts every descendant by the same delta. Reuse `recalculateProjectDates` from `src/shared/lib/date-engine/index.ts` if the math is cleanest there; otherwise compute the delta in the hook and let the cascade in `useUpdateTask` propagate. Document the choice inline.

7. **Optimistic UI**
   - On drag-end, optimistically update the rendered bar position; on mutation failure, force a refetch of `['projectHierarchy', projectId]` and revert. The "force-refetch in catch block" rule from `.gemini/styleguide.md` §5 is mandatory.

8. **Tests (Phase B)**
   - `Testing/unit/features/gantt/hooks/useGanttDragShift.test.ts` (NEW) — happy path (in-bounds drag fires `useUpdateTask` with both dates); out-of-bounds rejection (no mutation fired, toast shown); cascade-on-phase test (phase drag triggers expected child updates).

9. **Architecture doc** (`docs/architecture/dashboard-analytics.md` — extend, since the gantt is a reporting/analytics surface)
   - New `## Gantt Chart (Wave 28)` section. Document: data flow (`useTaskQuery → tasksToGanttRows → ProjectGantt`); date-engine integration (drags route through `useUpdateTask` → `updateParentDates`); what's not gantt-able (free-floating rows, subtasks); the print/PDF deferral.

10. **AGENT_CONTEXT.md** — new "Gantt Chart (Wave 28)" golden-path bullet.

**DB migration?** No.

**Out of scope:**
- Print / PDF export (Wave 33 admin tooling)
- Critical-path highlighting / dependency lines (defer; could be a small Wave 28.5 follow-up if user demand justifies)
- Resource-leveling (assignee swimlanes) — defer
- Mobile-friendly gantt — defer (the chosen lib likely degrades gracefully; we acknowledge the mobile UX is read-only-acceptable in Wave 28)
- Skipping weekends in date math (Wave 37 work — same date-engine gap that closes the holiday-skipping question)

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.6 Gantt Chart from `[ ]` to `[x]` with a sub-note pointing to `pages/Gantt.tsx` + `features/gantt/`. Bump version to **1.13.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — Gantt golden-path bullet is in.
3. **`docs/architecture/dashboard-analytics.md`** — Gantt section is in. Cross-reference `date-engine.md` for the drag/cascade integration.
4. **`docs/architecture/date-engine.md`** — append a one-line "Integration Points" entry: "Wave 28 Gantt drag handler routes shifts through `useUpdateTask` → `updateParentDates`; cascade and bubble-up logic unchanged."
5. **`docs/dev-notes.md`** — if Phase B was carved out into a separate wave, add a note under "Active": "Gantt Phase B (drag-to-shift) — deferred to Wave 28.5; only Phase A read-only ship is on `main`." If both phases shipped, no entry.
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 28 (Gantt Chart)`, `last_completed`, `spec_version`. Add `wave_28_highlights:` block.
7. **`CLAUDE.md`** — add `/gantt` to the Routes table with the `?projectId=` query param noted. List `gantt-task-react` (or whichever lib chosen) in Tech Stack.
8. **`package.json` motivation** — if a new dep was added, the PR description must include the bundle-size delta and the rationale (mention the alternatives considered above).

Land docs as `docs(wave-28): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Date-engine integrity** — drag a milestone past the parent phase's end → reject + toast. Drag a phase right by 7 days → all children shift by 7 days too. Re-open the project → dates persist. The cascade should look identical to a date change made via the project Edit modal (existing Wave 19 wiring).
2. **Bundle size** — `npm run build` reports the post-Wave-28 bundle. The added gantt chunk should be lazy-loaded (use `React.lazy` / `Suspense` on the `/gantt` route) so the dashboard never pays the bundle cost. If the gantt chunk lands in the main bundle, fix it before pushing.
3. **No FSD drift** — `features/gantt/` directory exists with `components/`, `hooks/`, `lib/`. No barrel files. No imports from other features beyond what `useTaskQuery` already exposes.
4. **Empty + loading + error states** — every state should have a user-visible affordance. Test by disconnecting the local Supabase mid-load.
5. **Out-of-bounds rejection** — read the toast copy aloud. If it's not actionable (just "Error"), rewrite.
6. **Lib quirks** — whichever lib was picked, walk the runtime warnings in the dev console. If the lib spits non-trivial warnings, file a follow-up note in `docs/dev-notes.md` so a future wave can address.
7. **Lint + build + tests** — green. Tests should add ~10–15 to the suite.

## Commit & Push to Main (mandatory — gates Wave 29)

After PR merges:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 1 task commit (Phase A + B together) + 1 docs sweep commit on top of Wave 27.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 29** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- Open `/gantt` → empty state shows project picker; pick a project → bars render with phases visible by default.
- Toggle "Include leaf tasks" → leaf bars appear under their milestones.
- Drag a milestone bar to the right by 5 days → bar position updates immediately, mutation fires, parent phase end-date adjusts up via cascade after refetch.
- Drag a milestone past the parent's end-date → bar snaps back, toast appears.
- Drag a phase bar → all children shift in sync.
- Refresh the page → dates persist.
- Bundle-size: confirm `gantt` chunk is lazy-loaded (network panel shows it loads only when `/gantt` is opened).

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/date-engine.md` — read before touching any date math
- `docs/architecture/dashboard-analytics.md` — host doc for the new Gantt section
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/lib/date-engine/index.ts` — `recalculateProjectDates`, `updateParentDates`-adjacent helpers
- `src/features/tasks/hooks/useTaskMutations.ts` — `useUpdateTask` reuse target
- `src/features/tasks/hooks/useTaskQuery.ts` — single source of project hierarchy
- `src/features/projects/components/ProjectSwitcher.tsx` — dropdown style precedent for the project-picker empty state

## Critical Files

**Will edit:**
- `src/app/router.tsx` (or equivalent — add `/gantt` route)
- `docs/architecture/dashboard-analytics.md` (Gantt section)
- `docs/architecture/date-engine.md` (Integration Points one-liner)
- `docs/AGENT_CONTEXT.md` (Wave 28 golden path)
- `docs/dev-notes.md` (only if Phase B is carved out)
- `spec.md` (flip §3.6 Gantt to `[x]`, bump to 1.13.0)
- `repo-context.yaml` (Wave 28 highlights)
- `CLAUDE.md` (route + lib)
- `package.json` (one new dep, motivated)

**Will create:**
- `src/pages/Gantt.tsx`
- `src/features/gantt/components/ProjectGantt.tsx`
- `src/features/gantt/hooks/useGanttDragShift.ts`
- `src/features/gantt/lib/gantt-adapter.ts`
- `Testing/unit/pages/Gantt.test.tsx`
- `Testing/unit/features/gantt/components/ProjectGantt.test.tsx`
- `Testing/unit/features/gantt/hooks/useGanttDragShift.test.ts`
- `Testing/unit/features/gantt/lib/gantt-adapter.test.ts`

**Explicitly out of scope this wave:**
- Print / PDF export
- Critical-path / dependency lines on the gantt
- Resource-leveling (assignee swimlanes)
- Mobile-optimized gantt rendering
- Weekend / holiday awareness (Wave 37)
- Cross-project gantt (multi-project portfolio view)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; **no raw date math** (the gantt is the highest-risk file in this wave for accidental `new Date().setDate()` slip — every duration/offset goes through `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1 (subtasks are excluded from the gantt — single source of truth); template vs instance clarified on any cross-cutting work (gantt is instance-only); only add dependencies if truly necessary (Wave 28 is allowed **one** new gantt dep — motivate the choice in the PR with bundle-size delta and the alternatives considered); atomic revertable commits; build + lint + tests all clean before every push; lazy-load the new route's chunk so the rest of the app's bundle is unaffected.
