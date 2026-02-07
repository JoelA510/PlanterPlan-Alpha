# Test Plan: Drag-and-Drop Enhancements

## 1. Objectives
- Verify correctness of "Project Pipeline Board" logic (Status updates).
- Verify correctness of "Drag-to-Assign" logic (Member -> Task assignment).
- Ensure regressions are prevented in `projectService` and [Dashboard](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/pages/Dashboard.jsx#16-211).
- **Security**: Verify RLS enforcement on core tables.

## 2. Scope
- **Feature**: Project Pipeline Board ([src/features/dashboard/components/ProjectPipelineBoard.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/dashboard/components/ProjectPipelineBoard.jsx))
- **Feature**: Drag-to-Assign ([src/pages/Project.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/pages/Project.jsx), [src/features/projects/components/ProjectHeader.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/components/ProjectHeader.jsx))
- **Service**: [src/features/projects/services/projectService.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/services/projectService.js)
- **Database**: [docs/db/schema.sql](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/docs/db/schema.sql)

## 3. Automated Testing Strategy (Vitest)

### A. Unit Tests ([projectService.test.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/services/projectService.test.js))
- [x] Test [updateProjectStatus](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/services/projectService.js#112-123) calls Supabase correctly.
- [x] Test error handling.

### B. Integration Tests ([ProjectPipelineBoard.test.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/dashboard/components/ProjectPipelineBoard.test.jsx))
- [x] Render Board with mock projects.
- [x] Verify Columns render correct project counts.
- [x] Simulate `dragEnd` event triggering `onStatusChange`.

### C. Integration Tests (`DragToAssign.test.jsx`)
- [x] Test [Project.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/pages/Project.jsx) specific logic (extract [handleDragEnd](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/library/components/MasterLibraryList.jsx#60-66) for testing if possible, or test via integration).
- [x] Verify [DraggableAvatar](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/components/ProjectHeader.jsx#134-168) renders with correct attributes.
- [x] Verify [handleDragEnd](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/library/components/MasterLibraryList.jsx#60-66) correctly identifies [User](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/tasks/services/taskService.js#81-99) -> [Task](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/library/hooks/useTreeState.js#70-81) drop and calls mutation.

### D. Security Verification (`e2e/security.spec.ts`)
- [ ] **Sad Path (Anon)**: Verify anonymous request to `tasks` returns empty list/error (RLS Active).
- [ ] **Sad Path (Cross-Tenant)**: Verify User A cannot access User B's private project (RLS Policy).

## 4. Manual Verification (Golden Paths)
- [x] **Pipeline**: Open Dashboard -> Toggle View -> Drag Project -> Refresh -> Verify Persistence.
- [x] **Assignment**: Open Project -> Drag Avatar -> Drop on Task -> Verify Toast/Assignment.

## 5. Execution Plan
1. [x] Create [src/features/projects/services/projectService.test.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/projects/services/projectService.test.js).
2. [x] Create [src/features/dashboard/components/ProjectPipelineBoard.test.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/dashboard/components/ProjectPipelineBoard.test.jsx).
3. [x] Create [src/tests/integration/drag-to-assign.test.jsx](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/tests/integration/drag-to-assign.test.jsx) (Mocked Logic).
4. [x] Create [src/features/tasks/services/taskService.test.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/features/tasks/services/taskService.test.js) (Reparenting Logic).
5. [x] Run `npm test` (All 8 tests passed).
6. [x] Run `npx playwright test e2e/security.spec.ts` (Passed).
7. [ ] **Performance**: Verify Command Palette responsiveness and Chart rendering.
