# PlanterPlan — Project Specification

> **Version**: 1.1.0 (Hardened)
> **Last Updated**: 2026-02-20
> **Status**: Active Development

---

## 1. Executive Summary

**PlanterPlan** is a specialized project management tool designed for **Church Planters**. Unlike generic tools (Asana, Trello), PlanterPlan is built around the specific lifecycle of planting a church, using a library of "Master Templates" that can be deep-cloned into active "Project Instances".

It solves the problem of "what do I do next?" by providing curated, phase-based roadmaps (Discovery -> Launch -> Growth) that guide the user through the complexity of starting a new organization.

---

## 2. User Personas

### 2.1 The Church Planter (Core User)
- **Goal**: Launch a healthy church without getting overwhelmed by logistics.
- **Pain Points**: Doesn't know the steps; overwhelmed by generic tools; needs a "playbook".
- **Key Features Used**: Dashboard (progress tracking), Task Tree (executing steps), People CRM (managing launch team).

### 2.2 The Coach / Overseer (Admin/Viewer)
- **Goal**: Monitor the progress of multiple planters.
- **Pain Points**: Lack of visibility into where planters are stuck.
- **Key Features Used**: "View As" mode, Project Reports, Dashboard Pipeline View.

---

## 3. Functional Requirements (Roadmap & Status)

> **Status Key**
> - [x] **Complete**: Implemented, tested, and merged.
> - [/] **In Progress**: Active development or partial implementation.
> - [ ] **Pending**: Planned but not started.
> - [-] **Skipped/Deferred**: Removed from scope or postponed.

### 3.1 Core Architecture (Phase 0)
- [x] **Project Scaffolding**
    - [x] Vite + React + TypeScript setup
    - [x] Tailwind CSS v4 configuration
    - [x] Barrel file structure (`features/`, `shared/`)
- [x] **Authentication** (Supabase GoTrue)
    - [x] Login / Signup Pages
    - [x] AuthContext with Session Persistence
    - [x] Protected Routes Wrapper
    - [x] RBAC Hooks (`useUserRole`, `canEdit`)
- [x] **Database & API**
    - [x] Supabase Client (`planterClient`)
    - [x] Type Generation (`database.types.ts`)
    - [x] RLS Policies (Row Level Security)
    - [x] React Query Integration
    - [x] Optimistic Updates

### 3.2 Tasks Domain (Phase 1 & 2)
- [x] **Task Visualization**
    - [x] Hierarchical Tree View
    - [x] Collapsible Rows
    - [x] Indentation Guide Lines
- [x] **Task Management**
    - [x] Create Task (and Subtasks)
    - [x] Update Task (Title, Status, Description)
    - [x] Delete Task (with Confirmation)
    - [x] Task Details Side Panel
- [x] **Drag & Drop**
    - [x] Reorder Tasks (Same Level)
    - [x] Reparenting (Drag into other task)
    - [x] **Cycle Detection Algorithm** (Prevents circular dependencies)
    - [x] Optimistic UI Updates

### 3.3 Projects Domain (Phase 3)
- [x] **Project Management**
    - [x] Create Project from Scratch
    - [x] Create Project from Template
    - [x] Project List View (Dashboard)
    - [x] Project Settings
- [x] **Team & Access**
    - [x] Invite Members (RPC `invite_user_to_project`)
    - [x] Manage Roles (Owner, Editor, Viewer)
    - [x] Member List Display

### 3.4 UI/UX Polish (Phase 4)
- [x] **Design System**
    - [x] Sidebar Navigation
    - [x] Header & Breadcrumbs
    - [x] Toast Notifications
    - [x] Responsive Layouts
- [x] **Reliability**
    - [x] Error Boundaries
    - [x] Loading Skeletons
    - [x] Form Validation (Zod)

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Tree Rendering**: Support for 500+ tasks without UI lag via O(1) lookup maps and memoized trees.
- **Network**: All data fetching uses `stale-while-revalidate` (React Query) with granular cache invalidation.
- **Bundle Size**: Initial load < 200KB (gzip).

### 4.2 Security
- **Authentication**: JWT-based via Supabase Auth.
- **Authorization**: Row-Level Security (RLS) enforced on ALL database tables.
- **Role-Based Access**: 5 distinct roles (Owner, Editor, Coach, Viewer, Limited).

### 4.3 Data Integrity
- **Cycle Detection**: Drag-and-drop MUST prevent circular parent-child relationships.
- **Deep Cloning**: Template instantiation must copy the *entire* tree structure atomically.

---

## 5. Technical Architecture

For a deep dive into the system architecture, please refer to:
- **[FULL_ARCHITECTURE.md](docs/FULL_ARCHITECTURE.md)**: Comprehensive technical reference.
- **[repo-context.yaml](repo-context.yaml)**: Machine-readable dependency graph.

---

## 6. Future Roadmap (Backlog)

### 6.1 Advanced Views
- [ ] **Kanban Board**: Drag-and-drop tasks between status columns.
- [ ] **Gantt Chart**: Timeline view based on `start_date` and `due_date`.

### 6.2 Collaboration
- [ ] **Comments**: Threaded discussions on tasks.
- [ ] **Activity Log**: Audit trail of changes.
- [ ] **Real-time Cursors**: See who is viewing a task.

### 6.3 Automation
- [ ] **Recurring Tasks**: "Every Monday", "First of Month".
- [ ] **Automated Status Updates**: "If all subtasks complete, mark parent complete."

### 6.4 Mobile
- [ ] **PWA Support**: Installable on iOS/Android.
- [ ] **Offline Mode**: Local-first sync engine (RxDB or similar).
