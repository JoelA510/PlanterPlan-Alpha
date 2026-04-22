## Session Context

PlanterPlan is a church planting project management app (React 18 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 31 shipped to `main`:
- i18next localization framework (en baseline + es machine-translated)
- LocaleSwitcher in Settings → Profile
- React rollback 19 → 18.3.1 (scope expansion — unblocked Vercel previews)

**Roadmap note**: original Waves 32 (PWA + Offline), 34 (White Labeling), 35 (Stripe Monetization + Licensing), and 38 (Release Cutover) were descoped from the earlier plan, and wave numbers were reassigned to the current remaining scope. After Wave 32 (this wave) the active roadmap is: Wave 33 (unified Tasks view) → Wave 34 (Advanced Admin Management) → Wave 35 (ICS feeds) → Wave 36 (template hardening).

Wave 32 ships **three targeted UX bug fixes** surfaced from usage testing. Each is a small, isolated fix — no task should produce a PR over ~200 LOC.

**Test baseline going into Wave 32:** Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress. Each task adds a regression test that would have caught the bug; no new functional surfaces.

**Read `.claude/wave-testing-strategy.md` before starting.** Wave 32 specific: all three tasks touch existing files (`useProjectMutations`, `useTaskFilters`, `Dashboard`) already covered by `useProjectMutations.test.ts`, `useTaskFilters.test.ts` (if it exists; otherwise NEW), and `Dashboard.test.tsx`. Extend them in place; don't create parallel suites.

## Pre-flight verification (run before any task)

1. `git log --oneline` includes the Wave 31 commits + docs sweep + the earlier descoping commit.
2. Confirm the files referenced below actually exist at the line numbers cited:
   - `src/features/tasks/hooks/useTaskFilters.ts` (Task 2 — milestone filter at ~lines 50-63, 117-118)
   - `src/features/projects/hooks/useProjectMutations.ts` (Task 1 — `useUpdateProject` at ~lines 64-98)
   - `src/pages/Dashboard.tsx` (Task 3 — "New Project" button at ~lines 127-133, `CreateProjectModal` mount at ~173-177)
   - `src/pages/Project.tsx` (Task 1 — confirm it queries `['project', projectId]` rather than `['projects']`)
3. Confirm `CreateProjectModal` supports a template-creation mode (look for `origin: 'template'` branch or a prop like `mode`). If it doesn't, Task 3 either adds a mode toggle or adds a small `CreateTemplateModal` sibling — choose the cheaper path.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-32-project-duedate-persist`
- Task 2 → `claude/wave-32-task-filter-regressions`
- Task 3 → `claude/wave-32-new-template-button`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 32 scope

Three tasks. Order does not matter — each is self-contained.

---

### Task 1 — Project due date does not persist after save

**Commit:** `fix(wave-32): invalidate project detail cache on edit so due_date refetches`

**Symptom:** user edits a project's due date in `EditProjectModal`, clicks Save, the modal closes successfully, but the Project view still shows the old due date until a hard refresh.

**Suspected root cause (verify first):** `useUpdateProject` in `src/features/projects/hooks/useProjectMutations.ts` invalidates the project-list query key `['projects']` on success, but `src/pages/Project.tsx` subscribes to a detail query `['project', projectId]`. The list cache refreshes; the detail cache does not. Form `defaultValues` hydration in `EditProjectModal` looks correct (verified during scoping), so this is an invalidation-key mismatch, not a form bug.

**Fix:**
1. Read both `useUpdateProject` and the detail query key used by `Project.tsx` / `useProjectQuery`. Confirm the mismatch before changing anything.
2. In `useUpdateProject`'s `onSuccess`, invalidate **both** `['projects']` (list) and `['project', projectId]` (detail). Use `queryClient.invalidateQueries({ queryKey: [...] })` for each — don't use `removeQueries` (would unmount the active Project view).
3. If the app uses any other project-detail query key variants (e.g., `['project-with-tasks', id]`), invalidate those too. Grep for `['project'` across the codebase.

**Tests:**
- Extend `Testing/unit/features/projects/hooks/useProjectMutations.test.ts`:
  - Add a test that calls `useUpdateProject`'s mutate with `{ due_date }`, asserts the mock `queryClient.invalidateQueries` is called with BOTH `['projects']` and `['project', projectId]`.
- Manual smoke: edit a project's due_date → Save → the Project page header reflects the change without refresh.

**Files:**
- `src/features/projects/hooks/useProjectMutations.ts` (primary fix)
- `Testing/unit/features/projects/hooks/useProjectMutations.test.ts` (regression test)

**DB migration?** No.

**Out of scope:** broader query-invalidation audit (other mutations may have similar gaps — file a follow-up if any are spotted while grepping, but don't fix them in this PR).

---

### Task 2 — Tasks page status filters are broken

**Commit:** `fix(wave-32): correct milestone/status filtering in useTaskFilters`

**Symptom:** on the Tasks page (`/tasks`), selecting the **Milestones** filter returns a mix of To-Do items rather than just milestone-level rows. Some other status filters appear inert (return the full list unchanged). User report is imprecise about WHICH filters are inert — verify by exercising each one.

**Suspected root cause:** `src/features/tasks/hooks/useTaskFilters.ts` exposes 9 filters (`my_tasks`, `priority`, `overdue`, `due_soon`, `current`, `not_yet_due`, `completed`, `all_tasks`, `milestones`). The `milestones` filter uses structural matching (grandchild-of-root) rather than filtering by the `task_type = 'milestone'` column. Any phase-level or task-level row that happens to be at the "grandchild" depth leaks through regardless of completion state.

**Fix:**
1. Exercise every filter in the UI first — write down which return the wrong rows. The bug report covers milestones; verify the "some filters do nothing" claim on each.
2. Rewrite `milestones` to filter by `task_type = 'milestone'` (per Wave 25 `task_type` column), not by structural position. Keep the `buildMilestoneIdSet` helper only if something else still needs it — otherwise delete it.
3. For any status filters that are demonstrably inert: read the predicate, identify why it returns everything, fix minimally. Common suspects: comparing `task.status` against a literal that doesn't match the Wave 23 canonical set (`'todo' | 'not_started' | 'in_progress' | 'completed'`) — not e.g. `'not-started'` with a dash.
4. Do not broaden scope: leave the 9 filter IDs in place; only correct the predicates.

**Tests:**
- `Testing/unit/features/tasks/hooks/useTaskFilters.test.ts` — if it already exists, extend; otherwise NEW. Seed a fixture tree with: 1 root project, 2 phases, 3 milestones (one under each phase), 5 tasks (mixed `todo`/`in_progress`/`completed`), and assert each filter returns the exact expected subset.
- Use existing `makeTask` / `makeProject` factories in `Testing/test-utils/factories.ts`.

**Files:**
- `src/features/tasks/hooks/useTaskFilters.ts` (primary fix)
- `Testing/unit/features/tasks/hooks/useTaskFilters.test.ts` (regression coverage)

**DB migration?** No.

**Out of scope:** redesigning the filter UI; adding new filters (Wave 33 adds due-date range). Any "the filter dropdown itself is confusing" polish.

---

### Task 3 — No "New Template" button on Dashboard

**Commit:** `feat(wave-32): surface New Template button alongside New Project on Dashboard`

**Symptom:** Dashboard header exposes a **New Project** button but no **New Template** counterpart. Template creation is reachable only via `/dashboard?action=new-template` URL hack or via the `ProjectSidebar` button (only visible inside a project). Users cannot discover template creation from a cold start.

**Fix:**
1. In `src/pages/Dashboard.tsx` (the header section at ~lines 127-133), add a secondary-style **New Template** button next to the existing New Project button. Use the same `Button` variant system already in use; match the existing button's localization pattern (pull strings through `t('dashboard.newTemplate')`).
2. Wire the click handler to open the existing modal in template mode. Choose whichever is cheaper:
   - **Option A (preferred if `CreateProjectModal` already supports it):** Add an `initialMode: 'project' | 'template'` prop and open the modal with `initialMode='template'`.
   - **Option B:** Add a small sibling `CreateTemplateModal` wrapping the same form with `origin: 'template'` hard-coded.
3. Gate the button by admin role only if the existing URL flow is admin-gated. Match the existing authorization; don't loosen or tighten it.
4. Add `dashboard.newTemplate` to `src/shared/i18n/locales/en.json` (and placeholder in `es.json` — see Wave 31 convention).

**Tests:**
- `Testing/unit/pages/Dashboard.test.tsx` — extend or NEW. Assert the button renders; clicking it opens the modal in template mode (or opens `CreateTemplateModal`).

**Files:**
- `src/pages/Dashboard.tsx` (button + modal mount)
- `src/features/projects/components/CreateProjectModal.tsx` OR NEW `CreateTemplateModal.tsx` (per option chosen)
- `src/shared/i18n/locales/en.json` + `es.json` (new key)
- `Testing/unit/pages/Dashboard.test.tsx`

**DB migration?** No.

**Out of scope:** a dedicated `/templates/new` route; template-specific form fields beyond what `CreateProjectModal` already handles; library redesign.

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip the new §3.2 bullet "Create Template affordance on Dashboard" to `[x]`. Add a short note under the top-level status line: "Wave 32 closed three UX bugs (project due-date cache invalidation, Tasks-page status filters, New Template button)." Bump the spec version patch (not minor — these are fixes, not features). Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — no golden-path change; skip unless a file path moved.
3. **`docs/dev-notes.md`** — append under an "Active" subsection: "**Resolved (Wave 32)**: project-detail cache invalidation on edit; milestone + inert status filters; New Template button on Dashboard."
4. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 32 (UX Bug Fixes)`, update `last_completed`, `spec_version`, add a short `wave_32_highlights:` block.
5. **`CLAUDE.md`** — no changes expected.

Land docs as `docs(wave-32): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Task 1 smoke** — edit a project's due date → Save → Project page header reflects the new date WITHOUT refresh.
2. **Task 2 smoke** — on `/tasks`, cycle through each filter; every filter narrows the list correctly. Milestones returns ONLY `task_type = 'milestone'` rows.
3. **Task 3 smoke** — cold-load Dashboard → "New Template" button is visible → click opens the template-creation flow.
4. **No FSD drift** — all new files (if any) live in the right slice. No barrel files.
5. **Type drift** — `npm run build` green.
6. **Test-impact reconciled** — every extended test passes; no `it.skip`. Test count ≥ baseline + new regression tests.
7. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 (HALT on any failure).

## Commit & Push to Main (mandatory — gates Wave 33)

After all three Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. History should show: 3 task commits + 1 docs sweep commit on top of Wave 31.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 33** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean (tsc -b && vite build). FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new regression tests. FAIL → HALT.
git status        # clean
```

Manual smoke per Wave Review.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints
- `src/features/projects/hooks/useProjectMutations.ts` — Task 1 surface
- `src/features/tasks/hooks/useTaskFilters.ts` — Task 2 surface
- `src/pages/Dashboard.tsx` — Task 3 surface
- `src/pages/Project.tsx` — Task 1: which detail query key does it actually use
- `src/features/projects/components/CreateProjectModal.tsx` — Task 3: does it already support template mode?

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files; path alias `@/` → `src/`; no raw date math; no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; all user-visible strings through `t('namespace.key')` (Wave 31 convention); atomic revertable commits; build + lint + tests all clean before every push.
