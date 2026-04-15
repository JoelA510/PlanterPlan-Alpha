# Agent Context & Codebase Map

> **For AI Agents**: Read this first to understand the system architecture,
> patterns, and where to find things. **TECH STACK ALERT**: JavaScript and JSX
> are entirely deprecated. TypeScript (.ts) and TSX (.tsx) are strictly enforced
> across the codebase.

## 1. Directory Structure (Feature-Sliced Variation)

- **`src/features/`**: Domain-specific logic (Business Logic).
  - Structure: `components/`, `hooks/`, `lib/`. *(Note: No barrel files like `index.ts` are used; import directly from the path).*
  - Key Domains: `projects`, `tasks`, `people`, `dashboard`, `library`.
- **`src/pages/`**: Top-level Route Views (Page Composition).
  - _Note_: Pages should primarily compose features, not contain deep logic.
- **`src/shared/`**: Universal utilities and UI (No Business Logic).
  - `ui/`: ShadCN/Radix primitives (Buttons, Inputs, Dialogs).
  - `lib/`: Pure functions (`date-engine`, `tree-helpers`).
  - `api/`: API adapters (`planterClient`).
- **`docs/`**: Source of Truth.
  - `docs/architecture/*.md`: The definitive, modular Single Source of Truth for all domain business rules (Date Engine, RBAC, Tasks). **Always check here first before attempting architectural refactors.**
  - `docs/db/schema.sql`: Current Database Schema.

## 2. Key Patterns

### Data Fetching

- **Primary**: `useQuery` and `useMutation` (TanStack React Query v5) via `planterClient`.
- **Adapter**: `src/shared/api/planterClient.ts` wraps Supabase SDK.
- **Rules**:
  - Do NOT use `supabase.from()` directly in UI components. Use `planterClient`
    or custom mutation hooks (e.g., `useTaskMutations`).
  - Always handle `loading` and `error` states.

### State Management

- **Server State**: React Query (Single Source of Truth).
- **Local State**: `useState` / `useReducer` for form/UI state.
- **Global UI State**: Context (`AuthContext`, Sonner Toasts).

### Styling

- **Engine**: TailwindCSS v4.
- **Components**: Radix UI primitives wrapped in `src/shared/ui/`.
- **Icons**: `lucide-react`.
- **Rules**: Avoid custom CSS files. Use utility classes and
  `class-variance-authority`.

## 3. Golden Paths (Critical Files)

- **Auth**: `src/pages/components/LoginForm.tsx` & `src/shared/contexts/AuthContext.tsx`
- **Dashboard Pipeline**: `src/pages/Dashboard.tsx` ->
  `src/features/dashboard/components/ProjectPipelineBoard.tsx`
- **Project Detail**: `src/pages/Project.tsx` -> `src/features/tasks/components/TaskList.tsx`
- **Task Details**: `src/features/tasks/components/TaskDetailsPanel.tsx`
- **Date Logic**: `src/shared/lib/date-engine/index.ts` (Handle with extreme care, heavily tested!)
- **Resource Library**: `src/features/projects/components/ResourceLibrary.tsx` +
  `src/features/projects/hooks/useProjectResources.ts` — project-scoped resource browser tab (search + type filter). Data fetched via `planterClient.entities.TaskResource.listByProject(projectId)`, which uses a Supabase `!inner` join on `tasks.root_id`. Returns `ResourceWithTask[]` (defined in `src/shared/db/app.types.ts`).
- **Project Settings Modal**: `src/features/projects/components/EditProjectModal.tsx` — edits title, description, start date, due date, and `due_soon_threshold` (stored in `tasks.settings` JSONB). The `location` field has been deprecated and removed from the UI.
- **Settings Page**: `src/pages/Settings.tsx` + `src/features/settings/hooks/useSettings.ts` — Profile tab (name, avatar, role, org, email prefs) and Security tab (password change). Password change calls `planter.auth.changePassword(newPassword)`.

## 3a. Key Behavioral Contracts (Wave 18)

### Milestone / Phase Auto-Completion (§3.3)
`planterClient.entities.Task.updateStatus(taskId, 'completed')` now:
1. **Cascades DOWN**: marks all descendant tasks as `completed` (recursive, batched in groups of 3 via `Promise.all`).
2. **Bubbles UP via `reconcileAncestors(parentId, depth)`**: after the cascade, checks whether all siblings of `taskId` are `completed`. If so, marks the parent (`is_complete: true, status: 'completed'`). If not, derives the parent's status via `deriveParentStatus(children)` (priority order: `blocked` > `in_progress` > `overdue` > `todo`) and sets `is_complete: false`. Recurses up the tree **depth-capped at 1** (i.e., `if (depth > 1) return` — processes the immediate parent and grandparent only). This is the app-level equivalent of the DB `check_phase_unlock` trigger.
3. **Re-open behavior**: when a task moves OUT of `completed` (e.g., checkbox unchecked), `reconcileAncestors` is still called. Any ancestor that previously auto-completed is automatically un-completed with a derived status (`is_complete: false`, status = `deriveParentStatus`). This prevents stale "completed" parents when a child is re-opened.

`useUpdateTask` routes **status-only** mutations through `updateStatus` (vs. the raw `Task.update`) so every checkbox toggle in the UI fires the full cascade/bubble pipeline. Mixed-field updates (e.g., form saves that include status + title) bypass this path and use the generic update.

### Date Bubble-up (§3.3)
`planterClient.entities.Task.updateParentDates(parentId)` is now called automatically:
- **After task create** — always, when the new task has a parent.
- **After task edit** — when `start_date` or `due_date` is part of the update payload.
- **After task delete** — always, when the deleted task had a parent (parent ID captured from React Query cache in `onMutate` before optimistic removal).

This is wired in `src/features/tasks/hooks/useTaskMutations.ts` (`useCreateTask`, `useUpdateTask`, `useDeleteTask` `onSettled` callbacks).

## 4. Testing & Verification

- **Unit/Integration**: `npm test` (Vitest).
- **E2E Tests**: `npm run test:e2e` (Playwright BDD — feature files in `Testing/e2e/features/`).
- **Linting**: `npm run lint` (Zero-tolerance for errors, including `noUnusedLocals`).

## 5. Deployment / Build

- **Build**: `npm run build` (tsc -b && vite build).
- **Environment**: Local Supabase (`127.0.0.1:54321`) mimics Sync/Realtime.

## 6. Ignorable Files (Context Noise)

The following files are generated or tracked for AI context but are not critical
for a human code review. They can be safely ignored to save focus:

- **`.ai-ignore/docs/FULL_ARCHITECTURE.md`**: Monolithic legacy architecture file. Replaced completely by `docs/architecture/`.
- **`docs/db/drafts/*`**: Work-in-progress SQL scripts.
- **`.antigravity/*`**: AI Agent configuration, rules, and workflows.
- **`archive/*`**: Old code and documentation.
- **`supabase/seeds/*`**: Large seed files (unless modifying data
  initialization).