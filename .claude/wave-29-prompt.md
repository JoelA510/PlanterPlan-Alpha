## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 28 shipped to `main`:
- Gantt chart at `/gantt?projectId=:id` — read-only render + drag-to-shift dates with full date-engine cascade respect
- New `features/gantt/` slice with `ProjectGantt`, `useGanttDragShift`, `tasksToGanttRows` adapter
- Lazy-loaded route chunk; one new gantt-rendering dep added with motivation in the PR

Spec is at **1.13.0**. Outstanding roadmap: §3.2 Checkpoint-Based Architecture, §3.2 Advanced Access (backlog item — promote in this wave), §3.7 platform/admin/monetization, §3.8 mobile infra, §3.1 localization, plus the Wave 37 architecture-doc gap closures.

Wave 29 ships **two related items together**: the Checkpoint-Based Architecture for §3.2 (alternate project type that gates phase progression by sibling completion instead of date), and the long-deferred §3.2 Advanced Access (Phase Lead) backlog item — they pair naturally because both reshape per-phase access semantics. The dashboard donut chart for checkpoint phases (the `dashboard-analytics.md` known-gap) closes alongside.

**Gate baseline going into Wave 29:** confirm the current `main` baseline. Run `npm run lint`, `npm run build`, `npx vitest run`. Record the test count from Wave 28's verification gate as the starting baseline.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-29-checkpoint-projects`
- Task 2 → `claude/wave-29-phase-lead`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 29 scope

Two tasks. Task 1 is the bigger lift (alternate project kind, date-engine carve-out, donut chart). Task 2 is a tighter RLS + UI change that promotes the §3.2 Advanced Access backlog bullet.

---

### Task 1 — Checkpoint-based project type

**Commit:** `feat(wave-29): checkpoint project kind + sequential phase unlock + donut visualization`

A new "kind" of project that drops the rigid date model in favor of sequential phase gating. Phase N is locked until Phase N-1 hits 100% completion. The existing `is_locked` and `prerequisite_phase_id` columns on `tasks` are already wired into the DB-level unlock triggers (`check_phase_unlock`, `handle_phase_completion`); this wave wires the project-level "kind" toggle, the date-engine carve-out, the donut UI, and the RLS-respecting unlock UX.

1. **Project kind discriminator** (`docs/db/migrations/2026_XX_XX_project_kind.sql`, NEW)
   - Convention: store on the **root task's** `settings` JSONB as `settings.project_kind: 'date' | 'checkpoint'` (defaults to `'date'` when absent — matches every existing project's behavior). No new column — follows the `settings.published` / `settings.recurrence` precedent.
   - **However**, also write a **CHECK constraint** at the table level via a `tasks_project_kind_check`-style constraint applied only to root rows: `ADD CONSTRAINT tasks_project_kind_check CHECK (parent_task_id IS NOT NULL OR settings ->> 'project_kind' IS NULL OR settings ->> 'project_kind' IN ('date','checkpoint'))`. This keeps the JSONB safe at the DB layer without a column.
   - **Backfill confirmation only**: no UPDATE needed — absence of the key already means `'date'`. Document this in the migration header.
   - Mirror the constraint into `docs/db/schema.sql`.

2. **Domain types + helper** (`src/shared/db/app.types.ts`, `src/features/projects/lib/project-kind.ts` NEW)
   - Extend `TaskSettings` with `project_kind?: 'date' | 'checkpoint'`.
   - Helper trio mirrors the `coaching-form` / `strategy-form` precedent:
     - `extractProjectKind(rootTask): 'date' | 'checkpoint'` (defaults `'date'` when absent).
     - `formDataToProjectKind(data): 'date' | 'checkpoint' | null` (null = no change).
     - `applyProjectKind(currentSettings, kind): Json` — preserves all other settings keys.

3. **Edit Project modal** (`src/features/projects/components/EditProjectModal.tsx`)
   - Add a Shadcn `RadioGroup` toggle: "Project type" → `Date-driven (default)` | `Checkpoint-based`.
   - **Switching from `date` → `checkpoint` is allowed and additive** (date-engine carve-out below makes existing dates render as informational only).
   - **Switching from `checkpoint` → `date` requires a confirmation `AlertDialog`**: "Switching back to date-driven will re-enable due-date logic and may flag existing tasks as overdue. Continue?" — the operator confirms. Once confirmed, the kind flips and the user may need to use the existing project-edit date-shift to re-anchor the timeline.

4. **Date Engine carve-out** (`src/shared/lib/date-engine/index.ts`)
   - New helper `isCheckpointProject(rootTask): boolean` exported. Read-only — no caller in this file.
   - In `recalculateProjectDates`: short-circuit and return `{ shifted: 0, skipped: descendants.length }` when `isCheckpointProject(root) === true`. Add a JSDoc note: "Checkpoint projects intentionally don't bulk-shift — phase progression is unlock-driven, not date-driven."
   - In `deriveUrgency`: when called on a task whose root is checkpoint, return `'not_started'` for everything that isn't already `completed`/`in_progress`/`blocked`. The urgency states `due_soon` and `overdue` are meaningless for checkpoint projects (no due dates).
   - In `supabase/functions/nightly-sync/`: also short-circuit the urgency-transition pass for checkpoint projects (read `settings.project_kind` from each project root before applying transitions). The recurrence pass is unaffected (templates are project-kind-agnostic).
   - **Lock-step requirement** — add a Deno mirror of `isCheckpointProject` to `supabase/functions/_shared/date.ts` so the nightly-sync carve-out can read it. Keep the two implementations in lock-step (precedent: Wave 21 recurrence helpers).

5. **Phase-lock UX** (`src/features/tasks/components/TaskList.tsx`, `PhaseCard.tsx`)
   - When `extractProjectKind(rootTask) === 'checkpoint'`, render a small lock icon on every phase whose `is_locked === true`. The phase row is still expandable (visible) but its tasks render as `text-slate-400` and the status checkbox is `disabled`.
   - When the previous phase reaches 100% complete (existing `check_phase_unlock` trigger fires), the lock automatically lifts — the realtime subscription on the project (`Project.tsx` channel) picks it up and re-renders. Verify this flow in the smoke test below.

6. **Donut visualization for checkpoint phases** (`docs/architecture/dashboard-analytics.md` known gap)
   - Replace the standard progress bar inside `src/features/projects/components/PhaseCard.tsx` with the existing donut from `src/features/projects/components/ProjectHeader.tsx` (shipped Wave 19) **only when the project kind is `checkpoint`**. Date-driven projects keep their bar.
   - Donut shows `completed / total` ratio across the phase's tasks. Color: brand-500 fill, slate-200 track.
   - Center label: `{percentage}%` or `Locked` when `is_locked === true`.
   - Closes the `dashboard-analytics.md` "Donut Charts for Checkpoint-based project phases" known-gap.

7. **Architecture doc** (`docs/architecture/projects-phases.md`)
   - Expand the existing "Checkpoint-Based Projects" section into the SSoT for this wave: kind discriminator location (`settings.project_kind`), the date-engine carve-out (with cross-ref to `date-engine.md`), the unlock trigger flow (`check_phase_unlock` is unchanged — it already does the work; the new bit is the project-kind gating), the kind-switch reversal AlertDialog UX, the donut-vs-bar swap.
   - Update `docs/architecture/date-engine.md` "Business Rules & Constraints" with a new bullet: "Checkpoint projects: `recalculateProjectDates` and `deriveUrgency` short-circuit; nightly-sync skips urgency transitions; due dates render as informational only."
   - Update `docs/architecture/dashboard-analytics.md` to flip the "Donut Charts for Checkpoint-based project phases" gap to **Resolved (Wave 29)**.

8. **Tests**
   - `Testing/unit/features/projects/lib/project-kind.test.ts` (NEW) — extract/apply/formDataTo helper trio, mirroring `coaching-form.test.ts`.
   - `Testing/unit/shared/lib/date-engine/checkpoint.test.ts` (NEW) — `recalculateProjectDates` short-circuits for checkpoint root; `deriveUrgency` returns `not_started` for non-completed checkpoint tasks; `isCheckpointProject` honors absence-as-date.
   - `Testing/unit/features/projects/components/EditProjectModal.kind.test.tsx` (NEW) — radio toggle renders; checkpoint-to-date switch shows confirmation dialog; submit fires expected `useUpdateProject` payload.
   - `Testing/unit/features/projects/components/PhaseCard.donut.test.tsx` (NEW) — bar renders for date-kind, donut renders for checkpoint-kind, locked phase shows "Locked" center label.
   - Manual `psql` smoke at `docs/db/tests/checkpoint_unlock.sql` — exercise the existing `check_phase_unlock` trigger on a checkpoint project (set `is_locked = true` on phase 2, mark phase 1 complete, observe phase 2 unlock).

**DB migration?** Yes — one CHECK constraint addition (additive, revertable).

**Out of scope:**
- A migration that retroactively classifies any existing project as `'checkpoint'` (default-`'date'` is the right behavior; users who want checkpoint flip the toggle themselves).
- Auto-suggesting checkpoint kind based on whether a project has dates set (deferred — could be a Wave 33 admin nice-to-have).
- Fancy unlock animations (just refresh + chevron).
- Cross-phase prerequisite chains beyond the existing `prerequisite_phase_id` (already supported by the trigger — scope is wiring, not extending).

---

### Task 2 — Advanced Access (Phase Lead)

**Commit:** `feat(wave-29): assign limited viewer as Phase Lead with scoped UPDATE policy`

Closes the `[-]` "Advanced Access: Assign Phase/Milestone to a limited viewer" backlog item from §3.2. A Project Owner may assign a `viewer`-role member as the **Lead** of a specific phase or milestone; that member may then read AND update tasks under that phase/milestone (but no other phases). Mirrors the Coaching pattern from Waves 22/23 — additive RLS policy + UI affordance — but scoped by hierarchy ancestry instead of a per-task flag.

1. **RLS migration** (`docs/db/migrations/2026_XX_XX_phase_lead_rls.sql`, NEW)
   - **Helper function**: `public.is_phase_lead_for_task(task_row tasks, uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''`. Body: walks up `parent_task_id` until it hits a row with `assignee_id = uid` or NULL; returns true if found, false otherwise.
   - **Wait** — the existing `tasks.assignee_id` column is already used for individual task assignment. We need a *separate* concept of "phase lead" so that assigning a person to a milestone doesn't automatically grant them edit on every task under it via `assignee_id`. **Decision**: store phase-lead assignments in `settings.phase_lead_user_ids: string[]` on the phase or milestone row. A phase has a list (allow multiple leads in a phase). Helper rewrites:
   - `public.user_is_phase_lead(target_task_id uuid, uid uuid) RETURNS boolean` — recursive CTE walks `parent_task_id` from `target_task_id`, checks each ancestor's `settings -> 'phase_lead_user_ids'` array via `? uid::text`. Returns true on first match. Stops at root.
   - **Additive UPDATE policy** on `public.tasks`: `"Enable update for phase leads on tasks under their phase"` — `USING (origin = 'instance' AND user_is_phase_lead(id, auth.uid()))`. Mirrors the Coaching policy precedent (Wave 22).
   - **No SELECT change** — viewer role already grants project-wide SELECT on tasks. The new policy widens UPDATE only.
   - Mirror everything into `docs/db/schema.sql`.

2. **Domain types + helper** (`src/features/projects/lib/phase-lead.ts`, NEW)
   - Helper trio:
     - `extractPhaseLeads(task): string[]` → reads `settings.phase_lead_user_ids` safely (returns `[]` when absent).
     - `addPhaseLead(currentSettings, userId): Json` — append + dedupe.
     - `removePhaseLead(currentSettings, userId): Json` — filter.
   - Extend `TaskSettings` with `phase_lead_user_ids?: string[]`.

3. **UI — Phase Lead picker** (`src/features/tasks/components/TaskFormFields.tsx` + `TaskDetailsView.tsx`)
   - On a Phase or Milestone task (`task_type IN ('phase','milestone')` — Wave 25's discriminator pays off here), show a "Phase Leads" multi-select field. Owner-only (gate by `membershipRole === 'owner'`).
   - Source the multi-select options from `useProjectMembers(projectId)` filtered to `role === 'viewer' || role === 'limited'` (limited users are the only ones who'd benefit; owners/editors already have project-wide UPDATE).
   - Submit emits a flat `phase_lead_user_ids: string[]` field; the submit-merge in `TaskList.tsx` calls `applyPhaseLeads`.
   - On `TaskDetailsView`: when `extractPhaseLeads(task).length > 0`, render a "Phase Leads: @user1, @user2" badge row (purple — distinct from coaching/strategy badges).

4. **Architecture doc** (`docs/architecture/auth-rbac.md`)
   - Update the Project Role Permission Matrix to add a footnote: "**Limited viewers may also edit tasks under any phase or milestone they are designated as Phase Lead for** (see Phase Lead section below)."
   - New `### Phase Lead (Wave 29)` section under "Business Rules & Constraints". Document: how to designate (Edit Task on phase/milestone → Phase Leads picker, owner-only); RLS policy name + migration file; the recursive ancestor-walk used by `user_is_phase_lead`; the cap (no cap — multiple leads per phase, single user can lead multiple phases).

5. **Tests**
   - `Testing/unit/features/projects/lib/phase-lead.test.ts` (NEW) — extract/add/remove dedupe, settings preservation.
   - `Testing/unit/features/tasks/components/TaskFormFields.phaseLead.test.tsx` (NEW) — picker visible only for owners on phase/milestone rows; submit payload shape.
   - Manual `psql` smoke at `docs/db/tests/phase_lead_rls.sql` — exercise: viewer with no phase-lead assignment cannot UPDATE a task; viewer with phase-lead on milestone CAN UPDATE a task under that milestone; same viewer CANNOT update a task under a sibling milestone.

**DB migration?** Yes — one helper function + one additive RLS policy. Revertable.

**Out of scope:**
- Project-Owner-can-be-Phase-Lead UX (owners already have project-wide UPDATE; the picker filters them out).
- Per-task lead designation finer than phase/milestone level (defer — the §3.2 backlog item is phrased as Phase/Milestone scope).
- Notification when assigned as Phase Lead (Wave 30).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.2 Checkpoint-Based Architecture to `[x]` with a note pointing to `settings.project_kind` + `docs/architecture/projects-phases.md`. Promote §3.2 Advanced Access from `[-]` (Backlog) to `[x]` shipped, with the Phase Lead pointer. Bump version to **1.14.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Checkpoint Project Kind (Wave 29)" and "Phase Lead (Wave 29)" golden-path bullets. List `settings.project_kind` and `settings.phase_lead_user_ids` alongside the existing `settings.is_coaching_task` etc.
3. **`docs/architecture/projects-phases.md`** — Checkpoint section is the SSoT; cross-references in.
4. **`docs/architecture/auth-rbac.md`** — Phase Lead section is in; matrix footnote added.
5. **`docs/architecture/date-engine.md`** — Checkpoint carve-out bullet is in.
6. **`docs/architecture/dashboard-analytics.md`** — Checkpoint donut gap flipped to Resolved.
7. **`docs/architecture/tasks-subtasks.md`** — append a one-line cross-ref to the Phase Lead RLS policy under the existing wave-tagged sections.
8. **`docs/dev-notes.md`** — no entry expected. Confirm currency.
9. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 29 (Checkpoint + Phase Lead)`, update `last_completed`, `spec_version`, add `wave_29_highlights:` block.
10. **`CLAUDE.md`** — under Schema Overview, add a one-line note about `settings.project_kind` and `settings.phase_lead_user_ids` being canonical settings keys (alongside the existing `published` / `recurrence` / etc. mention).

Land docs as `docs(wave-29): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Kind switch reversibility** — flip a project to checkpoint, mark phase 1 complete, see phase 2 unlock. Flip back to date — confirmation dialog appears; submit; due dates re-engage. Flip to checkpoint again. The whole cycle should be lossless.
2. **Date-engine quietness on checkpoint projects** — open the dev console while interacting with a checkpoint project. The nightly-sync function logs (visible via `supabase functions serve nightly-sync` locally) should report 0 urgency transitions for that project.
3. **Phase Lead RLS** — manual psql smoke per Task 2; **also** sign in as the assigned phase lead in the dev UI and confirm the per-task status checkbox is enabled on assigned-phase tasks and disabled on others.
4. **Donut renders correctly for both kinds** — date-kind project shows bar; checkpoint shows donut; locked checkpoint phase shows "Locked" center label.
5. **No FSD drift** — `features/projects/lib/project-kind.ts` and `features/projects/lib/phase-lead.ts` mirror the `coaching-form` precedent. No barrel files. No new dependencies.
6. **Type drift** — `database.types.ts` may not have changed (no new column), but verify.
7. **Lock-step Deno mirror** — `supabase/functions/_shared/date.ts` carries `isCheckpointProject` byte-equivalent to the frontend; document the lock-step rule in the file header.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 30)

After both Tasks 1 and 2 PRs merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 2 task commits + 1 docs sweep commit.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 30** until `main` is green and the Documentation Currency Pass has merged.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** create a project → Edit → flip to Checkpoint → see lock icons on phases 2+. Mark phase 1 tasks complete one by one — donut fills; at 100%, phase 2 unlocks (re-render via realtime channel). Flip back to Date — confirmation dialog → submit → due dates resume rendering, donuts revert to bars.
- **Task 2:** as Owner, assign a `viewer`-role member as Phase Lead on a milestone. Sign in as that member → confirm the milestone's tasks are editable, sibling milestones are read-only. Sign in as a viewer with **no** Phase Lead assignment → confirm everything is read-only.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/projects-phases.md` — host doc for Task 1's checkpoint section
- `docs/architecture/auth-rbac.md` — host doc for Task 2's Phase Lead section
- `docs/architecture/date-engine.md` — must update Integration Points
- `docs/architecture/dashboard-analytics.md` — close the donut chart known-gap
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — additive UPDATE policy precedent (Wave 22) — Task 2 mirrors this shape
- `src/features/tasks/lib/coaching-form.ts` — helper-trio precedent for both Task 1 (`project-kind.ts`) and Task 2 (`phase-lead.ts`)
- `src/features/projects/components/ProjectHeader.tsx` — donut chart precedent (Wave 19) for Task 1's PhaseCard swap
- `supabase/functions/_shared/date.ts` — Deno mirror site; Task 1's `isCheckpointProject` lives here too

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Tasks 1 + 2 migrations)
- `docs/architecture/projects-phases.md` (Checkpoint SSoT)
- `docs/architecture/auth-rbac.md` (Phase Lead section)
- `docs/architecture/date-engine.md` (Checkpoint carve-out bullet)
- `docs/architecture/dashboard-analytics.md` (donut gap → Resolved)
- `docs/architecture/tasks-subtasks.md` (Phase Lead one-line cross-ref)
- `docs/AGENT_CONTEXT.md` (Wave 29 golden-path bullets)
- `docs/dev-notes.md` (currency check)
- `src/shared/db/app.types.ts` (`TaskSettings.project_kind`, `phase_lead_user_ids`)
- `src/shared/lib/date-engine/index.ts` (`isCheckpointProject`, carve-outs)
- `src/features/projects/components/EditProjectModal.tsx` (kind picker + reversal dialog)
- `src/features/projects/components/PhaseCard.tsx` (donut/bar swap)
- `src/features/tasks/components/TaskList.tsx` (phase-lock UX, submit-merge for phase leads)
- `src/features/tasks/components/TaskFormFields.tsx` (Phase Leads multi-select)
- `src/features/tasks/components/TaskDetailsView.tsx` (Phase Leads badge row)
- `supabase/functions/_shared/date.ts` (Deno mirror of `isCheckpointProject`)
- `supabase/functions/nightly-sync/index.ts` (skip checkpoint projects in urgency pass)
- `spec.md` (flip §3.2 Checkpoint + §3.2 Advanced Access, bump to 1.14.0)
- `repo-context.yaml` (Wave 29 highlights)
- `CLAUDE.md` (settings keys note)

**Will create:**
- `docs/db/migrations/2026_XX_XX_project_kind.sql`
- `docs/db/migrations/2026_XX_XX_phase_lead_rls.sql`
- `docs/db/tests/checkpoint_unlock.sql`
- `docs/db/tests/phase_lead_rls.sql`
- `src/features/projects/lib/project-kind.ts`
- `src/features/projects/lib/phase-lead.ts`
- `Testing/unit/features/projects/lib/project-kind.test.ts`
- `Testing/unit/features/projects/lib/phase-lead.test.ts`
- `Testing/unit/shared/lib/date-engine/checkpoint.test.ts`
- `Testing/unit/features/projects/components/EditProjectModal.kind.test.tsx`
- `Testing/unit/features/projects/components/PhaseCard.donut.test.tsx`
- `Testing/unit/features/tasks/components/TaskFormFields.phaseLead.test.tsx`

**Explicitly out of scope this wave:**
- Project-kind auto-detection / suggestion
- Bulk-flip multiple projects to checkpoint via admin tool (Wave 33 if needed)
- Notification when assigned as Phase Lead (Wave 30)
- Cross-phase prerequisite chain editor UI (the column exists; setting it via UI is deferred)
- Mobile-friendly phase-lock UX polish (Wave 32)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (the date-engine carve-out in Task 1 must use `date-engine` helpers — never bypass with raw arithmetic); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'` — checkpoint kind is instance-only; templates have no project_kind); frontend/Deno date helpers stay in lock-step (`isCheckpointProject` is mirrored — keep it byte-equivalent); only add dependencies if truly necessary (Wave 29 should add **zero** new npm deps); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
