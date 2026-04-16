# Wave 19 Cleanup Plan

This document is the strict execution spec for the Wave 19 follow-up sprint. The preliminary audit identified five items — four confirmed bugs / tech debt and one finding that turned out to be a hardening opportunity rather than a bug. Execute each section in order. After all five sections land, the test baseline should rise from **385** to **≥387** and `npm run build && npm run lint && npm test` must be green.

**Branch:** Continue on `claude/wave-19-audit-findings-FOp2z`. Do NOT open a PR unless the user asks for one.

**Ground rules:**
- TypeScript only — no `.js`/`.jsx`, no weakening of ESLint, no `any`.
- Touch only the files listed in each section. No drive-by refactors.
- Run the build/lint/test triad after each section before moving on.

---

## 1. Harden `recalculateProjectDates` completion filter

**Problem.** The preliminary audit flagged that `recalculateProjectDates` might not filter out `status === 'completed'` tasks. The function currently filters on the boolean `is_complete` flag only. Per `CLAUDE.md` > Known Issues, the codebase has two completion signals (`is_complete` bool and `status = 'completed'` text) that can fall out of sync. The phase-unlock triggers rely on both. The date-shift recalc should match.

**File.** `src/shared/lib/date-engine/index.ts`

**Steps.**

1. Find the `DateEngineTask` type (top of file) and add `status?: string | null` to it so the new guard is type-safe.
2. In `recalculateProjectDates` (around line 333–335), replace:
   ```ts
   // Skip if task is completed (preserve history)
   if (task.is_complete) return;
   ```
   with:
   ```ts
   // Skip if task is completed by either signal (preserve history)
   if (task.is_complete || task.status === 'completed') return;
   ```
3. Check callers pass through `status`. In `src/features/projects/hooks/useProjectMutations.ts` line 82, `planter.entities.Task.filter({ root_id: projectId })` already returns full `Task` rows, and the cast to `DateEngineTask[]` will now include `status`. No other call-site changes needed.

**Acceptance.**
- `npm run build` — 0 errors.
- Existing date-engine unit tests still green.
- If a date-engine test file exists for `recalculateProjectDates`, add one case: a task with `is_complete: false, status: 'completed'` must be excluded from the returned updates array.

---

## 2. Seed publish state in `CreateTemplateModal`

**Problem.** `CreateTemplateModal.tsx` only manages `title`/`description`/`loading`. New templates are saved with `settings = null`, meaning they are implicitly unpublished — but there is no UI for the creator to decide. The sister `EditProjectModal` already has a Switch for this (`src/features/projects/components/EditProjectModal.tsx:139–150`). Mirror it at creation time.

**Files.**
- `src/features/dashboard/components/CreateTemplateModal.tsx`
- `src/pages/Dashboard.tsx` (the `onSubmit` handler passed into the modal)

**Steps.**

1. In `CreateTemplateModal.tsx`:
   - Add `import { Switch } from '@/shared/ui/switch';`
   - Add a new piece of state right after `description`:
     ```ts
     const [isPublished, setIsPublished] = useState(false);
     ```
   - Reset it in `handleSubmit` alongside the existing `setTitle('')` / `setDescription('')` lines: `setIsPublished(false);`.
   - Widen the `onSubmit` prop signature:
     ```ts
     onSubmit: (data: { title: string; description: string; isPublished: boolean }) => Promise<void>;
     ```
   - Update the `await onSubmit(...)` call to pass `isPublished` through.
   - Insert a published toggle block between the Description textarea and the submit Button, matching the shape of `EditProjectModal.tsx:139–150`:
     ```tsx
     <div className="flex items-center justify-between py-2">
       <div>
         <Label htmlFor="template-published" className="font-medium">Published</Label>
         <p className="text-xs text-slate-500 mt-0.5">Published templates are visible to all users in the library.</p>
       </div>
       <Switch
         id="template-published"
         checked={isPublished}
         onCheckedChange={setIsPublished}
       />
     </div>
     ```

2. In `src/pages/Dashboard.tsx` find the handler that feeds `CreateTemplateModal`'s `onSubmit` (around lines 58–88, the `planter.entities.Task.create(...)` call for templates). Accept the new `isPublished` value and pass through:
   ```ts
   await planter.entities.Task.create({
     // ...existing fields...
     settings: { published: isPublished },
   });
   ```
   If the handler currently spreads a settings object, merge — don't overwrite — other keys.

**Acceptance.**
- `npm run build` — 0 errors.
- Manually (or in a test) verify: creating a template with the Switch off writes `settings.published === false`; on writes `true`.
- Existing tests pass; no behavior change for templates created before this patch (they still read via `settings?.published === true` truthy checks).

---

## 3. Replace `'active'` literal with `PROJECT_STATUS.IN_PROGRESS`

**Problem.** `useDashboard.ts` filters by `p.status === 'active'`, but `'active'` is not a member of `PROJECT_STATUS` (see `src/shared/constants/domain.ts:29–34` — valid values are `planning`, `in_progress`, `launched`, `paused`). The `activeProjects` array is therefore always empty.

**Files.**
- `src/features/dashboard/hooks/useDashboard.ts`
- Any test mocks still using `status: 'active'` (grep and fix).

**Steps.**

1. At the top of `useDashboard.ts`, add:
   ```ts
   import { PROJECT_STATUS } from '@/shared/constants/domain';
   ```
2. Replace line 66:
   ```ts
   return Array.isArray(projects) ? projects.filter(p => p.status === 'active') : [];
   ```
   with:
   ```ts
   return Array.isArray(projects) ? projects.filter(p => p.status === PROJECT_STATUS.IN_PROGRESS) : [];
   ```
3. Run `Grep` (or `grep -rn "status: 'active'" Testing/`) to find stale test fixtures that rely on the old literal. Update them to `status: PROJECT_STATUS.IN_PROGRESS` (or `'in_progress'` where the test intentionally bypasses the enum). Do NOT mass-replace `'active'` anywhere that refers to `subscription_status` (e.g. `TaskDetailsView.tsx:44`) — that is a different domain.

**Acceptance.**
- `npm run build` — 0 errors.
- `npm test` — all green, and any dashboard-related test that exercised the filter now reports a non-empty `activeProjects` when fixtures include an `in_progress` project.

---

## 4. Route `listAllVisibleTemplates` through the `tasks_with_primary_resource` view

**Problem.** `useMasterLibrarySearch` calls `planter.entities.TaskWithResources.listAllVisibleTemplates`, but that method queries the raw `tasks` table. The sibling `listTemplates` and `searchTemplates` methods both use the `tasks_with_primary_resource` view (which LEFT JOINs the primary task resource). Result: the master-library grid loses resource metadata (cover image, attachment type).

**File.** `src/shared/api/planterClient.ts` (around lines 655–672).

**Steps.**

1. In `listAllVisibleTemplates`, change:
   ```ts
   let query = supabase
     .from('tasks')
     .select('*')
     .eq('origin', 'template')
     .is('parent_task_id', null);
   ```
   to:
   ```ts
   let query = supabase
     .from('tasks_with_primary_resource')
     .select('*')
     .eq('origin', 'template')
     .is('parent_task_id', null);
   ```
2. Leave the `viewerId` OR-filter (`creator.eq.${viewerId},settings->>published.eq.true`) and the ordering untouched — they match the pattern already used by `listTemplates` at L601 and `searchTemplates` at L632.
3. Do NOT change the return type; `tasks_with_primary_resource` is a superset of `tasks` columns, so the `as Task[]` cast still holds.

**Acceptance.**
- `npm run build` — 0 errors.
- Existing library tests still green.
- Smoke test via dev server: the Master Library grid shows the primary resource thumbnail/type for published templates that have resources attached.

---

## 5. Test coverage — `shiftedCount` + publish toggle

**Problem.** No assertion exists for the `{ shiftedCount }` return value from `useUpdateProject`, and `EditProjectModal` has no test file at all despite wiring the publish toggle.

**Files.**
- `Testing/unit/features/projects/hooks/useProjectMutations.test.ts` (extend)
- `Testing/unit/features/projects/components/EditProjectModal.test.tsx` (create)

**Steps.**

### 5a — Extend `useProjectMutations.test.ts`

Add two cases to the existing `describe('useUpdateProject', …)` block, following the fixture style already present in the file (the `makeTask`, `createWrapper`, `mockTaskFilter`, `mockTaskUpsert` helpers are already defined there).

1. **No-shift path returns `shiftedCount: 0`.** Call `mutateAsync` without changing `start_date` (omit `oldStartDate` or pass the same value). Assert `await result.current.mutateAsync(...)` resolves to `{ shiftedCount: 0 }` and that `mockTaskUpsert` was NOT called.

2. **Multi-task shift returns the upsert count.** Seed `mockTaskFilter` with 3 incomplete tasks + 1 completed task (`is_complete: true`). Shift `start_date` by 7 days. Assert:
   - The returned object is `{ shiftedCount: 3 }` (the completed task is filtered out by `recalculateProjectDates`).
   - `mockTaskUpsert` was called with exactly 3 entries.

### 5b — Create `EditProjectModal.test.tsx`

New file under `Testing/unit/features/projects/components/`. Follow the RTL + Vitest + `QueryClientProvider` pattern used by `useProjectMutations.test.ts`. Mock `useUpdateProject` and `useDeleteProject` via `vi.mock('@/features/projects/hooks/useProjectMutations', …)`.

Cases:

1. **Switch renders only for templates.** Render with `project.origin === 'template'` — assert `getByLabelText(/Published/)` is present and unchecked (fixture has no `settings.published`). Render with `project.origin === 'instance'` — assert `queryByLabelText(/Published/)` is null.

2. **Toggle persists to settings.** Template project, flip the Switch on, submit the form. Assert the mocked `mutateAsync` was called with a payload whose `updates.settings.published === true`.

3. **Toast reflects `shiftedCount`.** (Optional but recommended.) Mock `mutateAsync` to resolve `{ shiftedCount: 2 }`; mock the `sonner` toast module and assert `toast.success` was called with a message containing `"2 tasks rescheduled"`.

**Acceptance.**
- `npm test` — new count ≥ 387. All new tests green.
- `npm run lint` — 0 errors.
- `npm run build` — 0 errors.

---

## Final verification checklist

Before committing:

```bash
npm run build   # 0 errors
npm run lint    # 0 errors
npm test        # ≥387 passing
```

Commit each section as its own logical commit if possible (`fix(date-engine): …`, `feat(templates): …`, `fix(dashboard): …`, `fix(library): …`, `test: …`). Push to `claude/wave-19-audit-findings-FOp2z`. Do not open a PR unless the user asks.
