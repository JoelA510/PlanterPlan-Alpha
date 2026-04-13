# PlanterPlan — Project Specification

> **Version**: 1.4.0 (Architecture Consolidation & SSoT Alignment) 
> **Last Updated**: 2026-04-13 
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
- [ ] **Account Management**: User ability to update password and profile data. Registration CORS/case-sensitivity hardening.
- [ ] **Localization**: Complete Foreign Language UI mapping.

### 3.2 Projects Domain
- [x] **Creation & Deletion**: Create project from Master Template (deep clone RPC), delete project.
- [x] **Team Management**:
  - [x] Invite a member via email with a specific role (Driven by Supabase Edge Functions).
  - [x] Remove a member.
  - [x] Change member role permissions.
- [/] **Project Settings**: Edit due date and due soon thresholds. *(Note: The `Location` field is officially deprecated and will be stripped from the UI/schema).*
- [-] **Advanced Access**: Assign Phase/Milestone to a limited viewer.
- [ ] **Checkpoint-Based Architecture**: Alternate project type that unlocks sequential phases upon completing the previous phase, without rigid due dates.
- [ ] **Secondary Projects**: Ability to create and toggle between multiple projects, filtering out archived/completed projects from the active menu.

### 3.3 Tasks Domain (Shared Project & Template Functionality)
- [x] **Task Schema**: Title, Description, Purpose, Actions, Start Date, Due Date, Notes, Status, Completion.
- [x] **Task Creation/Deletion**: 
  - [x] Add Task / Subtask / Milestone.
  - [x] Delete Task (with cascading effect on existing due dates).
- [ ] **Specialized Task Types**: "Strategy Template" prompts user to add tasks from library on completion; "Coaching" auto-assigns to users with Coach role.
- [x] **Task Hierarchy & Visualization**:
  - [x] View project/template tasks in an expandable/collapsible hierarchy tree.
  - [x] Edit task, subtask, and milestone info.
  - [x] **Max Subtask Depth Constraint**: Subtasks cannot have child tasks (Maximum depth = 1). The drag-and-drop engine strictly enforces this invariant.
  - [ ] **Kanban Board V2**: Native column-to-column drag-and-drop with strict type safety (replacing the V1 math-heavy board).
- [x] **Drag and Drop Engine**:
  - [x] Pick up and drag tasks to any location.
  - [x] Drop on top of another task (reparenting / making it a child).
  - [x] Drop adjacent to another task (reordering).
  - [x] Strict cycle detection (Unable to drop a parent inside its own child).
  - [x] Position renormalization and cascading due-date changes based on parent movement.
- [x] **Task Interactions**:
  - [x] Edit completeness status (`To Do` -> `In Progress` -> `Complete` -> `Blocked` -> `N/A`).
  - [x] Assign user as "Lead" (`assignee_id`).
  - [x] **Horizontal Dependencies**: Map dependencies between tasks that restrict out-of-sequence completion.
  - [ ] **Milestone Automation**: Auto-update a milestone's completeness status when all child tasks are marked complete.
- [ ] **Date Engine (Cascading Dates)**: 
  - [x] Drag-and-drop boundary recalculations based on inheritance bounds.
  - [ ] Recalculate and assign relative due dates to all incomplete tasks when root project start/completion dates are changed.
  - [ ] Automatically bubble up earliest start dates and latest due dates to parent milestones/phases.
  - [ ] Nightly CRON job to automatically transition task statuses ('Not Yet Due' -> 'Current' -> 'Due Soon' -> 'Overdue').
- [ ] **Task Detail Enhancements**: Show related tasks in the same milestone, and add an action to email task details/content to users with saved address memory.
- [ ] **Collaboration Suite**: Threaded comments on tasks, activity/audit logs, and real-time presence (cursors).
- [ ] **Automation Engine**: Recurring tasks ("Every Monday", "First of Month").

### 3.4 Resources Domain
- [x] **Task Integration**: Add/remove external links, PDFs, and text resources directly to the task pane.
- [/] **Resource Library**: Centralized view to search and filter project resources.

### 3.5 Master Library & Templates
- [x] **Template Management**: Create, edit, and delete templates.
- [x] **Library Integration**: Search and copy tasks from the Master Library when adding to a template or active project.
  - [ ] Intelligently hide library tasks already in the instance, and show topically related tasks.
- [x] **Promotion**: Promote an instance task back to the Master Library.
- [ ] **Template Publishing**: Ability to mark a template as "Published/Unpublished" to control visibility.

### 3.6 Dashboard, Views & Reporting
- [x] **Metrics Overview**: View counts for current tasks, due soon, overdue.
- [x] **Status Breakdown**: View metrics for complete, in progress, and blocked tasks.
- [x] **Portfolio Tracking**: Number of active projects.
- [ ] **Progress Visualization**: Project progress donut chart visible across task list views.
- [ ] **Project Status Report**: Report interface featuring reporting month selection, donut charts, and lists of completed, overdue, and upcoming milestones. 
- [ ] **Task List Views & Filters**: Dedicated UI tables/pages to view tasks isolated by Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All Tasks, Milestones, and My Tasks. Include chronological/alphabetical sorting.
- [ ] **Supervisor Reports**: Add a "supervisor" field during project setup and automatically dispatch Status Reports on the 2nd of each month.
- [ ] **Gantt Chart**: Timeline view based on `start_date` and `due_date` showing Phases and Milestones.

### 3.7 Platform Admin, Monetization & Ecosystem
- [ ] **White Labeling**: Support for partner organizations to use custom URLs, logos, and branding, including white-label administrator controls.
- [ ] **Store & Monetization**: Integration with Stripe for store functionality.
- [ ] **User License Management**: License restrictions for project creation volume, management, and discount codes.
- [ ] **Advanced Admin Management**: Dedicated Admin UI with global search, advanced user filtering (by last login, task completion), and analytics dashboard.
- [ ] **Push & Email Notifications**: Automated alerts for weekly priority tasks, overdue tasks, and task comments.
- [ ] **External Integrations**: Zoho CRM and Zoho Analytics sync, AWS unmanaged file uploads, ICS feeds for calendar integration.

### 3.8 Technical Hardening & Infrastructure
- [/] **Build Stabilization (Wave 16)**: Eliminating `tsc` errors, dead code, and standardizing Supabase `| null` types to clear Vercel deployment blockers.
- [ ] **Mobile Infrastructure**: PWA Support (Installable on iOS/Android) and Local-first offline mode (RxDB/WatermelonDB sync).

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

For a deep dive into the system architecture and core business rules, please refer to the domain-separated Single Source of Truth:
- **`docs/architecture/`**: Contains the modular, definitive architecture documentation (Auth, Date Engine, Tasks, etc.).
- **[repo-context.yaml](repo-context.yaml)**: Machine-readable dependency graph.
*(Note: Old monolithic architecture files like `FULL_ARCHITECTURE.md` are deprecated).*