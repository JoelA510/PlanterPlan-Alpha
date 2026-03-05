# PlanterPlan — Project Specification

> **Version**: 1.3.0 (Wave 16/17 — Build Stabilization & Data Flow Simplification) 
> **Last Updated**: 2026-03-04 
> **Status**: Active Development (Vercel Deployment Blocker Resolution)

---

## 1. Executive Summary

**PlanterPlan** is a specialized project management tool designed for **Church Planters**. Unlike generic tools (Asana, Trello), PlanterPlan is built around the specific lifecycle of planting a church, using a library of "Master Templates" that can be deep-cloned into active "Project Instances".

It solves the problem of "what do I do next?" by providing curated, phase-based roadmaps (Discovery -> Launch -> Growth) that guide the user through the complexity of starting a new organization.

---

## 2. User Personas & Access Control

### 2.1 Application User Types
- **Planter Plan Admin**: Can manage master library templates, global resources, and oversee all platform usage.
- **Planter Plan User**: Standard authenticated user capable of creating or being invited to projects.

### 2.2 Project-Level Roles (Permissions Matrix)
- **Project Owner**: Can view/edit any task, add/delete tasks, edit project settings, assign task "Leads", and invite/manage other project users.
- **Full User (Editor)**: Can view and edit any task in the project (including adding and deleting tasks). Cannot edit root project settings or manage members.
- **Limited User**: Can view any task in the project, but can *only edit their own assigned tasks*.
- **Coach**: Can view any task in the project, but can *only edit tasks specifically labeled as coaching tasks*.
- **Viewer**: Read-only access to the project structure and tasks.

---

## 3. Functional Requirements (Roadmap & Status)

> **Status Key**
> - [x] **Complete**: Implemented, tested, and actively functioning in the codebase.
> - [/] **In Progress**: Active development, partially implemented, or currently undergoing stabilization.
> - [ ] **Pending**: Planned for the active roadmap but not yet started.
> - [-] **Deferred (Backlog)**: Originally documented "for later" and moved to Section 6.

### 3.1 User Accounts & Auth
- [x] Login / Logout (Supabase GoTrue)
- [x] Account Creation / Sign up
- [x] Basic Error Handling (Wrong password/email)
- [-] Edit Account Settings (Password, Username updates)

### 3.2 Projects Domain
- [x] **Creation & Deletion**: Create project from Master Template (deep clone RPC), delete project.
- [x] **Team Management**:
  - [x] Invite a member via email with a specific role.
  - [x] Remove a member.
  - [x] Change member role permissions.
- [/] **Project Settings**: Edit due date, due soon thresholds, and location (Database schema `settings` JSONB exists; UI implementation ongoing).
- [-] **Advanced Access**: Assign Phase/Milestone to a limited viewer.

### 3.3 Tasks Domain (Shared Project & Template Functionality)
- [x] **Task Schema**: Title, Description, Purpose, Actions, Start Date, Due Date, Notes, Status, Completion.
- [x] **Task Creation/Deletion**: 
  - [x] Add Task / Subtask / Milestone.
  - [x] Delete Task (with cascading effect on existing due dates).
- [x] **Task Hierarchy & Visualization**:
  - [x] View project/template tasks in an expandable/collapsible hierarchy tree.
  - [x] Edit task, subtask, and milestone info.
- [x] **Drag and Drop Engine**:
  - [x] Pick up and drag tasks to any location.
  - [x] Drop on top of another task (reparenting / making it a child).
  - [x] Drop adjacent to another task (reordering).
  - [x] Strict cycle detection (Unable to drop a parent inside its own child).
  - [x] Position renormalization and cascading due-date changes based on parent movement.
- [x] **Task Interactions**:
  - [x] Edit completeness status.
  - [x] Assign user as "Lead" (`assignee_id`).

### 3.4 Resources Domain
- [x] **Task Integration**: Add/remove external links, PDFs, and text resources directly to the task pane.
- [/] **Resource Library**: Centralized view to search and filter project resources.

### 3.5 Master Library & Templates
- [x] **Template Management**: Create, edit, and delete templates.
- [x] **Library Integration**: Search and copy tasks from the Master Library when adding to a template or active project.
- [x] **Promotion**: Promote an instance task back to the Master Library.

### 3.6 Dashboard
- [x] **Metrics Overview**: View counts for current tasks, due soon, overdue.
- [x] **Status Breakdown**: View metrics for complete, in progress, and blocked tasks.
- [x] **Portfolio Tracking**: Number of active projects.

### 3.7 Technical Hardening (Current Active Focus)
- [/] **Build Stabilization (Wave 16)**: Eliminating `tsc` errors, dead code, and standardizing Supabase `| null` types to clear Vercel deployment blockers.
- [ ] **Data Flow Simplification (Wave 17)**: Migrate to `@supabase-cache-helpers` to eliminate manual React Query invalidations and sunset `planterClient.ts`.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Tree Rendering**: Support for 500+ tasks without UI lag via O(1) lookup maps and memoized trees.
- **Network**: All data fetching uses `stale-while-revalidate` (React Query) with deterministic cache keys.

### 4.2 Security
- **Authentication**: JWT-based via Supabase Auth.
- **Authorization**: Row-Level Security (RLS) enforced on ALL database tables matching the Project Roles matrix.

### 4.3 Data Integrity
- **Cycle Detection**: Drag-and-drop MUST prevent circular parent-child relationships algorithmically.
- **Deep Cloning**: Template instantiation (`clone_project_template` RPC) must copy the *entire* tree structure, position IDs, and references atomically.

---

## 5. Technical Architecture

For a deep dive into the system architecture, please refer to:
- **[FULL_ARCHITECTURE.md](docs/FULL_ARCHITECTURE.md)**: Comprehensive technical reference.
- **[repo-context.yaml](repo-context.yaml)**: Machine-readable dependency graph.

---

## 6. Future Roadmap (Deferred & Backlog)

### 6.1 Original Spec "For Later" Items
- [ ] **Account Management**: User ability to update password and profile data.
- [ ] **Task Status Extensions**: Ability to mark a task as "N/A" (Not Applicable).
- [ ] **Milestone Automation**: Auto-update a milestone's completeness status when all child tasks are marked complete.
- [ ] **Licensing Limits**: License restrictions for project creation volume.
- [ ] **Dedicated Filtered Views**: Dedicated UI tables/pages to view tasks isolated by "Due Soon", "Overdue", "In Progress", or "Blocked".
- [ ] **Coach Labels**: Introduce a specific "Coach" label/tag assigned to projects, milestones, or tasks. When a user is given the Coach role, they are granted edit access *only* to tasks carrying this label.
- [ ] **Template Publishing**: Ability to mark a template as "Published/Unpublished" to control visibility.
- [ ] **Admin Management Suite**: Dedicated Admin UI for creating net-new Master Library tasks (not from a template) and globally managing (view/edit/delete/search) all system resources.

### 6.2 Advanced Features
- [ ] **Kanban Board V2**: Native column-to-column drag-and-drop with strict type safety (replacing the V1 math-heavy board).
- [ ] **Gantt Chart**: Timeline view based on `start_date` and `due_date`.
- [ ] **Collaboration Suite**: Threaded comments on tasks, activity/audit logs, and real-time presence (cursors).
- [ ] **Automation Engine**: Recurring tasks ("Every Monday", "First of Month").
- [ ] **Mobile Infrastructure**: PWA Support (Installable on iOS/Android) and Local-first offline mode (RxDB/WatermelonDB sync).
