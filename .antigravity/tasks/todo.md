# Current Task & Execution Plan: Architectural & Security Hardening

## 🛡️ Phase 1: Security & Auth State [COMPLETED 2026-02-20 | 5ad1122]
*Context: Hardening the authentication layer against bypasses and memory leaks.*
- **Target:** `src/app/contexts/AuthContext.tsx` & `src/shared/api/planterClient.js`
- **Action 1 (Bypass):** Wrap `e2e-bypass-token` and `planter_e2e_user` checks in `import.meta.env.VITE_E2E_MODE === 'true'`.
- **Action 2 (Desync):** In `signOut()`, move `setUser(null)` and `setLoading(false)` to only execute on success. Re-throw errors in the catch block without clearing state.
- **Action 3 (Memory Leak):** In `callWithTimeout`, append `.finally(() => clearTimeout(timer))` to clear the pending timer.

## 📡 Phase 2: Data Layer & React Query [COMPLETED 2026-02-20 | 43eb009]
*Context: Preventing over-fetching and unbounded WebSocket broadcasts.*
- **Target:** `src/features/tasks/hooks/useTaskMutations.ts` & `src/features/projects/hooks/useProjectRealtime.js`
- **Action 1 (Query):** Update `useUpdateTask` and `useCreateTask`. Stop invalidating the generic `['tasks']` array. Instead, invalidate the specific task (`['task', variables.id]`) and its parent tree (`['tasks', 'tree', variables.root_id]`). *Check our query key factory to ensure exact string matching.*
- **Action 2 (Realtime):** In `useProjectRealtime`, if `projectId` is null, default the filter to `creator=eq.${userId}` to scope the broadcast to the active user.

## ⚡ Phase 3: UI Rendering Pipeline [COMPLETED 2026-02-20 | 08ec308]
*Context: Resolving O(N²) bottlenecks and XSS risks in display components.*
- **Target:** `TaskTree.tsx`, `TaskItem.jsx`, `ProjectCard.jsx`
- **Action 1 (O(N²) Fix):** In `TaskTree.tsx`, implement a `useMemo` that flattens `tree` into a `Map<string, TaskNode>`. Use this Map for O(1) lookups inside the `rootChildIds.map` render loop instead of recursive searching.
- **Action 2 (XSS/DOM):** In `TaskItem.jsx` and `ProjectCard.jsx`, remove `dangerouslySetInnerHTML` and `sanitizeHTML` for `task.title`. Render it directly as a standard React text node `{task.title}`.

## 🏗️ Phase 4: The "God Hook" Teardown
*Context: Decomposing `useTaskBoard.js` to prevent massive tree re-renders.*
- **Target:** `src/features/tasks/hooks/useTaskBoard.js` & `src/features/tasks/components/TaskList.jsx`
- **Action 1 (Analyze):** Identify the 4 underlying hooks composed within `useTaskBoard.js`.
- **Action 2 (Refactor):** Strip `TaskList.jsx` down to only handle layout and URL state (`useParams`).
- **Action 3 (Distribute):** Push the specific hook calls (e.g., `useTaskTree`) directly down into the child components (`ProjectTasksView`, etc.) that actually consume that state. Delete `useTaskBoard.js` when complete.