# Drag-n-Drop Implementation (P4)

## 0. Overview (TL;DR, 2–4 bullets)

- **Accessible Drag-n-Drop:** Implemented a robust, keyboard-accessible drag-and-drop system using `@dnd-kit` for reordering tasks within the project hierarchy.
- **Sparse Positioning:** Introduced a `BIGINT`-based position strategy with 10,000-unit gaps to minimize costly re-indexes, supported by a new database column and index.
- **Optimistic UI:** Updates are reflected instantly on the client while persisting asynchronously to Supabase, with automatic fail-safe renormalization.
- **Adversarial Verification:** Validated with a suite of unit tests and browser-based adversarial scenarios (boundary drags, nested reordering, persistence).

---

## 1. Roadmap alignment

### 1.x Roadmap item: P4-DRAG-N-DROP - Drag-n-Drop Reordering

- **Phase/milestone:** Phase 4 -> The Date Engine & Drag-n-Drop
- **Scope in this PR:** Full stack implementation of drag-and-drop: Schema updates, position service logic, and frontend integration with `@dnd-kit`.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

---

## 2. Changes by roadmap item

### 2.x P4-DRAG-N-DROP - Drag-n-Drop Reordering

**A. TL;DR (1–2 sentences)**

- Added `position` column to tasks and integrated `@dnd-kit` to allow users to reorder tasks and projects via drag-and-drop.

**B. 5W + H**

- **What changed:**
  - Database schema now includes a `position` column.
  - New service `positionService` handles position calculation and renormalization.
  - `TaskList` and `TaskItem` components are wrapped in `DndContext` and `SortableContext`.

- **Why it changed:**
  - To allow users to intuitively prioritize and organize their tasks, a core project management feature.

- **How it changed:**
  - **Backend**: Added `position` column (BIGINT) and index. Implemented "sparse ranking" logic where new items are placed midway between neighbors.
  - **Frontend**: Used `@dnd-kit` primitive sensors (Pointer, Keyboard) to detect drags. `handleDragEnd` calculates the new position based on drop location and siblings, then optimistically updates state and persists.

- **Where it changed:**
  - **Schema**: `docs/db/migrations/001_add_position.sql`
  - **Service**: `src/services/positionService.js`
  - **Components**: `src/components/tasks/TaskList.jsx`, `src/components/tasks/SortableTaskItem.jsx`, `src/components/tasks/TaskItem.jsx`

- **When (roadmap):**
  - Phase 4 -> The Date Engine & Drag-n-Drop (Complete)

**C. Touch points & citations**

- `docs/db/migrations/001_add_position.sql`: L1–28 -> New migration.
- `src/services/positionService.js`: L1–110 -> Core positioning logic (`calculateNewPosition`, `renormalizePositions`).
- `src/components/tasks/TaskList.jsx`: L161–266 -> `handleDragEnd` orchestration.
- `src/components/tasks/SortableTaskItem.jsx`: L1–38 -> New wrapper component.
- `src/components/tasks/TaskItem.jsx`: L150–165 -> Render children in `SortableContext`.

**D. Tests & verification**

- **Automated tests:**
  - `npm test src/services/positionService.test.js` (Midpoint calculation, Edge cases, Renormalization).

- **Manual verification:**
  - Environment: Local (Adversarial Testing)
  - **Scenarios Checked**:
    - [x] Create new project (appears at bottom).
    - [x] Drag item from bottom to top (Boundary Test).
    - [x] Nested drag (Child 1 <-> Child 2).
    - [x] Persistence (Reload page retains order).
  - **Fixes Applied**: Adjusted `PointerSensor` activation constraint to 5px to prevent accidental/flaky drags.

- **Known gaps / follow-ups:**
  - **Reparenting**: Dragging a task _into_ another task (changing parent) is partially supported logic-wise but not fully exposed in the UI drag zones yet.
  - **Master Library Search**: Known issue with search functionality (separate branch/scope).

**E. Risk & rollback**

- **Risk level:** Medium
- **Potential impact if broken:**
  - Tasks might jump around or lose their order.
  - worst case: `position` collision triggers renormalization repeatedly (mitigated by logic).
- **Rollback plan:**
  - Revert frontend changes to `TaskList.jsx`.
  - Deployment rollback would require dropping `position` column (or ignoring it).

---

## 3. Checklist

- [x] All changes are mapped to a roadmap item (from `roadmap.md`) or explicitly marked as cross-cutting
- [x] Touch points and line ranges added for each meaningful change hunk
- [x] TL;DR provided for each roadmap item
- [x] What / Why / How / Where / When (roadmap) documented
- [x] Automated tests added/updated where appropriate
- [x] Manual verification performed (or rationale if not)
- [x] Breaking changes, if any, are documented and communicated
- [x] Rollback plan is defined and feasible
- [x] Linked tickets (if any) are referenced and updated as needed
