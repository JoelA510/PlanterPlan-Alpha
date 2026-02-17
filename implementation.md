## Antigravity Gemini 3 Pro (High) Implementation Plan -> PlanterPlan-Alpha v1.0 Stabilization

### Working State

* **Goal:** Stabilize existing flows (projects, templates, tasks, invites, DnD) to a reliable v1.0.
* **Constraints:** No feature creep. Only fix/complete existing behavior already present in code/DB.
* **Primary symptoms to clear (per reviewer):**

  * Cannot view template milestones/tasks
  * Cannot change task completeness
  * Editing tasks broken
  * Expand/collapse subtasks broken
  * Inviting members broken
  * Drag-and-drop reordering broken

---

## Phase 0 -> Baseline + Repro Harness (must do first)

1. **Sync + install**

   * `npm ci`
   * `npm run lint`
   * `npm test`
   * `npx playwright test` (if configured locally)

2. **Repro script (manual)**

   * Open an **instance project** -> verify you can see phases/milestones/tasks.
   * Try:

     * Change status to “Completed”
     * Edit task title/description
     * Expand a task with a subtask
     * Invite member by email
     * Drag task within same parent
     * Drag task into another parent (child-context drop)
   * Open a **template** -> verify milestones/tasks appear.

3. **Log capture rule**

   * Keep DevTools console open and record:

     * Any 4xx/5xx from `/rest/v1/...` and `/rest/v1/rpc/...`
     * Any “column does not exist” or RLS errors

---

## Phase 1 -> Database integrity + permissions (fixes that unblock multiple UI failures)

### 1A) Enforce root_id consistency for non-root tasks (fixes templates visibility, subtasks, editing, DnD)

**Why:** Multiple code paths assume descendants are discoverable by `root_id`. If any subtree rows have `root_id` NULL or wrong, hydration/tree building breaks.

**Apply SQL (Supabase SQL Editor):**

```sql
-- Backfill root_id for all descendants (root rows keep root_id as-is)
WITH RECURSIVE tree AS (
  SELECT id, parent_task_id, id AS root
  FROM public.tasks
  WHERE parent_task_id IS NULL
  UNION ALL
  SELECT t.id, t.parent_task_id, tree.root
  FROM public.tasks t
  JOIN tree ON t.parent_task_id = tree.id
)
UPDATE public.tasks t
SET root_id = tree.root
FROM tree
WHERE t.id = tree.id
  AND t.parent_task_id IS NOT NULL
  AND (t.root_id IS DISTINCT FROM tree.root);

-- Constraint: any child must have root_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_root_id_required_for_children'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_root_id_required_for_children
      CHECK (parent_task_id IS NULL OR root_id IS NOT NULL);
  END IF;
END $$;

-- Trigger: auto-set NEW.root_id from parent (covers inserts + reparenting)
CREATE OR REPLACE FUNCTION public.set_root_id_from_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_task_id IS NOT NULL AND NEW.root_id IS NULL THEN
    SELECT COALESCE(root_id, id)
    INTO NEW.root_id
    FROM public.tasks
    WHERE id = NEW.parent_task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_root_id_from_parent ON public.tasks;
CREATE TRIGGER trg_set_root_id_from_parent
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_root_id_from_parent();
```

**Validation**

* Re-open a template -> milestones/tasks should hydrate (if the only cause was root_id).
* Create a subtask -> it should appear under its parent after refresh.

---

### 1B) Invite security + make invites actually work

**Problem pattern in code:** frontend tries direct insert into `project_members` for existing users, and only calls the RPC for “non-existing users”. After RLS tightening, direct insert frequently fails.

**DB side (minimum hardening):** Update `invite_user_to_project` to enforce hierarchy (editor cannot assign owner). Your existing function in the dump does **not** enforce this.

**Apply SQL (replace body with role enforcement):**

* Add checks:

  * inviter must be admin/owner/editor
  * if inviter == editor -> `p_role != 'owner'`
  * prevent editor from modifying an existing owner

(Use the exact hardened function you already drafted in your consolidated plan; keep it as the single “source of truth”.)

**Validation**

* As owner -> invite a user as editor/viewer works
* As editor -> inviting owner fails with clear error

---

## Phase 2 -> Frontend fixes mapped 1:1 to the reviewer’s broken items

### 2A) “Cannot change completeness status”

**Root cause:** UI changes `status`, but DB automation (and much of UI) keys off `is_complete` (see `check_phase_unlock()` in schema). Status-only updates will not flip completion.

**Patch location:** `src/features/tasks/components/TaskList.jsx:211-212`
Current:

```js
onStatusChange={(taskId, status) => updateTask(taskId, { status })}
```

Replace:

```js
onStatusChange={(taskId, status) =>
  updateTask(taskId, {
    status,
    is_complete: status === 'completed',
  })
}
```

**Also patch server-side propagation (recommended):** `src/features/tasks/services/taskService.js` (function `updateTaskStatus`)

* Ensure it writes `is_complete` alongside `status`
* When recursively applying to descendants, apply both fields

**Validation**

* Set a task to Completed -> it remains completed after reload
* Phase unlock logic triggers when all children completed (if applicable)

---

### 2B) “Editing tasks broken” + “Expand/collapse subtasks broken” (usually same underlying data bug)

**Primary likely cause:** incorrect/unstable `root_id` derivation in client mutations causes tasks to “disappear” from the hydrated tree after edits, and children not being included in project hydration.

**Patch location:** `src/features/tasks/hooks/useTaskMutations.js:37-56` (rootId logic)
Current:

```js
const rootId = parentTask?.root_id || parentTask?.id || null;
```

Replace with a resolver that climbs to a stable root:

```js
const resolveRootId = (task) => {
  if (!task) return null;
  if (task.root_id) return task.root_id;
  // If task is itself a root, treat its id as the root anchor
  if (!task.parent_task_id) return task.id;

  let cur = task;
  const seen = new Set();
  while (cur && !cur.root_id && cur.parent_task_id && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = findTask(cur.parent_task_id);
  }
  return cur?.root_id || cur?.id || task.id;
};
```

Then use:

* `const rootId = resolveRootId(parentTask);`
* In `_refreshTaskContext`, stop relying on `parentTask.root_id` only; use `resolveRootId(parentTask)`.

**Critical schema mismatch check (do not skip):**

* The current code writes `milestone_id` in inserts/updates:

  * `src/features/tasks/hooks/useTaskMutations.js:140-146`
* Your `remote_schema_dump.sql` tasks table does **not** define `milestone_id`.
* If your console/network shows “column milestone_id does not exist”, remove it from payloads immediately.

**Validation**

* Edit a task title -> stays visible in the same place
* Expand/collapse works and children render reliably after add/edit/delete
* No “missing column” errors in Network responses

---

### 2C) “Inviting members broken”

**Patch location:** `src/shared/api/planterClient.js:415-458` (`Project.addMemberByEmail`)
Current behavior:

* queries `profiles` by `email`
* if found -> direct insert into `project_members`
* else -> calls `rpc/invite_user_to_project`

Replace with “always call RPC” (single consistent path):

```js
addMemberByEmail: async (projectId, email, role) => {
  return retryOperation(async () => {
    return rawSupabaseFetch('rpc/invite_user_to_project', {
      method: 'POST',
      body: JSON.stringify({
        p_project_id: projectId,
        p_email: email,
        p_role: role,
      }),
    });
  });
},
```

Optional: keep `addMember()` for internal/testing only; UI should use the RPC path.

**Validation**

* Invite an existing user -> membership added via RPC
* Invite a non-existing user -> invite record created via RPC
* Works under tightened RLS

---

### 2D) “Drag and drop to rearrange tasks broken”

There are two separate issues to clear:

#### Issue 1: Wrong parent inference when dropping over a task item

**Patch location:** `src/features/task-drag/lib/dragDropUtils.js`
Current logic sets `newParentId = null` unless over a container id. When you drop over a task item, it treats it like moving to `parent_task_id = null` (tasks disappear / move out of project).

**Fix rule:** if dropping over a task item, inherit that over-task’s `parent_task_id`.

Pseudo-patch:

```js
export const calculateDropTarget = (active, over, tasks) => {
  if (!over) return null;

  const activeId = String(active.id);
  const overId = String(over.id);
  const overData = over.data.current || {};
  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return null;

  let newParentId = null;

  if (overData.isContainer && overData.taskId) {
    // dropping into project container -> parent is the project root task
    newParentId = overData.taskId;
  } else if (overId.startsWith('child-context-') && overData.taskId) {
    // dropping into a task's child-context -> parent becomes that task
    newParentId = overData.taskId;
  } else {
    // dropping over a sortable task item -> keep that item's parent
    const overTask = tasks.find((t) => t.id === overId);
    newParentId = overTask?.parent_task_id ?? null;
  }

  // continue with siblingTasks based on newParentId...
};
```

#### Issue 2: UI not updating after successful DnD

**Patch location:** `src/features/task-drag/model/useTaskDrag.js`
Currently it may persist but not refresh state deterministically.

**Fix:** after successful `updateTasksBatch(...)`, call `commitOptimisticUpdate()` (if provided) to refetch/hydrate.

```js
await updateTasksBatch(updatedTasks);

if (commitOptimisticUpdate) {
  await commitOptimisticUpdate();
}
```

#### Issue 3 (likely in real data): position gaps too small -> newPos becomes null

**Patch location:** `useTaskDrag.js`
If `newPos` is null, call `renormalizePositions(...)` once, then retry the drop calculation.

**Validation**

* Drag within same parent -> reorders and persists after reload
* Drag into another parent via child-context -> reparent + reorder persists
* No tasks “vanish” after drop

---

### 2E) “Cannot see template milestones/tasks” (after Phase 1 root_id fix)

If still broken after root_id backfill:

1. Confirm hydration is triggered on template selection:

   * `src/features/tasks/hooks/useTaskBoard.js:114-129` (`handleSelectProject`)
2. Confirm `fetchTaskChildren()` actually returns descendants:

   * `src/features/tasks/services/taskService.js:24-95`

If `root_id` still cannot be relied on (legacy data), add a temporary fallback:

* In `fetchTaskChildren()`, if `filter({ root_id })` returns empty, do a BFS by `parent_task_id` starting at the template root.

(Keep this fallback narrow: only when root_id query returns 0 rows.)

---

## Phase 3 -> Due dates missing (fix without adding new features)

**Symptom:** Projects/templates exist, but tasks show no due dates.

**Cause:** clone/insert paths frequently set `start_date`/`due_date` null for descendants even when `days_from_start` exists.

**Minimum fix:** after cloning a template into a project, run a “schedule apply” pass:

* Base date: project root `start_date` (or chosen launch date)
* For each descendant: set `start_date` and `due_date` to `base + days_from_start`

Where to implement:

* `src/features/projects/hooks/useProjectMutations.js` after `deepCloneTask(...)`

  * fetch all tasks under root
  * compute + batch update (use `updateTasksBatch`)

**Validation**

* Newly created project from template shows dates populated for milestones/tasks
* Reload does not erase dates

---

## Phase 4 -> Regression gates (definition of done)

1. **Automated**

   * `npm run lint`
   * `npm test`
   * `npx playwright test` (if e2e is part of your v1.0 gate)

2. **Manual smoke (exact)**

   * Template -> open -> view milestones/tasks
   * Instance project -> open -> expand/collapse -> edit task -> persists
   * Status -> completed -> persists and unlock logic works
   * Invite -> existing + new email
   * DnD -> reorder within parent + reparent into another task -> persists

---

## Highest-probability root causes mapped to reviewer notes (for fast triage)

* **Template tasks not visible:** inconsistent/missing `root_id` on template descendants -> hydration returns 0
* **Completeness “broken”:** UI updates `status` only; DB logic uses `is_complete`
* **Editing/expand-collapse “broken”:** root_id mis-derivation on mutations causes tasks to fall out of hydrated dataset
* **Invites “broken”:** mixed direct insert vs RPC path; direct insert blocked under RLS
* **DnD “broken”:** drop target parent inference sets `parent_task_id = null` when dropping over task items + missing post-success refresh

If Gemini needs exact starting patch set, prioritize in this order:

1. TaskList.jsx status -> also set is_complete
2. dragDropUtils.js parent inference + useTaskDrag.js refresh on success
3. planterClient.js addMemberByEmail -> always call invite_user_to_project RPC
4. root_id SQL backfill + trigger + client root resolver in useTaskMutations
5. schedule apply pass for days_from_start after template clone
