# PlanterPlan Roadmap & History

**Last Updated**: 2026-01-12 (Master Review & PR Fixes)
**Current Focus**: Phase 7 (Design System Verification)

---

## 1. Project History (The "Main" Branch Timeline)

A chronological overview of the project's evolution from Day 1.

| Era                      | Timeline     | Key Milestones & Context                                                                                                                                                         |
| :----------------------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origins**              | ~Sep 2025    | **Initial Prototype**: Basic app structure, Supabase Auth integration, and fetching user tasks.                                                                                  |
| **The "Refactor"**       | Oct 2025     | **UI & Architecture Overhaul**: Unifying UI with blue accent scheme, implementing side panels, and separating "Instance" vs "Template" tasks.                                    |
| **Master Library**       | Oct 2025     | **Templating System**: Added `view_master_library` view, search services, and ability to copy template tasks.                                                                    |
| **Standards & Hygiene**  | Nov 2025     | **Codebase Maturation**: Enforced content-agnostic "shapes" (PropTypes), strict linting/formatting (Prettier/ESLint), and consolidated CSS.                                      |
| **Phase 2: Teams**       | Nov-Dec 2025 | **Simulated Multi-Tenancy**: Added RLS policies for `project_members`, "Joined Projects" view, and Invite logic.                                                                 |
| **Phase 4: The Engine**  | Dec 2025     | **Deep Copy & Drag-n-Drop**: Implemented recursive "Deep Clone" for templates and a robust `dnd-kit` implementation with database persistence and optimistic UI updates.         |
| **Tech Debt: Resources** | Dec 2025     | **Resource Migration**: Normalized `task_resources` into a dedicated table, migrated legacy data, and established extensive RLS policies.                                        |
| **Assessment Review**    | Dec 2025     | **Stability Audit**: Verified architectural integrity, identified optimistic update edge cases, and prioritized error boundaries over new features.                              |
| **Stability Push**       | Dec 2025     | **Optimistic Rollback**: Implemented graceful UI rollback for drag-and-drop failures, preventing full page reloads.                                                              |
| **Recovery & UI**        | Dec 2025     | **Data Recovery**: Restored lost task data via `supabase_importer.py` and implemented Recursive Tree View for Master Library.                                                    |
| **UI Modernization**     | Dec 2025     | **Atomic Design**: Refactored components into Atoms/Molecules/Organisms. Implemented semantic Elevation & Motion system.                                                         |
| **Tree Optimization**    | Dec 2025     | **Performance & Stability**: Refactored `MasterLibraryList` with split effects and recursive state updates. Fixed deployment blockers.                                           |
| **Workflow Audit**       | Jan 2026     | **Roadmap Alignment**: Caught up with `notion.md` requirements. Hardened RAG removal and modularized services.                                                                   |
| **Side Nav & Debt**      | Jan 2026     | **Navigation Overhaul**: Implemented persistent Side Navigation and refactored `TaskList` for modularity and performance.                                                        |
| **Mobile Polish**        | Jan 2026     | **Responsive UI**: Implemented mobile-responsive `DashboardLayout` with drawer navigation and light theme polish.                                                                |
| **Feedback Sprint**      | Jan 2026     | **Logic & UI Polish**: Addressed 40+ feedback items including RBAC security, Timezone fixes, Printer styles, and form layout improvements.                                       |
| **Surgical Refactor**    | Jan 2026     | **Architecture Hardening**: Split monolithic hooks (`useTaskOperations`), Refactored `MasterLibraryList` to `useTreeState`, Consolidatd Documentation, and Updated Dependencies. |
| **Master Audit**         | Jan 2026     | **Code Quality**: Automated Master Review Orchestrator execution. Fixed React patterns, enforced strict linting, and verified Golden Paths.                                      |
| **Vite Migration**       | Jan 2026     | **Infrastructure**: Moved to Vite, Vitest, and Tailwind v4. Integrated Planter modules. Verified via Golden Paths.                                                               |
| **Debt Cleanup & Fixes** | Jan 2026     | **Stability**: Fixed `DashboardLayout` Sidebar injection, standardized chart colors using `TASK_STATUS` constants, and resolved critical test failures.                          |
| **PR Review Fixes**      | Jan 2026     | **Review**: Integrated fixes from Codex/Gemini: Generic Entity Client, Design System corrections (Colors, Arbitrary Values).                                                     |
| **Exhaustive Audit**     | Jan 2026     | **Security & Hygiene**: Locked down RLS (Creator/Member access only), fixed License checks, extracted Charts, and removed 900+ lines of dead CSS.                                |
| **Vibe Security Fixes**  | Jan 2026     | **Security Hardening**: Fixed "Authorized-Then-Escalate" pattern in Edge Functions. Secured `tasks` Insert RLS. Validated via Adversarial Browser Test.                          |

---

## 2. UX Workflows & Status

The core user journeys identified in the codebase and their current operational status.

### 🔐 Authentication & Access Control

| Workflow              | Status         | Notes                                                                 |
| :-------------------- | :------------- | :-------------------------------------------------------------------- |
| **Sign Up / Login**   | ✅ **Working** | Powered by `AuthContext` + Supabase Auth.                             |
| **Role-Based Access** | 🚧 **Partial** | Owner/Editor badges exist. Limited User/Coach logic partially in RLS. |
| **Invite Member**     | ✅ **Working** | Adds users to `project_members`. Hardened for CORS/Email lookups.     |

### 🚀 Project & Hierarchy Management

| Workflow                      | Status         | Notes                                                                       |
| :---------------------------- | :------------- | :-------------------------------------------------------------------------- |
| **Side Navigation List**      | ✅ **Done**    | Move list of projects to the side navigation bar (Single project focus).    |
| **Create Project (Scratch)**  | ✅ **Working** | Creates a root-level task with `origin='instance'`.                         |
| **Create Project (Template)** | ✅ **Working** | Deep Clones a template tree (root + descendants) to a new instance project. |
| **Project Settings**          | 🚧 **Partial** | Name/Start/End dates editable. Location/'Due soon' settings planned.        |
| **Hierarchy (Phases)**        | ✅ **Working** | Supported via recursive nesting.                                            |

### 📝 Task Execution & Views

| Workflow              | Status         | Notes                                                                           |
| :-------------------- | :------------- | :------------------------------------------------------------------------------ |
| **CRUD Operations**   | ✅ **Working** | Create, Read, Update, Delete (with cascade).                                    |
| **Reordering (DnD)**  | ✅ **Working** | Drag-and-drop tasks within/across phases. Persists to DB via `position`.        |
| **View Filters**      | 📅 **Planned** | Priority, Status-based, Organization, and Personal views via search/filter bar. |
| **CRM Lite**          | ✅ **Done**    | People List, Add Person Modal, and Project Tabs.                            |
| **Checkpoint System** | 📅 **Planned** | Sequential phase unlocking logic (Phase N+1 unlocks when Phase N is complete).  |

### 📊 Reporting & Analytics

| Workflow                | Status         | Notes                                                                       |
| :---------------------- | :------------- | :-------------------------------------------------------------------------- |
| **Basic Status Report** | ✅ **Working** | Print-friendly read-only view via `/report/:projectId`.                     |
| **Advanced Dashboard**  | 📅 **Planned** | Donut charts for progress, reporting month selection, and milestone trends. |

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
- **Goal**: Improve user experience when a drag operation fails.
- **Status**: ✅ Done

#### 5.3 Invite by Email

- **ID:** `P5-EMAIL-INVITES`
- **Goal**: Allow inviting members by email instead of raw UUIDs.
- **Status**: ✅ Done

#### 5.4 Performance: Recursive Tree Optimization

- **ID:** `P5-TREE-PERF`
- **Goal**: Prevent re-renders in deep trees using `React.memo` and expansion state.
- **Status**: ✅ Done

#### 5.5 Tech Debt Resolution

- **ID:** `P5-TECH-DEBT`
- **Goal**: Modularize task services and fix transactional integrity of deep cloning.
- **Status**: ✅ Done

#### 5.6 Infrastructure Maintenance

- **ID:** `P5-CLEANUP`
- **Goal**: Remove RAG features, fix Master Library expansion bugs and CORS issues.
- **Status**: ✅ Done

#### 5.7 Feedback Integration

- **ID:** `P5-FEEDBACK`
- **Goal**: Address 60+ feedback items regarding UI/UX, Logic and Performance.
- **Status**: ✅ Done

### Phase 6: Performance & Experience

_Goal: Optimize for large trees and refine the dashboard interface._

#### 6.1 Dashboard Pagination

- **ID:** `P6-DASH-PAGINATION`
- **Goal**: Implement server-side pagination for the main dashboard.
- **Status**: ✅ Done

#### 6.2 Advanced Reporting UI

- **ID:** `P6-ADV-REPORTING`
- **Goal**: Implement donut charts, reporting month filters, and milestone trend analysis.
- **Status**: ✅ Done

#### 6.3 Side Navigation Migration

- **ID:** `P6-SIDE-NAV`
- **Goal**: Move project list into the side navigation bar (Single project focus).
- **Status**: ✅ Done

#### 6.4 Real-time Collaboration

- **ID:** `P6-REALTIME`
- **Goal**: Implement Supabase Realtime subscriptions.
- **Status**: 📅 Planned

#### 6.5 Layout & Navigation Polish

- **ID:** `P6.5-LAYOUT`
- **Goal**: Resolve layout conflicts (CSS vs Tailwind), implement persist SideNav with global links, and standardize UI.
- **Status**: ✅ Done

#### 6.6 Visual Hierarchy & CSS Debt

- **ID:** `P6.6-VISUAL`
- **Goal**: Semantic color correction (`--brand-primary`), responsive side panel, and component hardening.
- **Status**: ✅ Done

#### 6.7 Layout Responsiveness

- **ID:** `P6.7-RESPONSIVE`
- **Goal**: Fix mobile layouts, sticky headers, and side panel overlay behavior.
- **Status**: ✅ Done

#### 6.8 Component Logic Polish

- **ID:** `P6.8-LOGIC`
- **Goal**: Hydration safety for dates and crash prevention for empty sortable contexts.
- **Status**: ✅ Done

### Phase 7: Advanced Engine & Automation

_Goal: Automate date inheritance and status tracking._

#### 7.0 Visual Overhaul & Navigation Integration

- **ID:** `P7-VISUAL-OVERHAUL`
- **Goal**: Redesign Project Header, fix full-screen layout, and integrate Reports into the main dashboard navigation.
- **Status**: ✅ Done (Design System Implemented)

#### 7.1 Date Inheritance

- **ID:** `P7-DATE-INHERIT`
- **Goal**: Milestone/Phase dates automatically calculate based on child task bounds.
- **Status**: ✅ Done (Jan 2026)

#### 7.2 Nightly Sync

- **ID:** `P7-NIGHTLY-SYNC`
- **Goal**: Background jobs to update task statuses and overdue flags nightly.
- **Status**: ✅ Done (Jan 2026)

### Phase 9: Administration & Alerts

_Goal: System-wide visibility and admin tools._

#### 9.1 System Notifications

- **ID:** `P9-ADMIN-ALERTS`
- **Goal**: Automated email alerts to System Admin for new project creation.
- **Status**: 📅 Planned

#### 9.3 Advanced RBAC

- **ID:** `P9-RBAC-ROLES`
- **Goal**: Granular enforcement for 'Full User', 'Limited User', and 'Coach' permissions.
- **Status**: ✅ Done (Coach/Limited roles added)

### Phase 10: Infrastructure Modernization (`status:done`)

- [x] Migrate from CRA to Vite (`status:done`)
- [x] Replace Jest with Vitest (`status:done`)
- [x] Implement Tailwind CSS v4 (`status:done`)
- [x] Agentic Refactor: FSD Architecture (`status:done`)
- [x] Documentation & Knowledge Transfer (`status:done`)

#### 10.1 Build System Migration

- **ID:** `P10-VITE-MIGRATION`
- **Goal**: Replace `react-scripts` with `vite`. usage of `VITE_` env vars.
- **Status**: ✅ Done

#### 10.2 Testing Migration

- **ID:** `P10-TEST-MIGRATION`
- **Goal**: Migrate Jest to Vitest. Replace `jest` globals with `vi`.
- **Status**: ✅ Done

#### 10.3 CSS Modernization

- **ID:** `P10-TAILWIND-V4`
- **Goal**: Adopt Tailwind v4 and remove manual CSS utilities.
- **Status**: ✅ Done (Phase 3 Verified)

#### 10.4 Quality Convergence (Master Review Ph 2)

- **ID:** `P10-QUALITY-CONVERGE`
- **Goal**: Standardize Design System (Rule 30) and Verify Golden Paths.
- **Status**: ✅ Done (Jan 2026)

### Phase 11: Monetization & Progression (Post-Testing)

_Goal: Structured progress flows and commerce._

#### 11.1 Checkpoint System

- **ID:** `P8-CHECKPOINTS`
- **Goal**: Unlocking Phases sequentially when previous ones are 100% complete.
- **Status**: ✅ Done (Backend Logic), UI Pending User Testing

#### 11.2 Stripe Integration

- **ID:** `P8-STRIPE`
- **Goal**: Secure license purchasing integrated into account settings.
- **Status**: 📅 Planned

---

## 4. Feature Parity Checklist (Notion Import 1/8)

*Reconciled against "PlanterPlan Feature Checklist".*

### ✅ Implemented Features

**Project & Task Management**
- [x] Create/Delete Custom Tasks (`status:done`)
- [x] Add Tasks from Master Library (`status:done`)
- [x] Phase/Milestone Hierarchy (`status:done`)
- [x] Drag & Drop Reordering (`status:done`)
- [x] Project Progress Donut Chart (`status:done`)
- [x] Basic Task Details (Start/Due dates, Purpose, Desc) (`status:done`)
- [x] Multiple Projects per User (Secondary Projects) (`status:done`)

**Team Management** (Updated Jan 13 - `feat/advanced-rbac`)
- [x] Invite Users to Project (`status:done`)
- [x] Manage Project Users (`status:done`)
- [x] Permission Levels:
    - [x] Project Owner (Admin)
    - [x] Full User (Editor)
    - [x] Limited User (Assignee Only)
    - [x] Coach (Comment/Review Only)

**Reporting**
- [x] Project Status Report (Printable) (`status:done`)
- [x] Reporting Month Selection (`status:done`)
- [x] Milestone completion lists (`status:done`)

### 🚧 Partially Implemented / In Progress

**Due Date Engine**
- [x] Project Start/End Date Input (`status:done`)
- [x] Cascade date logic (Inheritance) -> See `P7-DATE-INHERIT` (`status:done`)
- [x] Nightly status updates -> See `P7-NIGHTLY-SYNC` (`status:done`)

**Task Details & Views**
- [x] Task Priority/Status Views (Filters) (`status:done`)
- [ ] "Related tasks" dropdown (`status:pending`)
- [x] Email task details button (`status:done`)
- [x] Auto-mark children complete (`status:done`)

### 📅 Planned / Missing (Backlog)

**Admin & White Label**
- [ ] White Label Org Administration
**User Management**
- [x] Onboarding Wizard (First Run) (`status:done`)
- [x] Budgeting Lite (`status:done`)
- [ ] User License Management
- [ ] Discount Codes
- [ ] Publish/Unpublish Templates

**Advanced Logic**
- [ ] Checkpoint/Unlock System -> See `P8-CHECKPOINTS`
- [ ] Supervisor Auto-Emails
- [ ] Strategy Template Task Type

