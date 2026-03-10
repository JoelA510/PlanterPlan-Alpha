# CLAUDE.md — PlanterPlan

Church planting project management app built with React + TypeScript + Supabase.

## Quick Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint         # ESLint (zero-tolerance)
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright BDD end-to-end tests
```

**Always run `npm run build` after code changes to verify.** The build enforces `noUnusedLocals` and `noUnusedParameters` — unused variables are errors, not warnings.

## Architecture

### Feature-Sliced Design (FSD)

```
src/
├── app/
│   └── App.tsx
├── layouts/
│   └── DashboardLayout.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Home.tsx
│   ├── Project.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   ├── TasksPage.tsx
│   ├── Team.tsx
│   └── components/
│       ├── LoginForm.tsx
│       └── OnboardingWizard.tsx
├── features/
│   ├── dashboard/
│   │   ├── components/   CreateProjectModal, ProjectCard, ProjectPipelineBoard, StatsOverview
│   │   ├── hooks/        useDashboard, useProjectPipelineLogic
│   │   └── lib/          pipelineMath
│   ├── library/
│   │   ├── components/   MasterLibraryList, MasterLibrarySearch, TemplateList
│   │   ├── hooks/        useMasterLibraryTasks, useMasterLibrarySearch, useTreeState
│   │   └── lib/          highlightMatches
│   ├── navigation/
│   │   └── components/   AppSidebar, Header, ProjectSidebar, GlobalNavItem, SidebarSkeleton
│   ├── people/
│   │   ├── components/   PeopleList, AddPersonModal
│   │   └── hooks/        useTeam
│   ├── projects/
│   │   ├── components/   ProjectHeader, ProjectTabs, PhaseCard, MilestoneSection,
│   │   │                 EditProjectModal, InviteMemberModal, NewProjectForm
│   │   ├── hooks/        useProjectData, useProjectMutations, useProjectBoard,
│   │   │                 useUserProjects, useProjectRealtime, useProjectReports
│   │   └── lib/          export-utils
│   ├── tasks/
│   │   ├── components/   TaskList, TaskItem, TaskDetailsPanel, TaskDetailsView,
│   │   │                 TaskForm, TaskFormFields, InlineTaskInput,
│   │   │                 TaskResources, TaskDependencies, TaskStatusSelect,
│   │   │                 TaskControlButtons, ProjectListView, ProjectTasksView
│   │   ├── components/board/  ProjectBoardView, BoardColumn, BoardTaskCard
│   │   └── hooks/        useTaskMutations, useTaskQuery
│   ├── mobile/           MobileAgenda, MobileFAB
│   └── settings/
│       └── hooks/        useSettings
└── shared/
    ├── api/              planterClient.ts, auth.ts
    ├── constants/        domain.ts, colors.ts, index.ts
    ├── contexts/         AuthContext.tsx
    ├── db/               client.ts, database.types.ts, app.types.ts
    ├── hooks/            useUser.ts
    ├── lib/
    │   ├── date-engine/  index.ts, payloadHelpers.ts
    │   ├── tree-helpers.ts, retry.ts, utils.ts
    │   └── hooks/        useDebounce.ts
    ├── types/            tasks.ts
    └── ui/               Shadcn primitives + CommandPalette, ErrorFallback, RoleIndicator,
                          SidebarNavItem, StatusCard
```

**Boundary rules (ESLint-enforced):**
- `shared/` cannot import from `features/` or `app/`
- `features/` cannot import from `app/`
- Features import from each other via direct paths (no barrel files)

### `app/`

- **`App.tsx`** — App shell: React Query provider, AuthContext, Router (6 routes), Sonner toasts. All routes except `/login` wrapped in `PrivateRoute`.

### `layouts/`

- **`DashboardLayout.tsx`** — Wraps all authenticated pages. Responsive sidebar (collapsible on mobile), header, CommandPalette, MobileFAB.

### `pages/`

Route-level components — compose features, minimal logic:

- **`Dashboard.tsx`** — Project pipeline board, stats overview, create project modal, onboarding wizard.
- **`Project.tsx`** — Project detail: phase cards, milestones, board/people tabs, TaskDetailsPanel side panel. Subscribes to Supabase realtime for live task updates.
- **`TasksPage.tsx`** — "My Tasks" across all projects. List/board toggle, drag-drop status changes, filters instance tasks only.
- **`Reports.tsx`** — Analytics: project progress %, task counts, bar/pie charts via Recharts.
- **`Settings.tsx`** — User profile editing (name, avatar, role, org, email frequency).
- **`Team.tsx`** — Team member management with role badges, add/delete members.
- **`Home.tsx`** — Marketing landing page (unauthenticated).
- **`components/LoginForm.tsx`** — Sign in/up form with Zod validation, E2E auto-login mode.
- **`components/OnboardingWizard.tsx`** — 3-step wizard (name → launch date → template) shown on first dashboard visit.

### `features/`

Each feature has `components/` and `hooks/` subdirectories:

**`dashboard/`** — Dashboard view and project pipeline.
- `CreateProjectModal` — Multi-step project creation with template selection.
- `ProjectCard` — Project card with status, progress bar, metadata.
- `ProjectPipelineBoard` — Kanban board of projects by status (dnd-kit).
- `StatsOverview` — Four-card summary (total projects, active/completed tasks, team activity).
- `useDashboard` — Central dashboard state: projects, tasks, members, modals, search.
- `useProjectPipelineLogic` — Drag-drop logic for pipeline columns with optimistic updates.

**`library/`** — Template library for browsing and cloning.
- `MasterLibraryList` — Paginated tree of template tasks with expansion and reorder.
- `MasterLibrarySearch` — Keyword search for library filtering.
- `TemplateList` — Selectable template display.
- `useMasterLibraryTasks` — Fetches paginated templates (`origin='template'`), infinite scroll.
- `useTreeState` — Tree expansion, status changes, reordering for nested templates.

**`navigation/`** — Global nav components.
- `Header` — Breadcrumb, user dropdown (profile, settings, logout).
- `AppSidebar` — Main sidebar with global nav items and project list.
- `ProjectSidebar` / `ProjectSidebarContainer` — Project-specific sidebar with phases/tasks nav.
- `GlobalNavItem` — Nav item with icon, label, active state.

**`people/`** — Contact management within projects.
- `PeopleList` — Searchable list with status badges and actions.
- `AddPersonModal` — Modal for adding contacts.
- `useTeam` — Fetches and manages project team members.

**`projects/`** — Project-level operations.
- `ProjectHeader` — Title, status badge, date, location, team size, action buttons.
- `ProjectTabs` — Tab navigation between project views.
- `PhaseCard` — Phase card with tasks, progress, lock state.
- `MilestoneSection` — Milestones with completion tracking.
- `EditProjectModal` — Edit project metadata.
- `InviteMemberModal` — Invite by email with role selection.
- `NewProjectForm` — Project creation form with Zod validation.
- `useProjectData` — Fetches project details + tasks + team; includes realtime listeners.
- `useProjectMutations` — Project CRUD with optimistic updates.
- `useProjectBoard` — Kanban board state for project tasks.
- `useUserProjects` — Fetches projects the current user can access.

**`tasks/`** — Core task management.
- `TaskList` — Root "My Tasks" component: project sidebar, task tree, details panel.
- `TaskItem` — Single task row with status, assignee, quick actions.
- `TaskDetailsPanel` / `TaskDetailsView` — Side panel and full-page task detail editing.
- `TaskForm` / `TaskFormFields` — Task create/edit form (form state, Zod validation, fields).
- `InlineTaskInput` — Quick inline task creation.
- `TaskResources` — Task attachment display.
- `TaskDependencies` — Shows prerequisites and phase unlock logic.
- `TaskStatusSelect` — Status dropdown.
- `TaskControlButtons` — Edit/delete/complete action buttons.
- `ProjectListView` — Tree/list view with expand/collapse.
- `ProjectTasksView` — Container toggling list vs board view.
- `board/ProjectBoardView` — Full Kanban board by status.
- `board/BoardColumn` / `BoardTaskCard` — Droppable columns and draggable cards.
- `useTaskMutations` — Task CRUD with optimistic updates.
- `useTaskQuery` — Coordinates task + project fetching, builds task tree.

**`mobile/`** — Mobile-optimized components.
- `MobileAgenda` — Today's upcoming tasks card.
- `MobileFAB` — Floating action button for quick creation.

### `shared/`

Cross-cutting concerns. Cannot import from `features/` or `app/`.

**`api/`**
- `planterClient.ts` — Central API adapter. All DB access goes through here — never call `supabase.from()` directly in components. Implements hierarchy, cloning, date cascading.
- `auth.ts` — `checkIsAdmin()` via Supabase RPC.

**`contexts/`**
- `AuthContext.tsx` — Single context: session, user profile, role hydration, auth actions (sign in/up/out).

**`db/`**
- `client.ts` — Supabase client initialization.
- `database.types.ts` — Auto-generated types from Supabase schema (regenerate with `npx supabase gen types`).
- `app.types.ts` — Domain types re-exported from database types (`Task`, `Project`, `Person`, `TaskResource`, etc.).

**`lib/`**
- `date-engine/index.ts` — Date calculations: cascading parent dates, relative scheduling, deadline rollups. Fragile — test thoroughly.
- `date-engine/payloadHelpers.ts` — Prepares date payloads for the engine.
- `tree-helpers.ts` — Converts flat task arrays into hierarchical tree structures.
- `retry.ts` — Exponential backoff retry; fails fast on 400/401/404, retries on network errors.
- `utils.ts` — Tailwind class merging and general helpers.

**`constants/`**
- `domain.ts` — Roles, statuses, task types.
- `colors.ts` — Color palette.
- `index.ts` — Re-exports + `POSITION_STEP` for drag-drop ordering.

**`ui/`** — Shadcn/Radix primitives (button, card, dialog, dropdown-menu, input, select, etc.) plus custom components: `CommandPalette`, `ErrorFallback`, `RoleIndicator`, `SidebarNavItem`, `StatusCard`.

### Data Flow

```
Component → React Query hook → planterClient → Supabase SDK
```

- **planterClient.ts**: All DB access. Never call `supabase.from()` directly.
- **React Query**: Server state. Mutations use `useTaskMutations` / `useProjectMutations` with optimistic updates.
- **AuthContext**: Session, profile, role hydration.
- **Realtime**: `Project.tsx` subscribes to Supabase realtime channels for live task updates.

### Key Domain Concepts

- **Tasks and Projects share one DB table** (`tasks`). A "project" is a root task (`parent_task_id = null`). Hierarchy is `root_id` + `parent_task_id`.
- **origin** field: `'template'` (library templates) vs `'instance'` (active projects).
- **date-engine** (`src/shared/lib/date-engine/`): Handles date calculations, cascading parent dates, relative scheduling. Modify with care.

## Tech Stack

- **React 19** + **TypeScript** (strict mode, ES2022 target)
- **Vite** (build + dev server)
- **Supabase** (Postgres, Auth, Realtime, Edge Functions)
- **TanStack React Query v5** (server state)
- **Tailwind CSS v4** + **Radix UI** + **Shadcn** components
- **dnd-kit** (drag and drop)
- **Lucide React** (icons)
- **Sonner** (toast notifications)

## Conventions

- **TypeScript only** — no `.js` or `.jsx` files. Ever.
- **No barrel files** — import directly from component/hook paths.
- **Path alias**: `@/` maps to `src/`. Use `@/features/...`, `@/shared/...`, etc.
- **Types**: Derived from Supabase generated types in `src/shared/db/database.types.ts`, re-exported as domain types in `src/shared/db/app.types.ts`.
- **No direct Supabase calls in components** — go through `planterClient` or mutation hooks.
- **Styling**: Tailwind utility classes only. No custom CSS files. Use `class-variance-authority` for variants.

## Routes

```
/login          → LoginForm
/dashboard      → Dashboard (default after login)
/reports        → Reports
/project/:id    → Project detail
/tasks          → TasksPage (My Tasks view)
/settings       → Settings
```

## Environment

```
VITE_SUPABASE_URL       # Supabase project URL
VITE_SUPABASE_ANON_KEY  # Supabase anon key
```

Local Supabase: API on `:54321`, DB on `:54322`, Studio on `:54323`.

## Supabase RLS & Database Functions

RLS is enabled on all tables. Authorization is role-based per project.

### Schema Overview

**Tables:**
- **`tasks`** — Core table. Projects are root tasks (`parent_task_id = null`, `root_id = id`). Subtasks form a tree via `parent_task_id`. Hierarchy: Project → Phase → Milestone → Task.
- **`project_members`** — User-project membership. `(project_id, user_id)` unique. `role` column controls access.
- **`people`** — Contacts/people per project (not auth users). Has `project_id` FK.
- **`task_resources`** — Attachments on tasks. `resource_type` enum, optional `storage_bucket`/`storage_path` for files.
- **`task_relationships`** — Links between tasks (`from_task_id` → `to_task_id`, `type` defaults to `'relates_to'`).
- **`admin_users`** — Admin whitelist. `user_id` + `email`.

**Views:**
- **`tasks_with_primary_resource`** — Tasks LEFT JOINed with their primary `task_resources` row. Used by `planterClient.ts` for reads.

**Key `tasks` columns:**
- `root_id` — Points to the project (root task). Auto-set by `set_root_id_from_parent()` trigger.
- `origin` — `'template'` (library) or `'instance'` (active project).
- `status` — Text enum: `'todo'`, `'not_started'`, `'in_progress'`, `'completed'`.
- `is_complete` — Boolean completion flag (used by `check_phase_unlock` trigger).
- `is_locked` / `prerequisite_phase_id` — Phase locking system.
- `position` — Sort order among siblings.
- `settings` — JSONB (stores phase color/icon).
- `days_from_start` — Relative scheduling offset.
- `assignee_id` — FK to auth user.

### Role Hierarchy

`owner > editor > coach > viewer > limited` — defined in `project_members.role`.

### Core RLS Helper Functions (SECURITY DEFINER)

- **`has_project_role(pid, uid, roles[])`** — Primary gate. Used in nearly every policy. Checks `project_members` for matching role.
- **`is_admin(uid)`** — Checks `admin_users` table. Used as fallback override in every policy.
- **`check_project_ownership(pid, uid)`** — Checks `tasks.creator = uid`. Note: checks *creatorship*, not the `owner` role.
- **`is_active_member(pid, uid)`** — Checks existence in `project_members` (any role).

### RLS Policy Pattern

Most tables follow the same pattern:
- **SELECT**: project members (any role) OR admin
- **INSERT/UPDATE/DELETE**: owner + editor OR admin
- **`tasks` table**: also allows `creator` to read/update/delete their own tasks, and templates (`origin = 'template'`) are publicly readable by authenticated users

### Trigger Functions (on `tasks` table)

- **`set_root_id_from_parent()`** — INSERT/UPDATE: auto-sets `root_id` from parent's root_id
- **`calc_task_date_rollup()`** — INSERT/UPDATE/DELETE: rolls up `min(start_date)` / `max(due_date)` to parent (recursive with depth guard)
- **`handle_updated_at()`** — UPDATE: sets `updated_at = now()`
- **`check_phase_unlock()`** — UPDATE: when `is_complete = true`, checks if all tasks in a phase are done, unlocks dependent phases via `prerequisite_phase_id`
- **`handle_phase_completion()`** — UPDATE: when `status = 'completed'`, unlocks next sibling by `position`

### RPC Functions (called from app)

- **`initialize_default_project(pid, uid)`** — Creates hardcoded 6-phase project scaffold. Called from `planterClient.ts` on project creation.
- **`clone_project_template(template_id, parent_id, origin, uid, ...)`** — Deep-clones a task subtree with date shifting and resource cloning. Called from `planterClient.ts`.
- **`is_admin(uid)`** — Also called as RPC from `auth.ts` for client-side admin checks.

### Known Issues

- **Dual completion signals**: `is_complete` (boolean) and `status = 'completed'` (text) are used by different triggers. If they get out of sync, phase unlocking breaks.
- **`check_project_ownership` is misleading**: checks `creator` field, not the `owner` role in `project_members`.

## Critical Files

- `src/shared/api/planterClient.ts` — All CRUD + business logic (hierarchy, cloning, cascading dates)
- `src/shared/contexts/AuthContext.tsx` — Auth state, session, role hydration
- `src/shared/lib/date-engine/index.ts` — Date calculations (fragile, test thoroughly)
- `src/shared/db/app.types.ts` — Domain type definitions
- `src/features/tasks/components/TaskList.tsx` — Main project task view (project selection, tree, board UI)
- `src/features/tasks/hooks/useTaskMutations.ts` — Task CRUD with optimistic updates
- `src/features/tasks/hooks/useTaskQuery.ts` — Coordinates task + project queries
- `docs/db/schema.sql` — Database schema source of truth
