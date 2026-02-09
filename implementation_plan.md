# Implementation Plan - Drag & Drop Logic Refactor

## 1. Goal Description
The objective is to harden the Drag & Drop logic by extracting the complex `calculateDropTarget` function from the `useTaskDrag` hook into a pure, testable utility. This allows us to verify edge cases (circular dependencies, cross-parent moves) with unit tests.

## 2. Proposed Changes

### Logic Refactor
#### [NEW] [src/features/tasks/services/dragDropUtils.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/tasks/services/dragDropUtils.js)
*   **Content:** The `calculateDropTarget` function, exported.

#### [MODIFY] [src/features/tasks/hooks/useTaskDrag.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/tasks/hooks/useTaskDrag.js)
*   **Change:** Import `calculateDropTarget` from the new service instead of defining it inline.

### Tests
#### [NEW] [src/tests/unit/dragDropUtils.test.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/tests/unit/dragDropUtils.test.js)
*   **Tests:**
    *   Should allow reordering within the same list.
    *   Should allow moving a task to a different parent (nesting).
    *   Should PREVENT moving a parent into its own child (Circular Check).
    *   Should calculate correct `newPos`.

## 3. Verification Plan
Run `npm test src/tests/unit/dragDropUtils.test.js`.
