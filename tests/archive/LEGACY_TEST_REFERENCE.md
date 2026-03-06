# Legacy Test Reference (Archived 03052026)

This document preserves the core testing scenarios and institutional knowledge from the legacy Playwright and Vitest test suites. These tests have been removed to eliminate code-heavy dependencies and technical debt, but their business logic remains relevant for future manual or agentic verification.

## Core Test Scenarios

### 1. Authentication & Security
- **Auth Flow**: Verifies successful login, logout, and redirection logic.
- **Project Isolation**: Ensures that tasks and data from one project do not leak into another, even for the same user.
- **REST API Security**: Confirms that anonymous users cannot access internal task data via direct API calls.

### 2. User Roles & Permissions
- **Owner**: Full CRUD access to projects, tasks, and team members.
- **Editor**: Can perform Task CRUD and invite members, but cannot delete the project or access certain settings.
- **Viewer**: Read-only access across the project; cannot create, edit, or delete items.

### 3. Project Management
- **Creation**: Starting a new project from scratch, from a predefined template, or by copying from the Master Library.
- **Modification**: Editing project metadata (title, description, dates).
- **Deletion**: Archiving or deleting a project and its associated tasks.
- **Team Collaboration**: Inviting new users to a project and managing their roles.

### 4. Task Management
- **Task CRUD**: Creating, editing, and deleting tasks within a project hierarchy.
- **Status Workflow**: Moving tasks through various status states (e.g., Incomplete to Complete).
- **Task Ordering**: Reordering tasks using the drag-and-drop position system.
- **Hierarchy**: Creating sub-tasks and ensuring the parent-child relationship is maintained.

### 5. UI & UX Integrity
- **Dashboard Navigation**: Sidebar links and dashboard summaries render correctly.
- **Form Interactions**: Modal behavior for adding/editing projects and tasks.
- **Theme Stability**: Basic verification that core UI elements respect the designated layout (Light Mode).

## Legacy Infrastructure Notes
- **Playwright**: Used for E2E "Golden Path" flows and journey testing.
- **Vitest**: Handled lower-level component testing and utility logic.
- **Supabase Mocking**: Tests relied on seeded data and direct database interaction for isolation.

## Recommended Verification Strategy (Agentic)
Future verification should focus on these "Golden Paths" using the `browser_subagent` or manual QA, specifically targeting the project creation and task hierarchy flows.
