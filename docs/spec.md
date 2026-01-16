# PlanterPlan System Specification
**Version:** 0.1.0-alpha

## 1. Overview
PlanterPlan is a project management tool for church planters.

## 2. Core Features

### 2.1 Task Management
The core entity is the Task, which supports hierarchical nesting (Project -> Phase -> Milestone -> Task).

### 2.2 Kanban Board View
A column-based view for managing task status (`todo`, `in_progress`, `blocked`, `completed`).
- **Drag & Drop**: Moving tasks between columns updates status. Reordering within columns updates `position`.
- **Hierarchy Awareness**: Cards display breadcrumbs (e.g., "Phase > Milestone") to retain context in the flat board view.
- **Swimlanes**: Not currently implemented (Vertical columns only).

## 3. Data Model
- **Projects**: Top-level containers.
- **Tasks**: Recursive structure.
- **Users**: Roles include Owner, Editor, Viewer, Coach, Limited.

