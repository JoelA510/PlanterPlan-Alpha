## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 24 shipped to `main`:
- `92d286e fix(wave-24): rewrite project_members RLS per Wave 23 audit + drop ownership shim`
- `f437c0d feat(wave-24): strategy template task type — prompt library follow-ups on completion`
- `ff3a227 feat(wave-24): backfill coaching-task assignee when project coach membership changes`

Spec is at **1.10.0**. §3.3 Specialized Task Types is fully shipped (both halves: Coaching + Strategy Templates). The `check_project_ownership` leak is closed (shim dropped, policies rewritten per the Wave 23 audit). Coaching assignee backfill on membership change is wired.

§6 Backlog now has **one** outstanding item — "Topically related library suggestions" (the §3.5 recommender half). `docs/dev-notes.md` has **one** active technical-debt entry — "No type discriminator on `tasks`".

**Gate baseline going into Wave 25: `npm run lint` → 0 errors (7 pre-existing warnings), `npm run build` clean, `npx vitest run` → 47 files / 547 tests passing.** Do not regress.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-25-related-templates`
- Task 2 → `claude/wave-25-task-type-discriminator`
- Task 3 → `claude/wave-25-project-switcher-show-completed`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 25 scope

Three tasks, each scoped tight. One closes the last §6 carve-out (completes the §3.5 Library Integration loop). One closes the sole remaining `docs/dev-notes.md` DB tech-debt entry. One is a small, user-visible quality-of-life UI mirror of an existing pattern.

---

### Task 1 — §6 carve-out: Topically related library suggestions

**Commit:** `feat(wave-25): surface topically related Master Library templates in the Strategy follow-up flow`

Closes the "Topically related library suggestions" entry in `spec.md` §6 Backlog. Wave 22 shipped the "hide already-present" half via `settings.spawnedFromTemplate`. This wave ships the recommender half: a modest first-cut similarity score over template titles + descriptions, surfaced alongside the free-text search inside Wave 24's `StrategyFollowUpDialog`.

1. **Similarity scorer** (`src/features/library/lib/related-templates.ts`, NEW)
   - Pure TypeScript, no external NLP dependency.
   - `scoreRelatedness(seed: { title?: string; description?: string }, candidate: { title?: string; description?: string }): number` returns a non-negative number where higher = more related.
   - Algorithm: tokenize both sides to lowercased word lists; drop stopwords (English stoplist `['the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'by', 'is', 'are', 'be', 'this', 'that', 'it', 'as', 'at']` — keep inline, no dependency); drop tokens shorter than 3 chars; compute a weighted Jaccard overlap where title matches count 2× description matches. Return `(2 * title_overlap + desc_overlap) / (2 * title_union + desc_union)`, or 0 when both unions are empty.
   - Export `rankRelated<T extends { id: string; title?: string; description?: string }>(seed, candidates, limit = 5): T[]` that filters out the seed's own id, scores each candidate, sorts descending, and returns the top-N (ties broken by candidate title ascending for determinism).

2. **Hook** (`src/features/library/hooks/useRelatedTemplates.ts`, NEW)
   - Thin wrapper: `useRelatedTemplates(seedTask?: { id: string; title?: string; description?: string } | null, opts?: { excludeTemplateIds?: readonly string[]; limit?: number; viewerId?: string })`.
   - Internally fetches via `useMasterLibrarySearch` with an empty query (reuses its caching + `exclusionDrained` logic); in the returned `useMemo`, applies `rankRelated` against the full result set minus `excludeTemplateIds`.
   - Returns `{ results: SearchTask[]; isLoading: boolean; hasResults: boolean }`.

3. **UI wiring** (`src/features/tasks/components/StrategyFollowUpDialog.tsx`)
   - Above the existing `MasterLibrarySearch` combobox, render a "Related templates" section driven by `useRelatedTemplates(task, { excludeTemplateIds, limit: 5 })`. Each suggestion is a clickable row that invokes the existing `handleSelect` logic (reuses `Task.clone` → projectHierarchy invalidation → toast).
   - If `seedTask.title` and `seedTask.description` are both empty, skip the section entirely (don't suggest random templates).
   - Show a muted "No related templates found" line only when `isLoading === false` and `hasResults === false`.
   - Keep the free-text search as the primary path; the related list is a discovery aid.

4. **Tests**
   - `Testing/unit/features/library/lib/related-templates.test.ts` (NEW) — exhaustive coverage of `scoreRelatedness` (empty inputs, all-stopwords, title-only overlap, description-only overlap, mixed overlap ordering, title weight > description weight) and `rankRelated` (limit, seed-id exclusion, determinism tie-break).
   - `Testing/unit/features/library/hooks/useRelatedTemplates.test.ts` (NEW) — mocks `useMasterLibrarySearch` to return a fixed list; asserts the hook ranks and limits correctly and honours `excludeTemplateIds`.
   - `Testing/unit/features/tasks/components/StrategyFollowUpDialog.related.test.tsx` (NEW) — renders the dialog with a seed task having a title + description; mocks `useRelatedTemplates` to return two suggestions; clicking a suggestion fires `Task.clone` with the right args (same assertions as the existing `StrategyFollowUpDialog.test.tsx`, different source of candidates).

**DB migration?** No — purely frontend.

**Out of scope:** server-side ranking (everything runs client-side over the already-fetched Master Library snapshot); RAG-style similarity (embeddings, cosine distance) — this is a title/description heuristic, not a recommender model; surfacing suggestions outside `StrategyFollowUpDialog` (e.g. inside `TaskForm` library picker) — those belong to a follow-up wave.

---

### Task 2 — Dev-notes: `task_type` discriminator column

**Commit:** `feat(wave-25): add task_type discriminator column + BEFORE trigger + backfill`

Closes the "No type discriminator on `tasks`" entry in `docs/dev-notes.md`. Adds a narrow string enum derived from `parent_task_id` depth so queries like "all phases" / "all milestones" / "all leaf tasks" can skip the recursive walk. DB-only — app code just gets a new optional field in the generated types; no consumers updated this wave.

1. **Migration** (`docs/db/migrations/2026_04_18_task_type_discriminator.sql`, NEW)
   - Add column: `ALTER TABLE public.tasks ADD COLUMN task_type text`.
   - Add CHECK: `ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check CHECK (task_type IS NULL OR task_type IN ('project','phase','milestone','task','subtask'))`.
   - Add supporting index: `CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks (task_type)`.
   - Function `public.derive_task_type(parent_task_id uuid) RETURNS text` that walks up to three levels of parent chain and returns the correct discriminator. Layout:
     - `parent IS NULL` → `'project'`
     - `parent.parent IS NULL` → `'phase'`
     - `parent.parent.parent IS NULL` → `'milestone'`
     - otherwise → `'task'` (subtask — the max-depth-1 invariant makes `'subtask'` redundant with `'task'` at depth 3; keep `'subtask'` reserved in the CHECK for future use but don't emit it here).
   - Trigger `trg_set_task_type BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_task_type()` where `set_task_type()` calls `derive_task_type(NEW.parent_task_id)` and assigns to `NEW.task_type`.
   - Ordering note: this trigger sorts alphabetically before both `trg_set_coaching_assignee` and `trg_set_root_id_from_parent`. That's fine — it only reads `NEW.parent_task_id`, which is always populated pre-trigger for inserts; it does not depend on `NEW.root_id`.
   - Backfill: `UPDATE public.tasks SET task_type = derive_task_type(parent_task_id) WHERE task_type IS NULL;`
   - Revert path documented in header: drop trigger, drop functions, drop index, drop constraint, drop column.
   - Mirror all definitions + the trigger binding into `docs/db/schema.sql` per the established pattern.

2. **Types** (`src/shared/db/database.types.ts`)
   - Hand-add `task_type?: string | null` to the `tasks` table's `Row`, `Insert`, and `Update` type blocks (mirrors how `check_project_creatorship` / `check_project_ownership_by_role` RPC entries were hand-edited in Waves 23/24 when the types lagged the DB).
   - No domain-type change needed — callers can start reading `tasks.task_type` whenever they want; no Wave 25 code consumes it.

3. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - Under `## Core Entities & Data Models`, add a bullet explaining the new `task_type` column, its derivation rules, and that it's kept in sync by a BEFORE trigger so writers don't have to set it manually. Cross-reference the migration.

4. **Dev-notes cleanup** (`docs/dev-notes.md`)
   - Flip the "No type discriminator on `tasks`" entry to `**Resolved (Wave 25).**` with a pointer to the migration and the architecture update. Keep the historical diagram as `_Historical:_` for context.

5. **Tests**
   - DB trigger smoke script at `docs/db/tests/task_type_discriminator.sql` (NEW) — assert that every layer of a freshly-seeded hierarchy ends with the right `task_type`, then flip a subtree (reparent a milestone under a different phase) and confirm the trigger re-derives. Include: INSERT project → `'project'`; INSERT child of project → `'phase'`; INSERT grandchild → `'milestone'`; INSERT great-grandchild → `'task'`; UPDATE parent_task_id (reparent) → `task_type` recomputed.
   - Backfill sanity: confirm zero rows with `task_type IS NULL` after the migration (`SELECT COUNT(*) = 0 FROM public.tasks WHERE task_type IS NULL;`).
   - No unit test — there is no app-code path that reads the column yet; the smoke script covers the DB invariant.

**DB migration?** Yes — one column + one CHECK constraint + one index + two functions (`derive_task_type`, `set_task_type`) + one BEFORE trigger + one backfill UPDATE. Fully additive and revertable.

**Out of scope:** rewriting any existing query to consume `task_type` (deferred — today's recursive walks still work); emitting `'subtask'` (the depth-1 max invariant lives in app code only); changing `check_phase_unlock` / `calc_task_date_rollup` to use the new column.

---

### Task 3 — ProjectSwitcher "Show completed" toggle

**Commit:** `feat(wave-25): ProjectSwitcher reveals completed projects behind a toggle`

Mirrors the existing "Show archived" toggle in the header `ProjectSwitcher` dropdown. Today the switcher filters out any project with `is_complete = true`, so a user who marked a project complete has no in-app path back to it without typing `/project/:id`. Add a second toggle that reveals completed projects inline, exactly the way "Show archived" already works.

1. **Component change** (`src/features/projects/components/ProjectSwitcher.tsx`)
   - Alongside the existing `showArchived` state, add `showCompleted` state.
   - The existing filter `status !== 'archived' && !is_complete` splits into two independent predicates: archived-filter honours `showArchived`; completed-filter honours `showCompleted`. Both default OFF to preserve current behavior.
   - Add a second checkbox/toggle in the dropdown, directly below the "Show archived" one, labelled "Show completed".
   - If a project matches both filters (archived AND completed), showing it requires both toggles ON (don't smuggle it through either toggle alone).

2. **Tests** (`Testing/unit/features/projects/components/ProjectSwitcher.test.tsx`)
   - Extend the existing suite with cases covering:
     - Default render: completed projects are hidden.
     - Clicking "Show completed" reveals `is_complete: true` projects in the list.
     - Clicking "Show completed" does NOT reveal archived projects (the two toggles are independent).
     - A project that is both completed AND archived only appears when both toggles are on.

3. **Architecture doc** (`docs/architecture/projects-phases.md`)
   - Update the existing "Active project" / "Completed project" bullets to note that the ProjectSwitcher's default filter stays `status !== 'archived' && !is_complete`, but both subsets are now reachable via the two independent toggles.

4. **AGENT_CONTEXT.md** — flip the "Project Switcher (Wave 21.5)" bullet to mention both toggles (Wave 25 addition).

**DB migration?** No — purely UI.

**Out of scope:** surfacing the toggle in other places (Dashboard Pipeline, Sidebar); changing the default — the defaults stay as they are.

---

## Decisions locked in (assumed during planning)

1. **Task 1's ranker is client-side over the already-fetched library snapshot** — no new DB query, no server-side similarity. Keeps the wave light and reuses `useMasterLibrarySearch`'s cache.
2. **Task 2 is additive only** — no existing query is rewritten to consume `task_type` this wave. The column + backfill are the entire deliverable; downstream consumers land when specific perf wins justify the churn.
3. **Task 3 mirrors the "Show archived" pattern exactly** — no UI redesign, no alternative surface, no default change.

---

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # ≥547 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** on a strategy-tagged instance task with a descriptive title (e.g. "Launch grand opening service") mark it complete → the follow-up dialog shows a "Related templates" section above the search. Related templates share title/description keywords with the seed. Clicking one clones it as a sibling, exactly like the search path. Dismissal leaves no state behind.
- **Task 2:** `psql -c "\d public.tasks"` shows the new `task_type` column + CHECK + index. `SELECT task_type, COUNT(*) FROM public.tasks GROUP BY 1` returns zero nulls and a sensible distribution (one `project` per root task, then phases/milestones/tasks per depth). Drag a milestone from one phase to another → its `task_type` re-computes (should stay `milestone` since depth is unchanged, but the trigger re-ran).
- **Task 3:** open the header ProjectSwitcher. "Show archived" and "Show completed" are both visible, independently togglable. Completing a project (from the `/project/:id` detail) hides it from the default list; flipping "Show completed" on surfaces it. Archiving it (via EditProjectModal) then requires BOTH toggles on.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/dev-notes.md` — source of Task 2 scope
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `docs/db/migrations/2026_04_18_coaching_backfill_on_membership.sql` — Wave 24 precedent for `project_members` AFTER triggers
- `docs/db/migrations/2026_04_17_coaching_auto_assign.sql` — Wave 23 precedent for `tasks` BEFORE triggers
- `src/features/library/hooks/useMasterLibrarySearch.ts` — Task 1 builds on this hook's cache
- `src/features/tasks/components/StrategyFollowUpDialog.tsx` — Task 1's integration surface
- `src/features/projects/components/ProjectSwitcher.tsx` — Task 3's only real surface; mirror the existing archived-toggle pattern
- `docs/architecture/projects-phases.md` — Task 3 doc update

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 2 migration)
- `docs/architecture/tasks-subtasks.md` (Task 2 data-model bullet)
- `docs/architecture/projects-phases.md` (Task 3 toggle note)
- `docs/dev-notes.md` (flip task-discriminator entry to resolved)
- `docs/AGENT_CONTEXT.md` (Task 3 toggle update)
- `src/shared/db/database.types.ts` (Task 2 column)
- `src/features/tasks/components/StrategyFollowUpDialog.tsx` (Task 1 integration)
- `src/features/projects/components/ProjectSwitcher.tsx` (Task 3 toggle)
- `spec.md` (Task 1: flip §6 recommender; Task 2: no §3.x flip needed — it's a dev-notes item; bump to 1.10.1)

**Will create:**
- `docs/db/migrations/2026_04_18_task_type_discriminator.sql`
- `docs/db/tests/task_type_discriminator.sql`
- `src/features/library/lib/related-templates.ts`
- `src/features/library/hooks/useRelatedTemplates.ts`
- `Testing/unit/features/library/lib/related-templates.test.ts`
- `Testing/unit/features/library/hooks/useRelatedTemplates.test.ts`
- `Testing/unit/features/tasks/components/StrategyFollowUpDialog.related.test.tsx`

**Explicitly out of scope this wave:**
- Embeddings-based similarity (RAG-style template recommendation) — Task 1 is a heuristic
- Consuming `task_type` in existing queries (Task 2 is additive-only)
- UI for Checkpoint-Based Architecture (§3.2 still deferred)
- Collaboration Suite (threaded comments, activity log, realtime presence)
- Gantt chart, PWA / offline mode, Localization (all still deferred)
- Any RLS policy change (Wave 24 closed the outstanding audit)
- Postgres-level test harness wiring into CI

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; keep `is_complete` and `status === 'completed'` in sync at the app layer (the DB trigger enforces it anyway — don't deliberately desync); template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'`); frontend/Deno recurrence + date helpers stay in lock-step; only add dependencies if truly necessary (motivate in the PR); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
