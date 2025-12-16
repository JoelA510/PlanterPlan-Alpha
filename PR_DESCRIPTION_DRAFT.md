# Pull Request Description

## **Title:** Feature: Nested Drag-and-Drop Reordering with `dnd-kit`

### **Summary**
This PR implements a robust, persistent, and accessible Drag-and-Drop (DnD) system for the Task Management module. It enables users to reorder tasks both at the root level and within nested hierarchies (Project -> Phase -> Task -> Subtask). The implementation uses `@dnd-kit` for the frontend interactions and introduces a sparse `BIGINT` positioning system in Supabase for efficient, scalable persistence.

### **Key Changes**

#### **1. Database Schema**
- **New Column**: Added `position` (BIGINT) to the `tasks` table.
- **Index**: Added composite index on `(parent_task_id, position)` to optimize ordered retrieval.
- **Migration**: Included `docs/db/migrations/001_add_position.sql`.

#### **2. Backend Services** (`src/services/positionService.js`)
- **Sparse Positioning**: Implemented a "midpoint" calculation algorithm (`(prev + next) / 2`) leveraging 10,000-unit gaps to minimize the need for cascading updates.
- **Renormalization**: Added a self-healing `renormalizePositions` function that bulk-updates siblings evenly if a collision (gap too small) occurs.
- **Parallel Updates**: Optimized renormalization to use `Promise.all` for parallel database writes, resolving potential performance bottlenecks.

#### **3. Frontend Logic** (`src/components/tasks/`)
- **`TaskList.jsx`**:
    - Acts as the central `DndContext`.
    - Handles `onDragEnd` logic: determining drop targets (containers vs. items), calculating new positions, and managing optimistic UI updates.
    - Implements logic to sort children arrays deterministically by `position` to ensure visual consistency.
- **`TaskItem.jsx`**:
    - Refactored to include sortable logic directly (removed circular dependency with `SortableTaskItem`).
    - Added a dedicated **Drag Handle** accessible via keyboard and pointer, ensuring drag events don't conflict with card interactions.
    - Recursively renders `SortableContext` to support infinite nesting.

### **Refactor Improvements (from Code Review)**
- **Boolean Safety**: Switched logical OR (`||`) to nullish coalescing (`??`) in `TaskList.jsx` and `TaskItem.jsx` to correctly handle `0` as a valid position or parent ID.
- **Sorting Integrity**: Enforced explicit sorting of children arrays in the hierarchy builder to prevent visual regressions after drops.
- **Performance**: Upgraded `renormalizePositions` from sequential execution to parallel execution.
- **Logic Resilience**:
    - **Container Drops**: Enabled dropping items into empty containers (empty lists) by detecting container drop targets.
    - **Renormalization Retry**: Implemented automatic retry logic when a position collision occurs, ensuring the move completes successfully after rebalancing.
    - **Robust Drop Parsing**: Refactored to use `over.data.current` for type safety, replacing brittle ID string parsing.
    - **Empty Drops**: Added explicit `useDroppable` zones to `TaskItem.jsx` (for nested lists) and `TaskList.jsx` (for root lists) to ensure empty lists are valid targets.
    - **Circular Safety**: Added ancestry checks to prevent dropping a parent task into its own descendant.
    - **Multi-tenant Safety**: Scoped `renormalizePositions` to the current user to prevent cross-account data corruption.
    - **Schema Compatibility**: Removed `updated_at` from bulk upserts to avoid PostgREST schema cache conflicts.
    - **Crash Prevention**: Guarded `dragHandleProps` in `TaskItem` to prevent runtime errors in non-sortable lists (e.g., Joined Projects).
    - **Performance**: Decoupled data fetching from state updates during drag-and-drop retries to avoid unnecessary re-renders.
    - **Documentation**: Corrected comments in `positionService.test.js` to accurately reflect the midpoint calculation logic.
    - **State Consistency**: During renormalization retries, `TaskList` now uses fresh data for the optimistic update, preventing visual flickering or stale positioning.
    - **Root Drops**: Root "Projects" and "Templates" lists are now valid drop targets at all times (not just when empty).


### **Verification**
- **Tests**: Added `src/services/positionService.test.js` verifying midpoint logic, boundary conditions (start/end), and renormalization triggers.
- **Manual**: Verified persistence of top-level moves, nested subtask moves, and cross-session stability.

### **Checklist**
- [x] Migrations created and applied.
- [x] `npm test` passing (`positionService`).
- [x] Accessibility verified (Drag Handle focus).
- [x] Code review directives applied (Safety, Perf, Docs).
