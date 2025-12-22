# PlanterPlan Roadmap & History

**Last Updated:** 2025-12-20
**Current Focus:** Real-time Collaboration and Performance.

---

## 1. Project History (The "Main" Branch Timeline)

A chronological overview of the project's evolution from Day 1.

| Era                     | Timeline     | Key Milestones & Context                                                                                                                                                 |
| :---------------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origins**             | ~Sep 2025    | **Initial Prototype**: Basic app structure, Supabase Auth integration, and fetching user tasks.                                                                          |
| **The "Refactor"**      | Oct 2025     | **UI & Architecture Overhaul**: Unifying UI with blue accent scheme, implementing side panels, and separating "Instance" vs "Template" tasks.                            |
| **Master Library**      | Oct 2025     | **Templating System**: Added `view_master_library` view, search services, and ability to copy template tasks.                                                            |
| **Standards & Hygiene** | Nov 2025     | **Codebase Maturation**: Enforced content-agnostic "shapes" (PropTypes), strict linting/formatting (Prettier/ESLint), and consolidated CSS.                              |
| **Phase 2: Teams**      | Nov-Dec 2025 | **Simulated Multi-Tenancy**: Added RLS policies for `project_members`, "Joined Projects" view, and Invite logic.                                                         |
| **Phase 4: The Engine** | Dec 2025     | **Deep Copy & Drag-n-Drop**: Implemented recursive "Deep Clone" for templates and a robust `dnd-kit` implementation with database persistence and optimistic UI updates. |

---

## 2. UX Workflows & Status

The core user journeys identified in the codebase and their current operational status.

### 🔐 Authentication & Onboarding

| Workflow                | Status         | Notes                                                      |
| :---------------------- | :------------- | :--------------------------------------------------------- |
| **Sign Up / Login**     | ✅ **Working** | Powered by `AuthContext` + Supabase Auth.                  |
| **Session Persistence** | ✅ **Working** | LocalStorage handling via Supabase client.                 |
| **Profile Management**  | ⚠️ **Partial** | Basic display (`user.email`), no avatar/settings page yet. |

### 🚀 Project Management

| Workflow                      | Status         | Notes                                                                       |
| :---------------------------- | :------------- | :-------------------------------------------------------------------------- |
| **Create Project (Scratch)**  | ✅ **Working** | Creates a root-level task with `origin='instance'`.                         |
| **Create Project (Template)** | ✅ **Working** | Deep Clones a template tree (root + descendants) to a new instance project. |
| **Flattened Dashboard**       | ✅ **Working** | Displays both Owned and Joined projects in specific categories.             |

### 📝 Task Execution

| Workflow               | Status         | Notes                                                                                              |
| :--------------------- | :------------- | :------------------------------------------------------------------------------------------------- |
| **CRUD Operations**    | ✅ **Working** | Create, Read, Update, Delete (with cascade).                                                       |
| **Reordering (DnD)**   | ✅ **Working** | Drag-and-drop tasks within/across phases. Persists to DB via `position`.                           |
| **Task Search (Copy)** | ✅ **Working** | "Master Library Search" allows finding and copying templates. Supports filtering by resource type (PDF/Text/URL). |
| **Scheduling**         | ✅ **Working** | Supports "Days from Start" offsets and auto-calculation of dates.                                  |

### 👥 Collaboration

| Workflow              | Status         | Notes                                                                   |
| :-------------------- | :------------- | :---------------------------------------------------------------------- |
| **Invite Member**     | ✅ **Working** | Adds users to `project_members`. RLS policies grant access.             |
| **Role Visibility**   | ✅ **Working** | UI badges for 'Owner' vs 'Editor'.                                      |
| **Real-time Updates** | ❌ **Planned** | No Supabase Subscription integration yet (polling or refresh mandated). |

### 📊 Reporting

| Workflow | Status | Notes |
| :------- | :----- | :---- |
| **Project Status Report** | ✅ **Working** | Print-friendly read-only view via `/report/:projectId`. |

---

## 3. Future Roadmap

Remaining phases from the original plan, updated for current context.

### Phase 3: Reports & Resources (Next Up)

_Goal: Add reporting capabilities and expand the resource library._

#### 3.1 Resource Filters

- **ID:** `P5-RESOURCE-FILTERS`
- **Goal**: Filter learning resources by type (PDF, URL, Text).
- **Status**: ✅ Done

#### 3.2 Monthly Report View

- **ID:** `P5-REPORT-UI`
- **Goal**: Read-only "Print View" for project status reports.
- **Status**: ✅ Done

### Phase 4: Performance & Scale

_Goal: Optimize for large trees and many users._

#### 4.1 Recursive Fetch Optimization

- **ID:** `P6-RECURSIVE-FETCH`
- **Goal**: Optimize `taskService.js` to handle large trees efficiently.
- **Status**: ✅ Done (Implemented via `root_id` optimization + in-memory DFS)

#### 4.2 Real-time Collaboration

- **ID:** `P6-REALTIME`
- **Goal**: Implement Supabase Realtime subscriptions to reflect task updates instantly across clients.
- **Status**: 📅 Planned
