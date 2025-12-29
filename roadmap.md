# PlanterPlan Roadmap & History

**Last Updated:** 2025-12-29
**Current Focus:** Stability, Performance, & Documentation Cleanups

---

## 1. Project History (The "Main" Branch Timeline)

A chronological overview of the project's evolution from Day 1.

| Era                      | Timeline     | Key Milestones & Context                                                                                                                                                 |
| :----------------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origins**              | ~Sep 2025    | **Initial Prototype**: Basic app structure, Supabase Auth integration, and fetching user tasks.                                                                          |
| **The "Refactor"**       | Oct 2025     | **UI & Architecture Overhaul**: Unifying UI with blue accent scheme, implementing side panels, and separating "Instance" vs "Template" tasks.                            |
| **Master Library**       | Oct 2025     | **Templating System**: Added `view_master_library` view, search services, and ability to copy template tasks.                                                            |
| **Standards & Hygiene**  | Nov 2025     | **Codebase Maturation**: Enforced content-agnostic "shapes" (PropTypes), strict linting/formatting (Prettier/ESLint), and consolidated CSS.                              |
| **Phase 2: Teams**       | Nov-Dec 2025 | **Simulated Multi-Tenancy**: Added RLS policies for `project_members`, "Joined Projects" view, and Invite logic.                                                         |
| **Phase 4: The Engine**  | Dec 2025     | **Deep Copy & Drag-n-Drop**: Implemented recursive "Deep Clone" for templates and a robust `dnd-kit` implementation with database persistence and optimistic UI updates. |
| **Tech Debt: Resources** | Dec 2025     | **Resource Migration**: Normalized `task_resources` into a dedicated table, migrated legacy data, and established extensive RLS policies.                                |
| **Assessment Review**    | Dec 2025     | **Stability Audit**: Verified architectural integrity, identified optimistic update edge cases, and prioritized error boundaries over new features.                      |
| **Stability Push**       | Dec 2025     | **Optimistic Rollback**: Implemented graceful UI rollback for drag-and-drop failures, preventing full page reloads.                                                      |
| **Recovery & UI**        | Dec 2025     | **Data Recovery**: Restored lost task data via `supabase_importer.py` and implemented Recursive Tree View for Master Library.                                            |
| **UI Modernization**     | Dec 2025     | **Atomic Design**: Refactored components into Atoms/Molecules/Organisms. Implemented semantic Elevation & Motion system.                                                 |
| **Tree Optimization**    | Dec 2025     | **Performance & Stability**: Refactored `MasterLibraryList` with split effects and recursive state updates. Fixed deployment blockers.                                   |

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

| Workflow               | Status         | Notes                                                                                                             |
| :--------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------- |
| **CRUD Operations**    | ✅ **Working** | Create, Read, Update, Delete (with cascade).                                                                      |
| **Reordering (DnD)**   | ✅ **Working** | Drag-and-drop tasks within/across phases. Persists to DB via `position`.                                          |
| **Task Search (Copy)** | ✅ **Working** | "Master Library Search" allows finding and copying templates. Supports filtering by resource type (PDF/Text/URL). |
| **Scheduling**         | ✅ **Working** | Supports "Days from Start" offsets and auto-calculation of dates.                                                 |

### 👥 Collaboration

| Workflow              | Status         | Notes                                                                   |
| :-------------------- | :------------- | :---------------------------------------------------------------------- |
| **Invite Member**     | ✅ **Working** | Adds users to `project_members`. RLS policies grant access.             |
| **Role Visibility**   | ✅ **Working** | UI badges for 'Owner' vs 'Editor'.                                      |
| **Real-time Updates** | ❌ **Planned** | No Supabase Subscription integration yet (polling or refresh mandated). |

### 📊 Reporting

| Workflow                  | Status         | Notes                                                   |
| :------------------------ | :------------- | :------------------------------------------------------ |
| **Project Status Report** | ✅ **Working** | Print-friendly read-only view via `/report/:projectId`. |

---

## 3. Future Roadmap

Remaining phases from the original plan, updated for current context.

### Phase 5: Stability & Polish (Current Priority)

_Goal: Ensure the app is rock-solid for beta users before adding more complexity._

#### 5.1 Error Boundaries

- **ID:** `P5-ERR-BOUND`
- **Goal**: Prevent white-screen crashes by catching React errors in `TaskList` and `TaskItem`.
- **Status**: ✅ Done

#### 5.2 Optimistic Rollback Refinement

- **ID:** `P5-OPT-ROLLBACK`
- **Goal**: Improve user experience when a drag operation fails (currently does a heavy full-refetch).
- **Status**: ✅ Done

#### 5.3 Invite by Email

- **ID:** `P5-EMAIL-INVITES`
- **Goal**: Allow inviting members by email instead of raw UUIDs (requires new look-up logic).
- **Status**: ✅ Done

#### 5.4 Performance: Recursive Tree Optimization

- **ID:** `P5-TREE-PERF`
- **Goal**: Prevent re-renders in deep trees using `React.memo` and data-driven expansion state.
- **Status**: ✅ Done

#### 5.5 Tech Debt Resolution (Deep Clone & Refactor)

- **ID:** `P5-TECH-DEBT`
- **Goal**: Fix transactional integrity of deep cloning and refactor `TaskList.jsx` into hooks.
- **Status**: ✅ Done

### Phase 6: Performance & Scale

_Goal: Optimize for large trees and many users._

#### 6.1 Dashboard Pagination

- **ID:** `P6-DASH-PAGINATION`
- **Goal**: Implement server-side pagination for the main dashboard to handle users with >1000 tasks.
- **Status**: 📅 Planned

#### 6.2 Recursive Fetch Optimization

- **ID:** `P6-RECURSIVE-FETCH`
- **Goal**: Optimize `taskService.js` to handle large trees efficiently.
- **Status**: ✅ Done (Implemented `root_id` based fetching in `fetchTaskChildren`)

#### 6.3 Real-time Collaboration

- **ID:** `P6-REALTIME`
- **Goal**: Implement Supabase Realtime subscriptions to reflect task updates instantly across clients.
- **Status**: 📅 Planned

### Phase 7: RAG Implementation (App Capability)

_Goal: Enable project Q&A grounded in Supabase data, implemented safely via small verifiable PRs._

#### 7.1 Contracts & Evaluation

- **ID:** `P7-RAG-CONTRACT`
- **Goal**: Define security contracts, retrieval budgets, and evaluation, datasets.
- **Status**: ✅ Done

#### 7.2 SQL Context Retrieval

- **ID:** `P7-RAG-SQL`
- **Goal**: Implement RPCs for structured project context retrieval (tasks/resources) without embeddings.
- **Status**: ✅ Done

#### 7.3 Hybrid Retrieval (Vectors + FTS)

- **ID:** `P7-RAG-HYBRID`
- **Goal**: Add `rag_chunks` table, FTS index, and vector embeddings for unstructured data search.
- **Status**: ✅ Done

#### 7.4 Answer Generation Loop

- **ID:** `P7-RAG-ANSWER`
- **Goal**: Implement the generation loop with corrective retries, citations, and strict refusal logic.
- **Status**: ✅ Done
