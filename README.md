<!--
README CONTRACT (keep this block at the top)

Scope:
- This README is a codebase-understanding document for reviewers + PMs.
- It is NOT a roadmap, NOT a setup guide, NOT marketing.

Non-negotiables:
- Document ONLY what exists in the repo at the referenced commit.
- **Evidence Rule**: If you can't link it, you can't claim it.
- Every non-trivial claim must be backed by concrete repo evidence:
  - file paths, exported symbols, function names, table/column names, migration filenames.
- Mermaid diagrams must be derivable from real code flows (handlers/events/states).
- Keep the 5-section structure intact. Do not add new top-level sections.

Update discipline:
- Before editing, update "Last verified" and "Commit".
- If a section cannot be verified from code, mark it explicitly as "Unverified" and describe what is missing.
-->

# PlanterPlan (Alpha)

**Status**: Beta (Refactoring - Round 2 Complete)
**Last Verified**: 2026-02-18 (Hooks Decomposition & Stack Upgrade)
**Maintained By**: Antigravity Agent
**Commit**: HEAD
**Primary audience**: code reviewers, project managers
**Related Docs**: [Engineering Knowledge Base](./docs/operations/ENGINEERING_KNOWLEDGE.md)

---

## 1. What Is This?

PlanterPlan is a project management tool tailored for church planting. It allows users (Project Managers) to manage projects as hierarchical task trees. The system distinguishes between "Templates" (standardized task lists) and "Instances" (active projects derived from templates), supporting deep cloning to instantiate new projects.

---

## 2. Project Structure (Feature-Sliced Design)

The codebase uses a modified **Feature-Sliced Design (FSD)** to enable Agentic reasoning and domain isolation.

```text
src/
├── app/            # Global wiring (App.jsx, providers, router)
├── features/       # Business domains
├── tasks/
│   ├── components/
│   ├── hooks/      # Decomposed logic (useTaskTree, useTaskDragAndDrop)
│   └── services/
└── projects/
├── shared/         # Reusable code with NO business logic
│   ├── lib/        # Pure functions
│   │   └── date-engine/  # Payload & date calculation logic
│   └── ui/         # Dumb components (Button, Modal)
├── pages/          # Route views composing features
└── styles/         # Tailwind CSS v4 globals
```

### Where to Find Things

| To change...         | Look in...                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| **Auth Logic**       | [src/app/contexts/AuthContext.jsx](./src/app/contexts/AuthContext.jsx)                          |
| **Task API**         | [src/features/tasks/services/taskService.js](./src/features/tasks/services/taskService.js)      |
| **Database Schema**  | [docs/db/schema.sql](./docs/db/schema.sql)                                                      |
| **Task Routes**      | [src/app/App.jsx](./src/app/App.jsx)                                                            |
| **Deep Clone Logic** | [src/features/tasks/services/taskService.js](./src/features/tasks/services/taskService.js#L216) |

### Quick Start

To set up the project locally, please refer to the **[Local Development Guide](./docs/operations/local_development.md)**.

### Quick Usage Examples

Common operations for contributors:

```bash
# Run development server
npm run dev

# Run all tests
npm test

# Run specific test file
npm test -- --run src/features/tasks/hooks/useTaskBoard.test.jsx

# Lint code
npm run lint
```

**Creating a project programmatically** (via hook):
```javascript
// In a React component
import { useProjectMutations } from '@features/projects/hooks/useProjectMutations';

const { createProject } = useProjectMutations();
await createProject({ title: 'New Church Plant', templateId: 'launch_large' });
```

**Fetching project tasks** (via service):
```javascript
import { fetchTaskChildren } from '@features/tasks/services/taskService';

const { data: tasks } = await fetchTaskChildren(projectId);
```

### External dependencies

- **Supabase** -> Auth & Database (Ref: [src/app/supabaseClient.js](./src/app/supabaseClient.js))
- **dnd-kit** -> Drag and Drop interactions (Ref: [package.json](./package.json))

---

## 3. Core Concepts & Mental Model

### 3.1 Task Hierarchy (Projects are Tasks)

The system models everything as a `task`. A "Project" is simply a root-level task (`parent_task_id` is NULL). Hierarchy is maintained via adjacency list (`parent_task_id`). A `root_id` optimization field exists to allow quick fetching of entire trees without recursive queries.

```mermaid
graph TD
    Project["Root Task (Project)"] --> Phase["Mid-level Task"]
    Phase --> Item["Leaf Task"]
    Item --> SubItem["Sub-Task"]
```

#### Evidence: Hierarchy

- `public.tasks` table definition -> [docs/db/schema.sql](./docs/db/schema.sql#L6)
- `maintain_task_root_id` trigger -> [docs/db/schema.sql](./docs/db/schema.sql#L30)

### 3.2 Templates vs. Instances

Tasks have an `origin` field. A `template` tree serves as a master copy. Users create projects by "Deep Cloning" a template, which duplicates the entire tree and marks the new tasks as `origin = 'instance'`.

```mermaid
stateDiagram-v2
    Template --> DeepClone: User creates project
    DeepClone --> Instance: Copies all nodes
    Instance --> Active: User edits instance
```

#### Evidence: Templates

- `origin` column -> [docs/db/schema.sql](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/docs/db/schema.sql#L12)
- `deepCloneTask` function -> [src/services/taskService.js](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/services/taskService.js#L216)
- `view_master_library` (Templates) -> [docs/db/schema.sql](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/docs/db/schema.sql#L97)

---

## 4. Architecture

For detailed Component Diagrams and Data Flow visualizations, please see the **[Architecture Documentation](./docs/ARCHITECTURE.md)**.

### 4.1 Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS v4
- **Testing**: Vitest, React Testing Library
- **State**: React Context (Auth, Organization, Task)
- **Database**: Supabase (Postgres) + Row Level Security (RLS) is enabled on `public.tasks` and `public.project_members`.
- Ref: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in [docs/db/schema.sql](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/docs/db/schema.sql#L111).

### 4.2 Data Flow

The app interacts directly with Supabase via service modules. State is largely server-driven, with local React state for UI. Authentication is managed globally via Context.

```mermaid
flowchart LR
    User --> App[App.jsx]
    App --> Auth[AuthContext.jsx]
    App --> Service[taskService.js]
    Auth --> SupabaseAuth[Supabase Auth]
    Service --> SupabaseDB["Supabase DB (public.tasks)"]
    SupabaseDB --> Service
    Service --> App
```

### 4.3 Component Responsibilities

| Component/Module | Responsibility                                                   | Primary files                                                                                                      |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **AuthContext**  | Manages user session (login/logout/user object).                 | [`src/app/contexts/AuthContext.jsx`](src/app/contexts/AuthContext.jsx)                                             |
| **taskService**  | Encapsulates all DB operations for tasks (fetch, search, clone). | [`src/features/tasks/services/taskService.js`](src/features/tasks/services/taskService.js)                         |
| **TaskList**     | Main dashboard layout; manages drag-and-drop context.            | [`src/features/tasks/components/TaskList.jsx`](src/features/tasks/components/TaskList.jsx)                                         |
| **AppSidebar**   | Persistent sidebar for app navigation.                           | [`src/features/navigation/components/AppSidebar.jsx`](src/features/navigation/components/AppSidebar.jsx)                           |
| **ProjectSidebar**| Project-specific navigation context.                            | [`src/features/navigation/components/ProjectSidebar.jsx`](src/features/navigation/components/ProjectSidebar.jsx)                   |

### 4.4 Database Schema

| Table/Collection      | Purpose                                        | Key fields                                                                    |
| --------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `tasks`               | Stores both projects and tasks in a hierarchy. | `id`, `parent_task_id`, `root_id`, `origin`, `creator`, `primary_resource_id` |
| `task_resources`      | Stores resources attached to tasks.            | `id`, `task_id`, `type`, `url`, `storage_path`                                |
| `project_members`     | Manages permissions for shared projects.       | `project_id`, `user_id`, `role`                                               |
| `view_master_library` | Filters tasks to show only root templates.     | `*` (from tasks)                                                              |

#### Relationships

- `parent_task_id` -> Self-reference (Hierarchy) (Ref: [schema.sql](docs/db/schema.sql#L8))
- `root_id` -> Denormalized reference to the top-level project (Ref: [schema.sql](docs/db/schema.sql#L22))

### 4.5 Security Model

#### Authentication

- Supabase Auth (JWT) implemented in [src/app/contexts/AuthContext.jsx](src/app/contexts/AuthContext.jsx).

#### Data isolation

- RLS (Row Level Security) is enabled on `public.tasks` and `public.project_members`.
- Ref: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in [docs/db/schema.sql](docs/db/schema.sql#L111).

---

## 5. Current State

### 5.1 Working Features

- ✅ **Authentication**: Sign in/out, session persistence (Ref: `AuthContext.jsx`).
- ✅ **Task Management**: Fetching tasks, data modeling for hierarchy (Ref: `taskService.js`).
- ✅ **Deep Cloning**: Duplicating entire template trees to new instances (Ref: `deepCloneTask` in `taskService.js`).
- ✅ **Master Library Search**: Searching templates via `searchMasterLibraryTasks`, with support for resource type filtering (Ref: `taskService.js`).
- ✅ **Project Reporting**: Read-only print view with completion stats (Ref: `ProjectReport.jsx`).
- ✅ **Master Library Tree View**: Recursive display of template hierarchies with on-demand loading (Ref: `MasterLibraryList.jsx`).
- ✅ **Optimization**: Task trees fetched via `root_id` index instead of recursive calls (Ref: `fetchTaskChildren` in `taskService.js`).
- ✅ **Side Navigation**: Persistent sidebar for project context switching (Ref: `ProjectSidebar.jsx`).
- ✅ **Responsive Dashboard**: Full-screen layout. `DashboardLayout.jsx` supports both static `AppSidebar` and dynamic `ProjectSidebar`.
- ✅ **End-to-End**: 100% Concurrent Pass Rate (25/25 scenarios) (Ref: `playwright-e2e-testing-system.md`).
- ✅ **People/CRM Lite**: Manage team members, roles, and statuses via specialized `PeopleList` view (Ref: `peopleService.js`).
- ✅ **Checkpoints**: Gated phases requiring completion of previous phase to unlock (Ref: `PhaseCard.jsx`).
- ✅ **Mobile Field Mode**: Quick-action FAB and "Today's Agenda" for on-the-go focus.
- ✅ **Dark Mode 🌙**: System sync + persistent toggle (Ref: [ThemeContext.jsx](./src/app/contexts/ThemeContext.jsx)).
- ✅ **List Virtualization ⚡**: Smooth scrolling for projects with 50+ tasks (Ref: [ProjectListView.jsx](./src/features/tasks/components/ProjectListView.jsx)).
- ✅ **View-As Switcher 👁️**: Admin preview mode for role testing (Ref: [ViewAsContext.jsx](./src/app/contexts/ViewAsContext.jsx)).

### 5.2 Known Limitations

- ⚠️ **Recursive Fetching**: The `fetchTaskChildren` implementation performs an in-memory BFS rather than a recursive DB query, which may limit performance on very large trees.
  - Evidence: [src/services/taskService.js#L148-L208](file:///home/joel/PlanterPlan/PlanterPlan-Alpha/PlanterPlan-Alpha/src/services/taskService.js#L148-L208)

### 5.3 Technical Debt & Active Refactoring

- **Active**: Hook Decomposition (Decomposed `useTaskBoard` "God Hook" into `useTaskTree`, `useProjectSelection`, `useTaskDragAndDrop`).
- **Active**: Date Logic Centralization (Extracted payload logic to `shared/lib/date-engine/payloadHelpers.js`).
- **Known Debt**:
  - **Supabase SDK vs Raw Fetch**: We use strict raw fetch for architectural purity, which adds boilerplate (Ref: `planterClient.js`).
