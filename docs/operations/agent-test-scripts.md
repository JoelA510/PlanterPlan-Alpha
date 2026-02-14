# Agentic E2E Verification Scripts

This document contains structured test scripts for the AI Browser Agent to execute manually. Use these scripts when automated execution is blocked or to verify visual regressions.

## 🧪 1. Golden Path: Project Creation (Scratch)
**Spec Reference**: `e2e/journeys/golden-paths.spec.ts`

### Setup
1.  Navigate to `/dashboard`.
2.  Ensure you are logged in (or use `planterplan.test@gmail.com` / `roots99`).

### Steps
1.  **Action**: Click the "New Project" button (top right or empty state).
2.  **Verify**: "Choose a Template" modal appears.
3.  **Action**: Scroll/Find and click "Start from scratch".
4.  **Verify**: Header changes to "Project Details".
5.  **Action**: Enter Project Name: "Agent Test [Timestamp]".
6.  **Action**: Select a Launch Date (today or future).
7.  **Action**: Click "Create Project".
8.  **Verify**: 
    *   URL changes to `/project/[id]`.
    *   Sidebar shows the new project name.
    *   Board view is visible.

---

## 🧪 2. Task Management Journey
**Spec Reference**: `e2e/journeys/task-management.spec.ts`

### Setup
1.  Navigate to a Project Board (create one if needed).

### Steps
1.  **Action**: Click "Add Task" in the first column (e.g., "To Do" or "Milestone").
2.  **Action**: Enter Title: "Agent Verification Task".
3.  **Action**: Click "Add Task" (confirm button).
4.  **Verify**: The task card appears in the column.
5.  **Action**: Drag the task card to the "In Progress" column (or use the status dropdown if drag fails).
6.  **Verify**: Task status/column matches the new position.

---

## 🧪 3. Team Collaboration Journey
**Spec Reference**: `e2e/journeys/team-collaboration.spec.ts`

### Setup
1.  Navigate to Project Settings (`/project/[id]/settings`).

### Steps
1.  **Action**: Verify "Team Members" section is visible.
2.  **Action**: Click "Invite Member".
3.  **Action**: Enter Email: `tim.planterplan@gmail.com`.
4.  **Action**: Select Role: "Editor".
5.  **Action**: Click "Send Invite".
6.  **Verify**: Toast notification "Invitation sent" (or similar success message).
7.  **Verify**: New member appears in the list with "Pending" status.

---

## 🧪 4. Layout & Theme Verification
**Spec Reference**: `e2e/journeys/ui-interactions.spec.ts`

### Steps
1.  **Action**: Toggle the Theme Switcher (Sun/Moon icon).
2.  **Verify**: Background color changes (Dark: Slate-900 / Light: Slate-50).
3.  **Verify**: Text contrast remains readable in both modes.
4.  **Action**: Collapse/Expand the Sidebar (if applicable).
5.  **Verify**: Layout adjusts responsively.
