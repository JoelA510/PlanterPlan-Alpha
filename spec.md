# PlanterPlan — Project Specification

> **Version**: 1.7.0 (Wave 21 — Supervisor Reports & Recurring Tasks) 
> **Last Updated**: 2026-04-16 
> **Status**: Active Development

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
- [x] **Account Management**: Password change and profile data update (name, avatar URL, role, organization, email preferences). Security tab added to Settings page. Registration CORS/case-sensitivity hardening deferred.
- [ ] **Localization**: Complete Foreign Language UI mapping.

### 3.2 Projects Domain
- [x] **Creation & Deletion**: Create project from Master Template (deep clone RPC), delete project.
- [x] **Team Management**:
  - [x] Invite a member via email with a specific role (Driven by Supabase Edge Functions).
  - [x] Remove a member.
  - [x] Change member role permissions.
- [x] **Project Settings**: Edit due date and due soon thresholds. *(Note: The `Location` field is officially deprecated and has been stripped from the UI.)*
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
  - [x] **Kanban Board V2**: Native column-to-column drag-and-drop with strict type safety (shipped; see `src/features/tasks/components/board/`).
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
  - [x] **Milestone Automation**: When all child tasks of a milestone/phase are marked complete, the parent is auto-completed (`is_complete` + `status`) recursively up the hierarchy. Driven by `updateStatus` bubble-up logic in `planterClient.ts`.
- [x] **Date Engine (Cascading Dates)**: 
  - [x] Drag-and-drop boundary recalculations based on inheritance bounds.
  - [x] Recalculate and assign relative due dates to all incomplete tasks when root project start/completion dates are changed.
  - [x] Automatically bubble up earliest start dates and latest due dates to parent milestones/phases (wired into task create, edit, and delete via `updateParentDates`).
  - [x] **Nightly CRON job** to automatically transition task statuses ('Not Yet Due' -> 'Current' -> 'Due Soon' -> 'Overdue'). Shipped via `supabase/functions/nightly-sync/` (per-project `settings.due_soon_threshold`).
- [ ] **Task Detail Enhancements**: Show related tasks in the same milestone, and add an action to email task details/content to users with saved address memory.
- [ ] **Collaboration Suite**: Threaded comments on tasks, activity/audit logs, and real-time presence (cursors).
- [x] **Automation Engine — Recurring Tasks**: Template tasks carry a weekly or monthly rule under `settings.recurrence`; `supabase/functions/nightly-sync/` clones matching templates into the configured target project (deep-clone via `clone_project_template`, idempotent via `settings.spawnedFromTemplate` + `spawnedOn`). Picker shipped in `src/features/tasks/components/RecurrencePicker.tsx`.

### 3.4 Resources Domain
- [x] **Task Integration**: Add/remove external links, PDFs, and text resources directly to the task pane.
- [x] **Resource Library**: Centralized view to search and filter project resources.

### 3.5 Master Library & Templates
- [x] **Template Management**: Create, edit, and delete templates.
- [x] **Library Integration**: Search and copy tasks from the Master Library when adding to a template or active project.
  - [ ] Intelligently hide library tasks already in the instance, and show topically related tasks.
- [x] **Promotion**: Promote an instance task back to the Master Library.
- [x] **Template Publishing**: Ability to mark a template as "Published/Unpublished" to control visibility.

### 3.6 Dashboard, Views & Reporting
- [x] **Metrics Overview**: View counts for current tasks, due soon, overdue.
- [x] **Status Breakdown**: View metrics for complete, in progress, and blocked tasks.
- [x] **Portfolio Tracking**: Number of active projects.
- [x] **Progress Visualization**: Project progress donut chart visible across task list views.
- [x] **Project Status Report**: Report interface featuring reporting month selection, donut charts, and lists of completed, overdue, and upcoming milestones. Shipped via `src/pages/Reports.tsx` + `src/features/projects/hooks/useProjectReports.ts`.
- [x] **Task List Views & Filters**: Dedicated UI tables/pages to view tasks isolated by Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All Tasks, Milestones, and My Tasks. Include chronological/alphabetical sorting. Shipped via `src/pages/TasksPage.tsx` + `src/features/tasks/hooks/useTaskFilters.ts`.
- [x] **Supervisor Reports**: Project settings accept a `supervisor_email` (stored on the root task). The `supabase/functions/supervisor-report/` edge function builds a monthly Project Status Report payload for every project that has one set. **Currently log-only** — email dispatch is gated behind `EMAIL_PROVIDER_API_KEY` and tracked in §6 Backlog (Wave 22).
- [ ] **Gantt Chart**: Timeline view based on `start_date` and `due_date` showing Phases and Milestones.

### 3.7 Platform Admin, Monetization & Ecosystem
- [ ] **White Labeling**: Support for partner organizations to use custom URLs, logos, and branding, including white-label administrator controls.
- [ ] **Store & Monetization**: Integration with Stripe for store functionality.
- [ ] **User License Management**: License restrictions for project creation volume, management, and discount codes.
- [ ] **Advanced Admin Management**: Dedicated Admin UI with global search, advanced user filtering (by last login, task completion), and analytics dashboard.
- [ ] **Push & Email Notifications**: Automated alerts for weekly priority tasks, overdue tasks, and task comments.
- [ ] **External Integrations**: Zoho CRM and Zoho Analytics sync, AWS unmanaged file uploads, ICS feeds for calendar integration.

### 3.8 Technical Hardening & Infrastructure
- [x] **Build Stabilization (Wave 16)**: Eliminated all 131 ESLint errors (`no-explicit-any`, `no-unused-vars`, Playwright false positives, etc.) and resolved TypeScript build errors across 42 files. `npm run build`, `npm run lint`, and all 385 unit tests pass cleanly. Vercel deployment blocker resolved.
- [x] **TS 5.9 / @types/node fix (Wave 18)**: Removed deprecated `baseUrl` from `tsconfig.app.json` (TypeScript bundler mode resolves `paths` without it); installed `@types/node` required by `tsconfig.node.json`. Build: 0 errors, 385/385 tests pass.
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

---

## 6. Backlog (Deferred)

Items originally documented "for later" and items carved out of recent waves for scope control.

- [ ] **Wire SMTP/Resend provider for supervisor reports** — Wave 21 ships the `supabase/functions/supervisor-report/` edge function in a log-only state (pg_cron wiring + payload shape verifiable end-to-end without a provider). Follow-up wave must wire the actual dispatch (gated today behind `EMAIL_PROVIDER_API_KEY`). See the `TODO(wave-22)` marker in `supabase/functions/supervisor-report/index.ts`.