## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 27 shipped to `main`:
- `activity_log` table + 3 trigger functions (with soft-delete-before-body-edit ordering) + project Activity tab + per-task collapsed rail
- `useProjectPresence` + `<PresenceBar>` + `useTaskFocusBroadcast` per-row focus chips on `TaskList`

Spec is at **1.12.0**. §3.3 Collaboration Suite is fully `[x]`. Outstanding roadmap: §3.6 Gantt Chart (this wave), §3.2 Checkpoint kind + Phase Lead (Wave 29), §3.7 platform features, §3.8 mobile infra, §3.1 localization, plus Wave 37 doc-gap closures.

Wave 28 ships the §3.6 Gantt Chart. **One task, two phases.** Both phases ship in the same PR — no carve-out.

**Test baseline going into Wave 28:** Wave 27 shipped at ≥585 tests. Run `npm test` at the start of this wave and record the actual count. Lint baseline: 0 errors, 7 warnings — do not regress.

## Pre-flight verification (run before any task)

1. `git log --oneline -5` includes the 3 Wave 27 commits.
2. These files exist:
   - `src/shared/lib/date-engine/index.ts` (source of truth for date math; verify exports listed below)
   - `src/features/tasks/hooks/useTaskQuery.ts` (gantt reads project hierarchy via this — same React Query cache as TaskList)
   - `src/features/tasks/hooks/useTaskMutations.ts` (drag-shift routes through `useUpdateTask`)
   - `src/app/App.tsx` (gantt route registers here — confirm filename; routes do **not** live in `src/app/router.tsx`)
   - `src/shared/db/app.types.ts` (`HierarchyTask` type — used by adapter)
   - `vite.config.ts`
3. `src/shared/lib/date-engine/index.ts` exports include: `nowUtcIso`, `formatDate`, `addDaysToDate`, `isDateValid`, `endOfDayDate`, `isBeforeDate`, `compareDateAsc`, `compareDateDesc`, `findTaskById`, `calculateScheduleFromOffset`, `toIsoDate`, `formatDisplayDate`, `calculateMinMaxDates`, `recalculateProjectDates`, `deriveUrgency`. **Do NOT reference `daysBetween` or `addDays` — neither exists.** If you need day-count arithmetic for the gantt adapter, see "Date math" note below.
4. `src/app/App.tsx` registers existing routes including `/Project/:projectId` (note: capital P; matches the actual router). Wave 28 adds `/gantt` (lowercase, separate route).
5. `package.json` does NOT yet contain `gantt-task-react`. The wave adds exactly this dep.

## Branch

Single branch cut from `main`:
- → `claude/wave-28-gantt-chart`

Open one PR to `main` after the verification gate passes. Do **not** push directly to `main`.

## Wave 28 scope

**One task, two phases.** Phase A is the read-only gantt render. Phase B is the interactive layer (drag a bar to shift dates, with date-engine cascade). Build Phase A first; Phase B lands in the same PR.

---

### Task 1 — Gantt Chart at `/gantt?projectId=:id`

**Commit (single):** `feat(wave-28): gantt chart route + read-only render + drag-to-shift dates`

A timeline view of project phases and milestones (and optionally leaf tasks). Lives at a new route `/gantt?projectId=:id` — full-bleed standalone, not inside the project tabs.

#### Library choice (locked, no alternatives)

**Use `gantt-task-react@0.3.9`** (pin this version in `package.json` — newer versions exist but 0.3.9 is the last with stable React 19 compat per its npm changelog at the time of writing). One new prod dep. Bundle impact: ~30 KB gzipped.

The wave plan deliberately rejects alternatives:
* `dhtmlx-gantt-community` — too heavy at ~250 KB.
* Roll-our-own D3 — out of scope for one wave.

If `gantt-task-react@0.3.9` proves broken on React 19 in this codebase (verify by spinning up a hello-world after install), STOP and surface the issue. **Do not** silently swap to a different library — that's a wave-sized decision.

Install command: `npm install --save-exact gantt-task-react@0.3.9`. Verify in `package.json`: `"gantt-task-react": "0.3.9"` (no `^`).

#### Date math note (no `daysBetween`)

The `date-engine` module does not export a day-count helper, and Wave 28 does **not** add one. The gantt library accepts `Date` objects for `start` and `end` and computes its own pixel widths. **Adapter responsibility**: convert each `HierarchyTask`'s `start_date` (string) and `due_date` (string) to `Date` via `new Date(isoString)` at the boundary, then hand off to the library.

Why this is OK under the no-raw-date-math rule: the rule prohibits `date.setDate(...)`, `date.getTime() + ms` style arithmetic. Constructing a `Date` from a stable UTC ISO string at the library boundary is data marshalling, not math. Document this exemption in a comment at the top of `gantt-adapter.ts`.

If a comparison is needed (e.g., to validate "drag end is after drag start"), use `compareDateAsc` from `date-engine`. Never `t1.getTime() < t2.getTime()`.

#### Phase A — read-only render

**1. New route** — `src/pages/Gantt.tsx` (NEW). Register in `src/app/App.tsx` (NOT `router.tsx`):

```ts
// Inside the existing <Routes> in src/app/App.tsx:
<Route path="/gantt" element={<Suspense fallback={<div>Loading…</div>}><Gantt /></Suspense>} />
```

Lazy-import: `const Gantt = React.lazy(() => import('@/pages/Gantt'));` at the top of `App.tsx`. Lazy-loading is **mandatory** so the gantt chunk doesn't bloat the dashboard's initial load.

`Gantt.tsx` reads `projectId` from the URL query (`?projectId=:id`). Empty/missing → renders empty state with a project picker. Picker reuses `useDashboard().activeProjects` (already exists) and renders a Shadcn `<Select>` (or replicates the dropdown pattern in `src/features/projects/components/ProjectSwitcher.tsx`).

**2. Data shape adapter** — `src/features/gantt/lib/gantt-adapter.ts` (NEW):

```ts
/**
 * Adapter from PlanterPlan's hierarchical task model to gantt-task-react's flat row model.
 *
 * BOUNDARY EXEMPTION: this file constructs Date objects from ISO strings via `new Date(...)`.
 * That's allowed because the gantt library requires Date objects for its internal pixel-width
 * computation. Internal date math (sorting, comparison, persistence) still routes through
 * @/shared/lib/date-engine — never compute durations or row positions with raw arithmetic.
 */
import type { Task as GanttTaskApiType } from 'gantt-task-react';
import type { HierarchyTask } from '@/shared/db/app.types';
import { compareDateAsc, isDateValid } from '@/shared/lib/date-engine';

export interface GanttRowOptions {
  includeLeafTasks: boolean;
}

export interface AdapterResult {
  rows: GanttTaskApiType[];
  skippedCount: number; // free-floating rows excluded for missing dates
}

export function tasksToGanttRows(tasks: HierarchyTask[], opts: GanttRowOptions): AdapterResult {
  // ... walk hierarchy → emit row per phase, milestone, optionally leaf tasks. Skip subtasks
  // (max-depth-1 invariant means subtasks roll up under their parent's bar).
  // For each, derive start/end:
  //   - prefer task.start_date / task.due_date
  //   - fall back to closest ancestor's bounds if null
  //   - if both still null after fallback, skip (skippedCount++)
  // Return { rows, skippedCount }.
}
```

Implementation requirements:
* Skip tasks where `task_type === 'subtask'` (Wave 25 discriminator) — never emit a subtask bar.
* Phase rows use `type: 'project'` in the gantt model (gantt's grouping bar). Milestones use `type: 'task'`. Leaf tasks (when `opts.includeLeafTasks`) use `type: 'task'`.
* Milestone progress: compute via `(completed_count / total_count) * 100` from the milestone's children. Phase progress: aggregate from milestone children.
* Color: use `settings.color` if present; fallback `'#0284c7'` (brand-600 equivalent — confirm against `src/index.css` `--brand-600`).
* `start` MUST be ≤ `end`. If a row's resolved bounds violate this (e.g., due_date < start_date due to bad data), use start as both — and emit a `console.warn` (the row is data-broken and should be flagged in the UI).

**3. Gantt component** — `src/features/gantt/components/ProjectGantt.tsx` (NEW):

```ts
import { Gantt as GanttLib, type Task as GanttTaskApiType, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css'; // required by lib

export interface ProjectGanttProps {
  projectId: string;
  rows: GanttTaskApiType[];
  onShiftDates?: (taskId: string, newStart: Date, newEnd: Date) => Promise<void>;
}

export function ProjectGantt({ projectId, rows, onShiftDates }: ProjectGanttProps) {
  // Renders <GanttLib tasks={rows} viewMode={zoom} onDateChange={onShiftDates} ... />
  // Toolbar: zoom (Day | Week | Month) via setZoom; "Today" jump button; "Include leaf tasks" toggle (lifted state).
  // Print/PDF button rendered DISABLED with tooltip "PDF export coming soon" — placeholder for Wave 33 admin tooling.
}
```

Toolbar state lives in `Gantt.tsx`, passed down via props.

**4. Tests (Phase A)**:
* `Testing/unit/features/gantt/lib/gantt-adapter.test.ts` (NEW) — empty input; project-only (no phases); phase with no dates → uses parent bounds (project root); leaf-task toggle on/off; `skippedCount` accuracy; subtasks always excluded; color fallback; bad bounds (due < start) → start as both + warn.
* `Testing/unit/pages/Gantt.test.tsx` (NEW) — empty state when no `projectId`; project-picker renders; valid `projectId` mounts `<ProjectGantt>`.

#### Phase B — drag-to-shift dates

**5. Drag handler** — `src/features/gantt/hooks/useGanttDragShift.ts` (NEW):

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { toIsoDate, compareDateAsc, isBeforeDate } from '@/shared/lib/date-engine';
import type { HierarchyTask } from '@/shared/db/app.types';

export interface UseGanttDragShiftArgs {
  projectId: string;
  /** Flat snapshot of the project's tasks for parent-bounds lookup. */
  tasks: HierarchyTask[];
}

export function useGanttDragShift({ projectId, tasks }: UseGanttDragShiftArgs) {
  const updateTask = useUpdateTask();
  const qc = useQueryClient();

  return async function onShiftDates(taskId: string, newStart: Date, newEnd: Date) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Bounds check: child cannot exceed parent's bounds.
    if (task.parent_task_id) {
      const parent = tasks.find((t) => t.id === task.parent_task_id);
      if (parent?.start_date && parent?.due_date) {
        if (isBeforeDate(toIsoDate(newStart), parent.start_date)
            || compareDateAsc(toIsoDate(newEnd), parent.due_date) > 0) {
          toast.error('Move the parent phase first.');
          return;
        }
      }
    }

    // Sanity: end must be ≥ start.
    if (compareDateAsc(toIsoDate(newStart), toIsoDate(newEnd)) > 0) {
      toast.error('Invalid date range.');
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        payload: { start_date: toIsoDate(newStart)!, due_date: toIsoDate(newEnd)! },
      });
      // useUpdateTask's onSettled already calls updateParentDates (Wave 18 wiring) — cascade-up free.
    } catch (err) {
      // Force-refetch on rollback per styleguide §5.
      qc.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
      toast.error('Could not save change.');
    }
  };
}
```

Bound-violation check is mandatory — gantt-task-react fires `onDateChange` for any drag, including out-of-bounds. The hook is the gate.

Phase shift cascade: when dragging a phase row whose children inherit dates from the phase, the cascade is handled by `useUpdateTask`'s `onSettled` calling `updateParentDates`, which cascades through the tree. **Do not** manually compute child shifts in this hook — that's date-engine's job.

**6. Optimistic UI** — gantt-task-react re-renders bars from the `tasks` prop. On drag-end:
* Optimistic UI is OPTIONAL for the gantt (the React Query mutation will refetch and re-render anyway, typically within 200ms).
* If optimistic feel is desired, lift the `rows` to a `useState` in `Gantt.tsx`, optimistically update on drag-end, and rely on the React Query refetch via `onSettled` to reconcile.
* On error: force `qc.invalidateQueries({ queryKey: ['projectHierarchy', projectId] })` per `useGanttDragShift` above.

**7. Tests (Phase B)**:
* `Testing/unit/features/gantt/hooks/useGanttDragShift.test.ts` (NEW) — happy path (in-bounds drag fires `useUpdateTask`); out-of-bounds rejection (no mutation, toast); inverted dates (no mutation, toast); rollback on mutation error (force-refetch fires).

**Architecture doc** — append to `docs/architecture/dashboard-analytics.md` after the Realtime Presence section:

```md
## Gantt Chart (Wave 28)

Standalone route `/gantt?projectId=:id` (registered in `src/app/App.tsx`, lazy-loaded). Reads project hierarchy from the same `useTaskQuery` React Query cache as `TaskList`.

**Stack**: `gantt-task-react@0.3.9` (pinned, no `^`). Bundle impact ~30 KB gzipped, lazy-loaded.

**Adapter** (`src/features/gantt/lib/gantt-adapter.ts`):
* Walks the hierarchy; emits one row per phase, milestone, and (optionally) leaf task.
* **Subtasks always excluded** — max-depth-1 invariant means they roll up.
* Free-floating rows (no derivable bounds) excluded with a `skippedCount` returned alongside for the UI to surface "N tasks excluded".
* **Boundary exemption from no-raw-date-math**: the file constructs `Date` from ISO strings for the library — strictly data marshalling, not math. Internal comparisons still go through `compareDateAsc`/`isBeforeDate` from `date-engine`.

**Drag-to-shift** (`src/features/gantt/hooks/useGanttDragShift.ts`):
* Routes through `useUpdateTask` from `useTaskMutations`. Cascade-up on parent dates is automatic via the Wave 18 `onSettled → updateParentDates` wiring.
* Bounds check before mutation: child cannot exceed parent's bounds; error toast + no mutation if violated.
* On error: force-refetch `['projectHierarchy', projectId]` per styleguide §5.

**Out of scope (this wave)**: Print/PDF (button rendered disabled with tooltip — for Wave 33 admin tooling); critical-path lines; resource swimlanes; mobile-optimized rendering; weekend/holiday awareness (Wave 37).
```

**AGENT_CONTEXT.md** — add bullet:

```md
- **Gantt Chart (Wave 28)**: `/gantt?projectId=:id` (lazy-loaded route in `src/app/App.tsx`) → `src/pages/Gantt.tsx` → `<ProjectGantt>` (`src/features/gantt/components/`) backed by `gantt-task-react@0.3.9`. Adapter at `src/features/gantt/lib/gantt-adapter.ts`. Drag-to-shift goes through `useGanttDragShift` → `useUpdateTask` (cascades via Wave 18 `updateParentDates`).
```

**`docs/architecture/date-engine.md`** — append one-line "Integration Points" entry: `* **Gantt drag-shift (Wave 28)**: `src/features/gantt/hooks/useGanttDragShift.ts` validates bounds via `isBeforeDate`/`compareDateAsc`, then routes through `useUpdateTask`. Cascade-up logic in `updateParentDates` unchanged.`

**DB migration?** No.

**Out of scope:**
- Print / PDF export
- Critical-path / dependency lines
- Resource swimlanes
- Mobile-optimized rendering
- Weekend / holiday awareness (Wave 37)
- Cross-project portfolio gantt

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-28): documentation currency sweep`. Operations:

1. **`spec.md`**:
   - Find `### 3.6 Dashboard, Views & Reporting` → flip `[ ] **Gantt Chart**: ...` to `[x] **Gantt Chart**: Standalone `/gantt?projectId=:id` route built on `gantt-task-react@0.3.9`. Lazy-loaded; drag-to-shift dates routed through `useUpdateTask` with parent-bounds enforcement. (Wave 28)`.
   - Bump header to `> **Version**: 1.13.0 (Wave 28 — Gantt Chart)`. Update `Last Updated`.

2. **`docs/AGENT_CONTEXT.md`** — Gantt golden-path bullet from above.

3. **`docs/architecture/dashboard-analytics.md`** — Gantt section in.

4. **`docs/architecture/date-engine.md`** — Integration Points one-liner in.

5. **`docs/dev-notes.md`** — confirm currency. Add: `**Active:** Print/PDF gantt export deferred to Wave 33 admin tooling. Button rendered disabled with tooltip in the gantt toolbar.`

6. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 28 (Gantt Chart)'`, `last_completed: 'Wave 28'`, `spec_version: '1.13.0'`.
   - `wave_28_highlights:` listing route, library + version pin, lazy-loaded chunk, adapter responsibilities, drag-shift wiring.

7. **`CLAUDE.md`**:
   - Add `/gantt` to Routes table with `?projectId=` query param documented.
   - Tech Stack: add `gantt-task-react` to the Tech Stack list with version `0.3.9` pinned.

8. **`package.json`** — `"gantt-task-react": "0.3.9"` (exact, no `^`). The PR description must include the bundle-size delta from `npm run build` before/after.

Land docs as `docs(wave-28): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Date-engine integrity** — drag a milestone past the parent phase's end → reject + toast. Drag a phase right by 7 days → all children shift by 7 days too via `updateParentDates` cascade. Re-open the project → dates persist.
2. **Bundle size** — `npm run build` reports the post-Wave-28 chunk inventory. The gantt chunk MUST be lazy-loaded (DevTools Network → confirm only loads on `/gantt` navigation). If it lands in the main bundle, the lazy import is wrong — fix before pushing.
3. **No FSD drift** — `features/gantt/` slice exists with `components/`, `hooks/`, `lib/`. No barrel files. Imports from outside the slice: `useTaskQuery`, `useUpdateTask`, `useDashboard`, `date-engine`, `app.types` — all `@/`-aliased.
4. **Empty + loading + error states** — every state has a user-visible affordance.
5. **Out-of-bounds toast** — read the copy aloud ("Move the parent phase first."). Actionable.
6. **Lib quirks** — walk the dev console for runtime warnings from `gantt-task-react`. If non-trivial warnings appear, file a one-line entry in `dev-notes.md` for a future wave.
7. **Lint + build + tests** — green. New tests should add ~12-15 to the suite.

## Commit & Push to Main (mandatory — gates Wave 29)

After PR merges:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits: 1 task commit (Phase A + B together) + 1 docs sweep on top of Wave 27.
3. `git push origin main`. CI green.
4. **Do not start Wave 29** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors, ≤7 warnings
npm run build     # clean
npm test          # baseline + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- Open `/gantt` → empty state shows project picker; pick a project → bars render with phases visible by default.
- Toggle "Include leaf tasks" → leaf bars appear under their milestones.
- Drag a milestone bar to the right by 5 days → bar position updates, mutation fires, parent phase end-date adjusts via cascade after refetch.
- Drag a milestone past the parent's end-date → bar snaps back, toast appears.
- Drag a phase bar → children shift in sync.
- Refresh the page → dates persist.
- DevTools Network → confirm `gantt` chunk lazy-loads only when `/gantt` is opened (NOT on dashboard load).

## Key references

- `CLAUDE.md` — conventions
- `.gemini/styleguide.md` — strict typing, FSD, Tailwind, no raw date math (with the documented boundary exemption noted above)
- `docs/architecture/date-engine.md` — read carefully; gantt-shift integration is documented here
- `docs/architecture/dashboard-analytics.md` — host doc for the new Gantt section
- `docs/AGENT_CONTEXT.md` — golden paths
- `src/shared/lib/date-engine/index.ts` — exports inventory: see Pre-flight #3
- `src/features/tasks/hooks/useTaskMutations.ts` — `useUpdateTask` reuse target
- `src/features/tasks/hooks/useTaskQuery.ts` — single source of project hierarchy
- `src/features/dashboard/hooks/useDashboard.ts` — `activeProjects` for the picker
- `src/features/projects/components/ProjectSwitcher.tsx` — dropdown pattern precedent
- `src/app/App.tsx` — routes registered here (NOT `router.tsx`)
- gantt-task-react README on npm — `https://www.npmjs.com/package/gantt-task-react`

## Critical Files

**Will edit:**
- `src/app/App.tsx` (add `/gantt` lazy route)
- `docs/architecture/dashboard-analytics.md` (Gantt section)
- `docs/architecture/date-engine.md` (Integration Points one-liner)
- `docs/AGENT_CONTEXT.md` (Wave 28 golden path)
- `docs/dev-notes.md` (PDF-export deferral note)
- `spec.md` (flip §3.6 Gantt, bump to 1.13.0)
- `repo-context.yaml` (Wave 28 highlights)
- `CLAUDE.md` (route + tech stack)
- `package.json` (one new dep, pinned)

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
- Print/PDF export
- Critical-path / dependency lines on the gantt
- Resource-leveling (assignee swimlanes)
- Mobile-optimized gantt
- Weekend / holiday awareness (Wave 37)
- Cross-project gantt
- Adding a `daysBetween` (or any new) helper to `date-engine` — this wave does not need it

## Ground Rules

TypeScript only; no `.js`/`.jsx`; no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; **no raw date math** with one documented boundary exemption: `gantt-adapter.ts` constructs Date from ISO strings for library handoff (not arithmetic). All comparisons use `compareDateAsc`/`isBeforeDate`. `addDaysToDate` is the only "addition" function — never `t.setDate(t.getDate() + n)`. `daysBetween` does not exist; if you need a duration, the gantt library computes pixels itself; for sort comparisons use `compareDateAsc`. No direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; optimistic mutations must force-refetch in `onError`; max subtask depth = 1 (subtasks excluded from gantt — single source of truth on this); template vs instance: gantt is instance-only (templates have no due dates); **one new dep allowed: `gantt-task-react@0.3.9` pinned, no `^`** — the PR includes bundle-size delta and the lazy-load proof; atomic revertable commits; build + lint + tests clean before every push.
