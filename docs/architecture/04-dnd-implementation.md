## Assumptions

- **Repo**: `JoelA510/PlanterPlan-Alpha` is CRA (not Vite/Next), uses **Supabase**, and renders tasks as a **recursive tree** (TaskItem -> children).
- **Data**: tasks are stored in a **flat array** and transformed into a tree for rendering.
- **Ordering**: a `position` field exists and is used for sort order; `parent_task_id` (or similar) controls hierarchy.
- **Scope**: implement **reorder within same parent** first; **reparenting** is allowed only when explicitly enabled and validated.

---

# Definitive prompt for Gemini 3 High Reasoning (Antigravity IDE)

Repo: `JoelA510/PlanterPlan-Alpha`
Branch: `feature/dnd-kit-tree-reorder`

## Objective

Add robust, accessible, nested Drag-n-Drop reordering for hierarchical tasks using `@dnd-kit` with:

- explicit container IDs per list (roots + per-parent child lists)
- droppable empty containers (so you can drop into an empty child list)
- keyboard-accessible drag handles
- safe persistence using `position` with renormalization to prevent gap collapse

dnd-kit specifics to follow:

- `SortableContext` supports an explicit `id`; sortable item `data` includes the associated `containerId` for advanced cases. ([dnd-kit Documentation][1])
- `useSortable` ids must match the `items` list in the nearest `SortableContext`. ([dnd-kit Documentation][2])
- Keyboard sensor requires the activator to be focusable; follow the accessibility guidance. ([dnd-kit Documentation][3])
- Use `useDroppable` to register container drop zones (attach `setNodeRef`). ([dnd-kit Documentation][4])
- Multiple containers are supported; cross-container insertion can be handled via `onDragOver` if needed. ([dnd-kit Documentation][5])
- `DragOverlay` is available for a “ghost” item and smoother cross-container UX. ([dnd-kit Documentation][6])
- Collision algorithms are configurable in `DndContext`. ([dnd-kit Documentation][7])

## Constraints (must follow)

- CRA env names only: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- No secrets logged; no full keys/URLs in output
- Keep diff small; no repo-wide formatting; no build artifacts
- CI uses `npm ci` -> lockfile must be updated if deps change
- Conventional Commits
- If DB schema changes are required, keep it minimal and add RLS if new tables are introduced (avoid `SECURITY DEFINER`)

---

## Plan

### 0) Preflight checks (blockers)

1. Confirm the type of `tasks.position` in DB:
   - If **numeric/float/double** -> midpoint strategy is OK.
   - If **integer** -> midpoint will truncate; use integer spacing + renormalize on every move OR migrate column to numeric (prefer app-side integer spacing if you want to avoid schema changes).

2. Identify the three root sections and how “origin” is represented (Projects vs Templates vs Joined). Establish a single invariant:
   - **origin invariant**: tasks can only be dropped within the same origin group (unless you explicitly decide otherwise).

### 1) Add dependencies

Install:

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

Optional (only if needed): `@dnd-kit/modifiers` (e.g., restrict to vertical axis). If you add it, keep usage minimal.

### 2) Implement sortable wrapper and accessible handle

Create: `src/components/tasks/SortableTaskItem.jsx`

- Use `useSortable`
- Set the draggable node ref on the outer wrapper (`setNodeRef`)
- Set the activator node ref on the handle (`setActivatorNodeRef`) so only the handle initiates drag and keyboard focus restoration works (do not attach listeners to the whole card)
- Do NOT store the full `task` object in `data` (stale + heavy). Store `taskId`, `origin`, `parentTaskId` only; look up the task from state when needed.

Update: `TaskItem.jsx`

- Render drag handle as `<button type="button">` with `aria-label="Reorder task"` so it can receive focus for keyboard DnD. ([dnd-kit Documentation][3])
- Apply `dragHandleProps` (including the passed `ref`) ONLY to the handle button.

### 3) Make every list uniquely identifiable (roots + child lists)

Add explicit `id` to every `SortableContext`:

- `root:projects`
- `root:templates`
- `root:joined`
- `children:<parentTaskId>` for each expanded parent’s child list

Rationale: `SortableContext id` maps to `containerId` in sortable element data; you need that to disambiguate nested drop targets. ([dnd-kit Documentation][1])

### 4) Make list containers droppable (empty-list support)

For every list container (root sections + each expanded child list), add a droppable zone using `useDroppable` with a unique id:

- `drop:root:projects`
- `drop:children:<parentTaskId>`

Attach the droppable `setNodeRef` to the list container `<div>` that visually represents the drop zone. ([dnd-kit Documentation][4])

Store droppable `data` with:

- `type: "container"`
- `containerId` (matching the related SortableContext id)
- `parentTaskId` (null/root for roots)
- `origin`

Note: draggable and droppable ids live in different stores, so collisions are avoidable; still, prefix ids to keep it obvious. ([dnd-kit Documentation][8])

### 5) Orchestrate in `TaskList.jsx`

Wrap the entire task-list area in a single `DndContext`.
Sensors:

- `PointerSensor` with `activationConstraint.distance = 5`
- `KeyboardSensor` with `sortableKeyboardCoordinates` ([dnd-kit Documentation][3])

Collision detection:

- Start with `closestCorners` (often less confusing for nested layouts than “center”-based approaches); keep it configurable. ([dnd-kit Documentation][7])

Optional: add `DragOverlay` rendering a lightweight visual for the active task. ([dnd-kit Documentation][6])

### 6) Implement definitive `handleDragEnd` behavior

#### Invariants

- If `!over` or `active.id === over.id` -> no-op.
- Determine **activeTask** from state by `active.id`.
- Determine **drop target type**:
  - If `over.data.current.type === "container"` -> drop into that container (including empty lists).
  - Else -> drop relative to the hovered task item.

#### Origin fence

- Block cross-origin moves:
  - `activeTask.origin` must equal `targetOrigin` (from over task or container data).
  - If mismatch -> revert optimistic UI and return.

#### Determine destination parent and sibling list

- If dropping on a container:
  - `newParentId = over.data.current.parentTaskId` (null/root or a task id)

- If dropping on a task item:
  - `newParentId = overTask.parent_task_id ?? null`

- Build `siblings = tasks.filter(t.parent_task_id == newParentId && t.origin == activeTask.origin)` sorted by `position`.
- Compute the “visual order” update by moving `activeId` to the index of `overId` (when dropping on an item) or to end/start as appropriate (when dropping on container).

#### Position computation (with renormalization)

Use a helper in `src/services/taskService.js` or `src/utils/dragUtils.js`:

- Constants:
  - `STEP = 10000`
  - `MIN_GAP = 1` (if integer positions) OR `0.0001` (if numeric)

- After computing the new siblings order, locate neighbors around the moved item:
  - `prevPos = prev ? prev.position : 0`
  - `nextPos = next ? next.position : prevPos + STEP`

- `newPos = Math.floor((prevPos + nextPos) / 2)` (numeric positions)
- If `nextPos - prevPos < MIN_GAP` -> renormalize siblings:
  - assign `position = (index + 1) * STEP` for the full sibling list
  - bulk persist (single upsert call if supported)
  - then recompute `newPos` using the rebalanced positions

Important: if `position` is integer and you cannot migrate it, do NOT use midpoint; instead renormalize every reorder (or implement “insert by shifting” which is more writes).

#### Persistence and rollback

- Optimistically update local state first (update `parent_task_id` + `position` for the active task; if renormalized, update all affected siblings).
- Persist via Supabase update:
  - update active task
  - if renormalized, bulk update siblings

- On any error:
  - rollback state snapshot
  - surface a non-fatal UI error (toast/snackbar) without leaking details

#### Cross-container insertion while dragging (optional)

Only add `onDragOver` if you need “live insertion” across containers; dnd-kit’s multiple-container guidance uses `onDragOver` for that behavior. ([dnd-kit Documentation][5])

### 7) Styling

Update task-card CSS to ensure:

- drag handle button has no default button styling (reset) but keeps visible focus state
- while dragging, apply `opacity` and `z-index` to the wrapper, not the inner card

### 8) Tests (at least 1 edge test)

Add a unit test for the position algorithm:

- Case: “gap collapse” triggers renormalization and returns monotonic positions.
- Case: moving first item to last yields `position` > previous last.

### 9) Verification

- `npm ci`
- `npm test` (or the repo’s test command)
- `npm run lint` (if present)

---

## Commands

```bash
git checkout -b feature/dnd-kit-tree-reorder

npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

npm run lint
npm test
npm run build
```

---

## Deliverables

- New: `src/components/tasks/SortableTaskItem.jsx`
- Modified:
  - `src/components/tasks/TaskItem.jsx`
  - `src/components/tasks/TaskList.jsx`
  - `src/services/taskService.js` (or `src/utils/dragUtils.js`)
  - relevant CSS module/file for handle button styling

- PR summary must explicitly document:
  - allowed moves (same parent only vs reparent enabled)
  - origin constraints (Projects/Templates/Joined)
  - position strategy + renormalization behavior

---

## Risk & Rollback

- **Risk**: integer `position` + midpoint -> silent truncation -> broken ordering.
  - **Mitigation**: check column type first; choose strategy accordingly.

- **Risk**: nested contexts ambiguity -> “wrong parent” drops.
  - **Mitigation**: explicit SortableContext ids + droppable containers. ([dnd-kit Documentation][1])
    Rollback (1 step): revert the PR or `git revert <commit>` and remove the added packages.

---

## Acceptance

- Pointer DnD:
  - Reorder within same sibling list works and persists.
  - Drag handle does not conflict with expand/edit click targets.

- Keyboard DnD:
  - Handle is focusable and supports keyboard sorting behavior. ([dnd-kit Documentation][3])

- Empty list:
  - Dropping into an empty child list works (container droppable). ([dnd-kit Documentation][4])

- Safety:
  - Cross-origin moves are blocked.
  - Failures rollback optimistic updates.

- CI:
  - `npm ci` passes, lockfile in sync.

---

## Checksum

files_changed=<fill> | tests_run=<fill> pass=<fill> | lint_errors=0 | build=pass

---

## Sanity Check

1. Verify: Explicit `SortableContext id` + container droppables uniquely identify the destination list and avoid nested ambiguity. ([dnd-kit Documentation][1])
2. Edge case: If `position` is integer, midpoint is invalid -> must renormalize or migrate to numeric before shipping.
3. Efficiency: Normal reorder is O(k) sibling scan + O(1) update; renormalization is O(k) updates but should be rare with a large `STEP`.

[1]: https://docs.dndkit.com/presets/sortable/sortable-context?utm_source=chatgpt.com 'Sortable Context | @dnd-kit'
[2]: https://docs.dndkit.com/presets/sortable/usesortable?utm_source=chatgpt.com 'useSortable | @dnd-kit'
[3]: https://docs.dndkit.com/api-documentation/sensors/keyboard?utm_source=chatgpt.com 'Keyboard | @dnd-kit – Documentation'
[4]: https://docs.dndkit.com/api-documentation/droppable/usedroppable?utm_source=chatgpt.com 'useDroppable | @dnd-kit – Documentation'
[5]: https://docs.dndkit.com/presets/sortable?utm_source=chatgpt.com 'Sortable | @dnd-kit'
[6]: https://docs.dndkit.com/api-documentation/draggable/drag-overlay?utm_source=chatgpt.com 'Drag Overlay'
[7]: https://docs.dndkit.com/api-documentation/context-provider?utm_source=chatgpt.com 'DndContext'
[8]: https://docs.dndkit.com/api-documentation/draggable/usedraggable?utm_source=chatgpt.com 'useDraggable | @dnd-kit – Documentation'
