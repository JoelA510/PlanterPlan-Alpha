# Refactor Sprint: Context Size & Simplification

## Core Simplification & Dead Code Deletion

- [x] **1. Merge CreateTemplateModal**
  - *Effect*: Delete `CreateTemplateModal.jsx`, add `mode` prop to `CreateProjectModal.tsx`, and update `Dashboard.tsx` to use the unified modal.
  - *Agent Prompt*: Execute the following refactor to eliminate duplicate modal logic:
    1. Add a 'mode' prop ('project' | 'template') to `src/features/dashboard/components/CreateProjectModal.tsx`.
    2. Open `src/features/dashboard/components/CreateTemplateModal.jsx`. Copy the exact UI logic for the 3 template categories (Checklist, Workflow, Blueprint). Paste it into `CreateProjectModal.tsx` to render conditionally when `mode === 'template'`.
    3. When `mode === 'template'`, the modal title must be "Create New Template", and the submission payload must append `origin: 'template'`.
    4. Update `src/pages/Dashboard.tsx` to pass `mode="template"` instead of using the old modal. Ensure props satisfy TS.
    5. Delete `CreateTemplateModal.jsx` using `git rm`.
    6. Run `npx tsc --noEmit` to verify types, then calculate the new tracked token footprint.

- [x] **2. Delete TaskTree & Unused TS Hooks**
  - *Effect*: `git rm -r src/features/tasks/components/TaskTree/` + remove associated hooks, `TaskDetails.tsx`, and strip all dead imports.
  - *Agent Prompt*: Execute a massive dead-code deletion sweep. Follow these steps exactly:
    1. Use `git rm -r` to delete the entire directory at `src/features/tasks/components/TaskTree/`.
    2. Use `git rm` to delete `src/features/tasks/components/TaskDetails/TaskDetails.tsx`.
    3. Use `git rm` to delete these hooks: `useTaskTreeDnD.ts`, `useTasks.ts`, and `useTaskDetails.ts`.
    4. Perform a global grep for any remaining imports pointing to these deleted files and remove those import statements entirely.
    5. If you must modify a `.jsx` file to remove an import, you must fully convert it to a `.tsx` file with proper interfaces.
    6. Run `npx tsc --noEmit` and `npm run lint` to ensure no broken references remain.

- [x] **3. Eliminate Service Layer**
  - *Effect*: Delete 4 passthrough service files and refactor all consumers to call `planterClient` directly, converting touched files to TSX.
  - *Agent Prompt*: Eliminate the passthrough service layer to reduce boilerplate. Execute the following:
    1. Identify all consumers of these four files: `features/tasks/services/taskService.js`, `features/projects/services/projectService.js`, `features/library/services/taskMasterLibraryService.js`, and `features/people/services/peopleService.js`.
    2. Refactor all identified consumers to bypass the service layer and make their API calls directly using `planterClient`.
    3. ANY `.jsx` file you touch during this refactor must be converted to a strict `.tsx` file with proper typings.
    4. Once all consumers are updated, delete the four service files using `git rm`.
    5. Verify the build integrity by running `npx tsc --noEmit`.

- [x] **4. Delete Duplicate Contexts**
  - *Effect*: Delete ViewAs context architecture entirely. Delete custom `use-toast.jsx` context and wire consumers directly to `sonner`.
  - *Agent Prompt*: Remove redundant context providers to shrink the app wrapper:
    1. Delete `src/app/contexts/ViewAsContext.jsx`, `src/app/contexts/ViewAsProviderWrapper.jsx`, and `features/navigation/components/ViewAsSelector.jsx` using `git rm`. Remove their references from the main app tree.
    2. Delete `shared/ui/use-toast.jsx` and `app/contexts/ToastContext.jsx`.
    3. Search the codebase for any file importing the old `useToast`. Refactor them to import `{ toast }` from `sonner` instead.
    4. Convert any touched `.jsx` files to `.tsx` and type them properly.
    5. Verify the app compiles without the old contexts using `npx tsc --noEmit`.

- [x] **5. Merge Task Forms**
  - *Effect*: Merge `CreateTaskForm.jsx` + `EditTaskForm.jsx` into a single `TaskForm.tsx` that accepts an `initialData` prop.
  - *Agent Prompt*: Consolidate our task creation and editing UI:
    1. Analyze `features/tasks/components/CreateTaskForm.jsx` and `EditTaskForm.jsx`.
    2. Create a new file: `features/tasks/components/TaskForm.tsx`. Combine the logic of both old forms into this new component. It must accept an `initialData` prop to determine whether it is in 'create' or 'edit' mode.
    3. Ensure `TaskForm.tsx` has strict TypeScript interfaces for its props and state.
    4. Update any parent components that imported the old forms to use the new `TaskForm.tsx`.
    5. Delete the two old `.jsx` files using `git rm`.
    6. Run your standard type checks to verify.

- [/] **6. Refactor useTaskQuery**
  - *Effect*: Rewrite `useTaskQuery.js` to rely entirely on React Query, dropping manual state management and shrinking it from ~180 to ~15 lines. Convert to `.ts`.
  - *Agent Prompt*: Refactor our task querying hook to eliminate manual state management. Follow these steps:
    1. Rename `src/features/tasks/hooks/useTaskQuery.js` to `.ts`.
    2. Remove all manual `useState` and `useEffect` hooks currently used for data fetching.
    3. Rewrite the hook to exclusively use React Query natively, wrapping `planterClient` calls directly.
    4. Ensure the new TypeScript signature is strictly typed.
    5. Run `npx tsc --noEmit` to ensure no consumers are broken by this type and logic change.

- [ ] **7. Delete JS Helpers**
  - *Effect*: Delete `treeHelpers.js` and `viewHelpers.js`. Point any remaining consumers to the existing, strongly-typed `tree-helpers.ts`.
  - *Agent Prompt*: Clean up redundant helper files:
    1. Delete `src/shared/lib/treeHelpers.js` and `src/shared/lib/viewHelpers.js` using `git rm`.
    2. Perform a global search for any imports of these deleted files.
    3. Update those imports to use the existing, typed `src/shared/lib/tree-helpers.ts` instead.
    4. If any `.jsx` file is touched to update these imports, you MUST fully convert it to a `.tsx` file with proper interfaces.
    5. Verify the build integrity with `npx tsc --noEmit`.

- [ ] **8. Delete AddTaskModal**
  - *Effect*: Remove the redundant task creation modal path and update `Project.tsx` to rely on the standard inline flow.
  - *Agent Prompt*: Eliminate duplicate task creation UI paths:
    1. Delete `src/features/projects/components/AddTaskModal.jsx` using `git rm`.
    2. Search the codebase (specifically `src/pages/Project.tsx`) for its import and remove it.
    3. Ensure the project page relies exclusively on the standard task creation flow (like `NewTaskForm` or `InlineTaskInput`) instead.
    4. Run `npx tsc --noEmit` to verify.

- [ ] **9. Delete DraggableAvatar / DnD**
  - *Effect*: Delete `dragUtils.js` and strip out non-functional Drag-and-Drop code from `ProjectHeader` and `Project.tsx`.
  - *Agent Prompt*: Strip out dead Drag-and-Drop (DnD) code from the project view:
    1. Delete `src/features/projects/utils/dragUtils.js` using `git rm`.
    2. Open `src/features/projects/components/ProjectHeader.jsx`. Remove all DnD-related logic, imports, and `DraggableAvatar` components. Convert `ProjectHeader` to `.tsx` with strict types during this process.
    3. Open `src/pages/Project.tsx` and remove the DnD context wrappers surrounding the layout.
    4. Run `npx tsc --noEmit` to verify.

- [ ] **10. Delete useTaskOperations**
  - *Effect*: Remove the facade hook `useTaskOperations.js` and direct consumers to use standard React Query mutations directly.
  - *Agent Prompt*: Remove unnecessary facade hooks:
    1. Delete `src/features/tasks/hooks/useTaskOperations.js` using `git rm`.
    2. Search for all consumers of this hook. Refactor them to import and use the standard task mutations directly (e.g., from `useTaskMutations.ts`).
    3. ANY `.jsx` files touched during this refactor must be strictly converted to `.tsx`.
    4. Run `npx tsc --noEmit` to verify the data flow.

- [ ] **11. Delete Login.tsx**
  - *Effect*: Eliminate the duplicate login wrapper. Determine if `LoginForm` is the gold master and update the router.
  - *Agent Prompt*: Consolidate the authentication views:
    1. Evaluate `src/pages/Login.tsx` and `src/features/auth/components/LoginForm.jsx`.
    2. Delete the duplicate wrapper using `git rm`. If `LoginForm.jsx` is the primary component, rename it to `.tsx`, enforce strict types, and update `src/app/router.tsx` to point directly to it instead of the deleted page.
    3. Verify routing and types using `npx tsc --noEmit`.

- [ ] **12. Delete useTaskSubscription**
  - *Effect*: Remove the duplicate real-time hook and consolidate all subscription logic into `useProjectRealtime.js`.
  - *Agent Prompt*: Consolidate real-time subscriptions:
    1. Delete `src/features/tasks/hooks/useTaskSubscription.js` using `git rm`.
    2. Update any components that imported it to use the unified `src/features/projects/hooks/useProjectRealtime.js` hook instead.
    3. Convert any touched `.jsx` files to `.tsx` during this update.
    4. Run `npx tsc --noEmit`.

- [ ] **13. Delete Layout.tsx**
  - *Effect*: Remove the duplicate layout wrapper to ensure `DashboardLayout` is the single source of truth for the app shell.
  - *Agent Prompt*: Remove duplicate layout wrappers:
    1. Delete `src/shared/layout/Layout.tsx` using `git rm`.
    2. Ensure the router (`src/app/router.tsx`) and any other consumers use `src/layouts/DashboardLayout.jsx` instead.
    3. Convert `DashboardLayout.jsx` to `.tsx` with strict typing for its children props.
    4. Run `npx tsc --noEmit`.

- [ ] **14. Delete TaskDetailsModal**
  - *Effect*: Remove the modal wrapper for task details to enforce the use of the sliding side panel UI.
  - *Agent Prompt*: Enforce a single UI pattern for task details:
    1. Delete `src/features/projects/components/TaskDetailsModal.jsx` using `git rm`.
    2. Update any consumers to exclusively trigger the `TaskDetailsPanel.jsx` instead.
    3. Convert `TaskDetailsPanel.jsx` to `.tsx` with strict prop interfaces.
    4. Verify the changes with `npx tsc --noEmit`.

- [ ] **15. Remove DB Aliasing**
  - *Effect*: Stop PostgREST field aliasing in `planterClient.js`, use real database column names, and fix field mismatches in `ProjectCard`.
  - *Agent Prompt*: Eliminate API translation layers:
    1. Update `src/shared/api/planterClient.js` to remove entity aliases (`Phase`, `Milestone`, `TaskWithResources`). The client must return real database column names (`title`, `due_date`, `creator`).
    2. Open `src/features/dashboard/components/ProjectCard.jsx`, convert it to `.tsx`, and update its props/fields to read from these real column names.
    3. Fix any other consumers broken by this change, converting touched `.jsx` files to `.tsx`.
    4. Run `npx tsc --noEmit` to verify the data shapes match.