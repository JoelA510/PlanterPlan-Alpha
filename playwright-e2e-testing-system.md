# PlanterPlan — Playwright E2E Testing System

> **Last Updated**: 2026-02-11  
> **Status**: Comprehensive Test Plan  
> **Framework**: Playwright 1.58  
> **Organization**: User Journey Based

---

## Table of Contents

1. [Test Overview](#test-overview)
2. [Test Accounts & Configuration](#test-accounts--configuration)
3. [Test Environment Setup](#test-environment-setup)
4. [Active Test Suites (User Journeys)](#active-test-suites-user-journeys)
   - [1. Authentication Journey](#1-authentication-journey)
   - [2. Template to Project Instantiation Journey](#2-template-to-project-instantiation-journey)
   - [3. Task Management Journey](#3-task-management-journey)
   - [4. Team Collaboration Journey](#4-team-collaboration-journey)
   - [5. Role-Based Permissions Journey](#5-role-based-permissions-journey)
   - [6. Drag & Drop Journey](#6-drag--drop-journey)
   - [7. Master Library Journey](#7-master-library-journey)
   - [8. Dashboard & Metrics Journey](#8-dashboard--metrics-journey)
   - [9. Project Management Journey](#9-project-management-journey)
   - [10. UI Interaction Journey](#10-ui-interaction-journey)
5. [Future Test Suites](#future-test-suites)
6. [Test Infrastructure](#test-infrastructure)
7. [Test Execution & CI/CD](#test-execution--cicd)

---

## Test Overview

### Purpose
This document outlines the complete end-to-end testing strategy for PlanterPlan using Playwright. All tests are organized by **user journeys** to reflect real-world workflows.

### Scope
- **Framework**: Playwright (E2E browser testing only)
- **Coverage**: All 5 user roles (Owner, Editor, Viewer, Coach, Limited)
- **Approach**: User journey-based test organization
- **Test Data**: Existing test accounts (no dynamic user creation)

### Test File Organization

```
e2e/
├── journeys/
│   ├── auth.spec.ts                    # Authentication Journey
│   ├── template-to-project.spec.ts     # Template Instantiation Journey
│   ├── task-management.spec.ts         # Task CRUD Journey
│   ├── team-collaboration.spec.ts      # Team Management Journey
│   ├── role-permissions.spec.ts        # Permission Boundaries Journey
│   ├── drag-drop.spec.ts               # Drag & Drop Journey
│   ├── master-library.spec.ts          # Library Search & Copy Journey
│   ├── dashboard.spec.ts               # Dashboard & Metrics Journey
│   ├── project-management.spec.ts      # Project Settings & Deletion Journey
│   └── ui-interactions.spec.ts         # Expand/Collapse Journey
├── fixtures/
│   ├── test-users.ts                   # Test account credentials
│   └── test-helpers.ts                 # Reusable test utilities
└── playwright.config.ts                # Playwright configuration
```

---

## Test Accounts & Configuration

### Test User Accounts

| Role | Email | Password | Project | Notes |
|------|-------|----------|---------|-------|
| **Project Owner** | planterplan.test@gmail.com | roots99 | "Project to test invitation by email" | Full permissions |
| **Limited User (Viewer)** | planterplan.role_tester@mail.com | roots99_role | Invited to test project | View-only access |
| **Full User (Editor)** | tim.planterplan@gmail.com | roots99(E | Invited to test project | Can view & edit all tasks |

### Role Definitions

| Role | View Tasks | Edit Tasks | Add/Delete Tasks | Manage Members | Edit Project | Delete Project |
|------|------------|------------|------------------|----------------|--------------|----------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ✅ (invite only) | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Coach** | ✅ | ✅ (coaching tasks only) | ❌ | ❌ | ❌ | ❌ |
| **Limited** | ✅ | ✅ (assigned tasks only) | ❌ | ❌ | ❌ | ❌ |

### Environment Configuration

```typescript
// playwright.config.ts
export default {
  testDir: './e2e/journeys',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}
```

---

## Test Environment Setup

### Prerequisites
- [ ] Local development server running at `localhost:3000`
- [ ] Supabase instance accessible and seeded with test data
- [ ] Test accounts created and verified in auth table
- [ ] Test project "Project to test invitation by email" exists
- [ ] Example Template exists in Master Library

### Global Test Setup

```typescript
// e2e/fixtures/test-users.ts
export const TEST_USERS = {
  OWNER: {
    email: 'planterplan.test@gmail.com',
    password: 'roots99',
    role: 'owner',
  },
  EDITOR: {
    email: 'tim.planterplan@gmail.com',
    password: 'roots99(E',
    role: 'editor',
  },
  VIEWER: {
    email: 'planterplan.role_tester@mail.com',
    password: 'roots99_role',
    role: 'viewer',
  },
};
```

---

## Active Test Suites (User Journeys)

---

## 1. Authentication Journey

**File**: `e2e/journeys/auth.spec.ts`  
**Purpose**: Test user account creation, login, logout, and session management  
**Roles Tested**: All users (pre-authentication)

### Test Suite: Account Creation / Signup

- [ ] **Test: User can navigate to signup page**
  1. Navigate to home page `/`
  2. Click on "Sign Up" or "Create Account" link
     - **Expected Result**: Signup form appears with email and password fields

- [ ] **Test: User can input valid credentials for account creation**
  1. Navigate to signup page
  2. Input email address in email field
  3. Input password in password field (meeting requirements)
     - **Expected Result**: Both fields accept input without validation errors

- [ ] **Test: Submit button triggers Supabase auth record creation**
  1. Fill in email: `test.user@example.com`
  2. Fill in password: `SecurePass123`
  3. Click "Sign Up" or "Create Account" button
     - **Expected Result**: Submit button is clickable and triggers submission
     - **Expected Result**: Supabase creates record in auth table (verify via test query)

- [ ] **Test: Confirmation message appears after signup**
  1. Complete signup flow
  2. Observe page after submission
     - **Expected Result**: Confirmation page or message appears telling user to check email for confirmation
     - **Expected Result**: Message includes the email address used

- [ ] **Test: User redirects to login after confirmation**
  1. Complete signup and see confirmation message
  2. Click "Go to Login" or wait for auto-redirect
     - **Expected Result**: User is redirected to login page

### Test Suite: Login

- [ ] **Test: User can navigate to login page**
  1. Navigate to home page `/`
  2. Click on "Login" or "Sign In" link
     - **Expected Result**: Login form appears

- [ ] **Test: Owner can login with valid credentials**
  1. Navigate to login page
  2. Input email: `planterplan.test@gmail.com`
  3. Input password: `roots99`
  4. Click "Login" button
     - **Expected Result**: User is authenticated
     - **Expected Result**: Redirects to dashboard `/dashboard`
     - **Expected Result**: User's projects are visible

- [ ] **Test: Editor can login with valid credentials**
  1. Navigate to login page
  2. Input email: `tim.planterplan@gmail.com`
  3. Input password: `roots99(E`
  4. Click "Login" button
     - **Expected Result**: User is authenticated
     - **Expected Result**: Redirects to dashboard `/dashboard`

- [ ] **Test: Viewer can login with valid credentials**
  1. Navigate to login page
  2. Input email: `planterplan.role_tester@mail.com`
  3. Input password: `roots99_role`
  4. Click "Login" button
     - **Expected Result**: User is authenticated
     - **Expected Result**: Redirects to dashboard `/dashboard`

- [ ] **Test: Login fails with invalid credentials**
  1. Navigate to login page
  2. Input email: `invalid@example.com`
  3. Input password: `wrongpassword`
  4. Click "Login" button
     - **Expected Result**: Error message appears
     - **Expected Result**: User remains on login page
     - **Expected Result**: No redirect occurs

- [ ] **Test: Session persistence after page reload**
  1. Login as any user
  2. Reload the page (F5 or browser refresh)
     - **Expected Result**: User remains logged in
     - **Expected Result**: Dashboard still displays user's data

### Test Suite: Logout

- [ ] **Test: User can logout successfully**
  1. Login as Owner
  2. Navigate to user menu or settings
  3. Click "Logout" button
     - **Expected Result**: User session is terminated
     - **Expected Result**: Redirects to home page `/` or login page
     - **Expected Result**: Attempting to access `/dashboard` redirects to login

- [ ] **Test: Logout clears session data**
  1. Login as Owner
  2. Logout
  3. Try to access protected route `/dashboard` directly via URL
     - **Expected Result**: Redirects to login page
     - **Expected Result**: No user data is visible

---

## 2. Template to Project Instantiation Journey

**File**: `e2e/journeys/template-to-project.spec.ts`  
**Purpose**: Test the core workflow of cloning a template into a live project  
**Roles Tested**: Owner (project creation), Editor, Viewer, Coach, Limited (project viewing)

### Test Suite: Project Creation from Template (First Project)

- [ ] **Test: Owner can initiate project creation**
  1. Login as Owner: `planterplan.test@gmail.com`
  2. Navigate to dashboard
  3. Click on "+ New Project" button
     - **Expected Result**: Right side panel appears
     - **Expected Result**: New project form is displayed

- [ ] **Test: Template selection list displays available templates**
  1. Login as Owner
  2. Click "+ New Project"
  3. Observe template selection area in form
     - **Expected Result**: List of templates is displayed
     - **Expected Result**: "Example Template" is visible in the list

- [ ] **Test: Selecting a template populates form fields**
  1. Login as Owner
  2. Click "+ New Project"
  3. Click on "Example Template" from the list
     - **Expected Result**: Form fields are populated with template information (name, description, etc.)
     - **Expected Result**: Template's task structure is referenced

- [ ] **Test: User can edit populated template information**
  1. Login as Owner
  2. Click "+ New Project"
  3. Select "Example Template"
  4. Edit the project name field to "My Church Plant Project"
  5. Select a start date from date picker
     - **Expected Result**: All fields are editable
     - **Expected Result**: Changes are retained in form

- [ ] **Test: Create Project button creates new project instance**
  1. Login as Owner
  2. Click "+ New Project"
  3. Select "Example Template"
  4. Edit project name to "Test Project Instance"
  5. Select a date
  6. Click "Create Project" button
     - **Expected Result**: Form shows success message
     - **Expected Result**: New project appears in "Your Projects" section on dashboard
     - **Expected Result**: Project contains the same tasks as Example Template
     - **Expected Result**: Tasks are in the same order as the template

- [ ] **Test: Newly created project is navigable**
  1. Create a project from template (follow previous test)
  2. Click on the newly created project from dashboard
     - **Expected Result**: Navigates to project detail view
     - **Expected Result**: Project tasks are displayed
     - **Expected Result**: Project name matches what was entered

### Test Suite: Project Creation from Scratch (Without Template)

- [ ] **Test: Owner can create project without selecting a template**
  1. Login as Owner
  2. Click "+ New Project"
  3. Do not select any template
  4. Fill in project name: "Custom Project from Scratch"
  5. Fill in other required fields
  6. Click "Create Project"
     - **Expected Result**: Project is created successfully
     - **Expected Result**: New project appears in "Your Projects"
     - **Expected Result**: Project has no tasks initially (or default root task only)

### Test Suite: Multiple Users Viewing Created Projects

- [ ] **Test: Owner can see created projects in "Your Projects"**
  1. Login as Owner
  2. Navigate to dashboard
     - **Expected Result**: "Your Projects" section displays all projects owned by user

- [ ] **Test: Editor can see invited projects in "Joined Projects"**
  1. Login as Editor: `tim.planterplan@gmail.com`
  2. Navigate to dashboard
     - **Expected Result**: "Joined Projects" section is visible
     - **Expected Result**: Projects where user is invited as Editor appear

- [ ] **Test: Editor can view tasks in joined project**
  1. Login as Editor
  2. Click on a project from "Joined Projects"
     - **Expected Result**: Navigates to project view
     - **Expected Result**: All tasks in the project are visible

- [ ] **Test: Viewer can see invited projects in "Joined Projects"**
  1. Login as Viewer: `planterplan.role_tester@mail.com`
  2. Navigate to dashboard
     - **Expected Result**: "Joined Projects" section displays projects where user is a viewer

- [ ] **Test: Viewer can view tasks in joined project**
  1. Login as Viewer
  2. Click on a project from "Joined Projects"
     - **Expected Result**: Navigates to project view
     - **Expected Result**: All tasks are visible (read-only)

- [ ] **Test: Coach can see and view tasks in assigned projects**
  1. Login as Coach (if test account exists)
  2. Navigate to dashboard and click on joined project
     - **Expected Result**: All tasks are visible
     - **Expected Result**: Coaching-specific tasks are identifiable

- [ ] **Test: Limited user can see and view tasks in assigned projects**
  1. Login as Limited user (or use Viewer account)
  2. Navigate to dashboard and click on joined project
     - **Expected Result**: All tasks are visible
     - **Expected Result**: Only assigned tasks are editable (tested in permissions journey)

---

## 3. Task Management Journey

**File**: `e2e/journeys/task-management.spec.ts`  
**Purpose**: Test CRUD operations for tasks across all user roles  
**Roles Tested**: Owner, Editor, Viewer, Coach, Limited

### Test Suite: Add Task (Owner)

- [ ] **Test: Owner can add custom child task**
  1. Login as Owner: `planterplan.test@gmail.com`
  2. Navigate to a project
  3. Select a parent task (click on it)
     - **Expected Result**: Parent task info appears in right side panel
  4. Click "Add Child Task" button in right panel
     - **Expected Result**: Parent task title remains at top of panel
     - **Expected Result**: New task form appears underneath
  5. Fill in task fields:
     - Title: "New Custom Task"
     - Purpose: "Test custom task creation"
     - Description: "This is a test task"
  6. Click "Add Task" button
     - **Expected Result**: New task appears under the selected parent task
     - **Expected Result**: Task displays the information inputted in the form

- [ ] **Test: Owner can add task using Master Library search**
  1. Login as Owner
  2. Navigate to a project
  3. Select a parent task
  4. Click "Add Child Task"
  5. Use the Master Library search bar
  6. Search for a task keyword (e.g., "planning")
     - **Expected Result**: Search results appear showing matching tasks from Master Library
  7. Select a task from search results
     - **Expected Result**: Task form is populated with information from selected library task
  8. Edit form as needed
  9. Click "Add Task"
     - **Expected Result**: New task is created under parent task
     - **Expected Result**: Task appears in the correct position based on date/order
     - **Expected Result**: Task contains information from library task plus any edits

### Test Suite: Add Task (Editor)

- [ ] **Test: Editor can add custom child task**
  1. Login as Editor: `tim.planterplan@gmail.com`
  2. Navigate to a project (joined project)
  3. Select a parent task
  4. Click "Add Child Task"
  5. Fill in form with custom task information
  6. Click "Add Task"
     - **Expected Result**: Task is created successfully under parent task

- [ ] **Test: Editor can add task from Master Library**
  1. Login as Editor
  2. Navigate to project
  3. Select parent task, click "Add Child Task"
  4. Search Master Library
  5. Select a library task, edit as needed
  6. Click "Add Task"
     - **Expected Result**: Task is created successfully

### Test Suite: Add Task (Permission Denied Cases)

- [ ] **Test: Viewer cannot add tasks**
  1. Login as Viewer: `planterplan.role_tester@mail.com`
  2. Navigate to a joined project
  3. Select a task
     - **Expected Result**: "Add Child Task" button is not visible OR disabled
     - **Expected Result**: Attempting to add task shows permission denied message

- [ ] **Test: Limited user cannot add tasks**
  1. Login as Limited user
  2. Navigate to project
  3. Attempt to add a task
     - **Expected Result**: Add task UI is not available
     - **Expected Result**: Permission denied if attempted

- [ ] **Test: Coach cannot add tasks**
  1. Login as Coach
  2. Navigate to project
  3. Attempt to add a task
     - **Expected Result**: Add task UI is not available
     - **Expected Result**: Permission denied if attempted

### Test Suite: Edit Task (Owner)

- [ ] **Test: Owner can edit task text fields (title, purpose, description)**
  1. Login as Owner
  2. Navigate to project
  3. Click on an existing task to open detail view
  4. Click "Edit" button or edit mode toggle
  5. Modify task title: "Updated Task Title"
  6. Modify purpose: "Updated purpose"
  7. Modify description: "Updated description text"
  8. Click "Save" or "Update Task"
     - **Expected Result**: Task updates successfully
     - **Expected Result**: Changes are reflected in task list view
     - **Expected Result**: Changes persist after page reload

- [ ] **Test: Owner can update task status**
  1. Login as Owner
  2. Navigate to project, select a task
  3. Change status dropdown from "To Do" to "In Progress"
     - **Expected Result**: Status updates immediately
     - **Expected Result**: Task appears in correct status group/filter
  4. Change status to "Complete"
     - **Expected Result**: Status updates to Complete
     - **Expected Result**: Task may visually change (e.g., strikethrough, moved to completed section)
  5. Test "Overdue" status (if automatically set)
     - **Expected Result**: Past-due tasks show "Overdue" status

- [ ] **Test: Owner can add notes to task**
  1. Login as Owner
  2. Navigate to project, select a task
  3. Find notes section in task detail
  4. Add a note: "This is a test note"
  5. Save note
     - **Expected Result**: Note appears in notes list
     - **Expected Result**: Note includes timestamp and author

- [ ] **Test: Owner can edit task list-formatted fields (actions, resources)**
  1. Login as Owner
  2. Navigate to project, select a task
  3. Edit actions field (if list format supported)
  4. Edit resources field (if list format supported)
  5. Save changes
     - **Expected Result**: List formatting is preserved
     - **Expected Result**: Changes are saved successfully

### Test Suite: Edit Task (Editor)

- [ ] **Test: Editor can edit any task text fields**
  1. Login as Editor
  2. Navigate to project, select any task
  3. Edit title, purpose, description
  4. Save changes
     - **Expected Result**: All edits save successfully

- [ ] **Test: Editor can update task status**
  1. Login as Editor
  2. Navigate to project, select a task
  3. Change status between To Do, In Progress, Complete, Overdue
     - **Expected Result**: Status updates successfully

- [ ] **Test: Editor can add notes to tasks**
  1. Login as Editor
  2. Navigate to project, select a task
  3. Add note to task
     - **Expected Result**: Note is added successfully

- [ ] **Test: Editor can edit task list fields (actions, resources)**
  1. Login as Editor
  2. Navigate to project, select a task
  3. Edit list-formatted fields
     - **Expected Result**: Changes save successfully

### Test Suite: Edit Task (Limited User)

- [ ] **Test: Limited user can edit assigned task**
  1. Login as Limited user
  2. Navigate to project
  3. Find a task assigned to this user
  4. Click on task to open details
  5. Edit task fields (title, status, notes, etc.)
  6. Save changes
     - **Expected Result**: Changes save successfully
     - **Expected Result**: All edit capabilities available for assigned task

- [ ] **Test: Limited user cannot edit non-assigned task**
  1. Login as Limited user
  2. Navigate to project
  3. Click on a task NOT assigned to this user
     - **Expected Result**: Task details are visible (read-only)
     - **Expected Result**: Edit button is disabled or not visible
     - **Expected Result**: Attempting to edit shows permission denied

### Test Suite: Edit Task (Coach)

- [ ] **Test: Coach can edit coaching tasks**
  1. Login as Coach
  2. Navigate to project
  3. Find a task marked as "coaching task"
  4. Click to open task details
  5. Edit task fields
  6. Save changes
     - **Expected Result**: Changes save successfully for coaching tasks

- [ ] **Test: Coach cannot edit non-coaching tasks**
  1. Login as Coach
  2. Navigate to project
  3. Click on a regular (non-coaching) task
     - **Expected Result**: Task is view-only
     - **Expected Result**: Edit controls are disabled or not visible

### Test Suite: Edit Task (Viewer - Permission Denied)

- [ ] **Test: Viewer cannot edit any task**
  1. Login as Viewer: `planterplan.role_tester@mail.com`
  2. Navigate to project
  3. Click on any task to view details
     - **Expected Result**: Task details are visible in read-only mode
     - **Expected Result**: No edit button or edit controls are available
     - **Expected Result**: Attempting to edit (if possible via URL manipulation) shows permission denied

### Test Suite: Delete Task (Owner & Editor)

- [ ] **Test: Owner can delete a task**
  1. Login as Owner
  2. Navigate to project
  3. Select a task (non-critical test task)
  4. Click "Delete" button or menu option
  5. Confirm deletion in confirmation dialog
     - **Expected Result**: Confirmation dialog appears
     - **Expected Result**: Task is removed from project after confirmation
     - **Expected Result**: Child tasks (if any) are handled appropriately (deleted or orphaned based on logic)

- [ ] **Test: Editor can delete a task**
  1. Login as Editor
  2. Navigate to project
  3. Select a task
  4. Delete the task
     - **Expected Result**: Task is deleted successfully

### Test Suite: Delete Task (Permission Denied)

- [ ] **Test: Viewer cannot delete tasks**
  1. Login as Viewer
  2. Navigate to project
  3. Select a task
     - **Expected Result**: Delete button is not visible or disabled
     - **Expected Result**: Attempting to delete via any method shows permission denied

- [ ] **Test: Limited user cannot delete tasks**
  1. Login as Limited user
  2. Navigate to project
  3. Select even an assigned task
     - **Expected Result**: Delete option is not available
     - **Expected Result**: Permission denied if attempted

- [ ] **Test: Coach cannot delete tasks**
  1. Login as Coach
  2. Navigate to project
  3. Attempt to delete any task (including coaching tasks)
     - **Expected Result**: Delete option is not available
     - **Expected Result**: Permission denied if attempted

---

## 4. Team Collaboration Journey

**File**: `e2e/journeys/team-collaboration.spec.ts`  
**Purpose**: Test team invitation, role assignment, and collaborative workflows  
**Roles Tested**: Owner (inviter), Editor, Viewer, Coach, Limited (invitees)

### Test Suite: Inviting Users to Project (Owner)

- [ ] **Test: Owner can open invite user form**
  1. Login as Owner: `planterplan.test@gmail.com`
  2. Navigate to dashboard
  3. Find project "Project to test invitation by email"
  4. Click on invite user button (person icon) on the project
     - **Expected Result**: Invite form appears on right side panel
     - **Expected Result**: Form title shows the project name
     - **Expected Result**: Form has dropdown for Role selection
     - **Expected Result**: Form has text input for user identification (UUID/email)

- [ ] **Test: Owner can select roles from dropdown**
  1. Login as Owner
  2. Open invite form for a project
  3. Click on Role dropdown
     - **Expected Result**: Dropdown opens with options:
       - "Viewer (Read-only)"
       - "Editor (read and write)"
       - "Coach"
     - **Expected Result**: All three role options are visible and selectable

- [ ] **Test: Owner can invite user with Viewer role**
  1. Login as Owner
  2. Open invite form
  3. Enter user identification: `planterplan.role_tester@mail.com` (or UUID)
  4. Select role: "Viewer (Read-only)"
  5. Click "Send Invite" button
     - **Expected Result**: Invite is sent successfully
     - **Expected Result**: Owner sees invitation status showing "Pending"
     - **Expected Result**: Selected role "Viewer" is displayed in invitation record

- [ ] **Test: Owner can invite user with Editor role**
  1. Login as Owner
  2. Open invite form
  3. Enter user identification for a different user
  4. Select role: "Editor (read and write)"
  5. Click "Send Invite"
     - **Expected Result**: Invite is sent successfully
     - **Expected Result**: Invitation shows "Editor" role

- [ ] **Test: Owner can invite user with Coach role**
  1. Login as Owner
  2. Open invite form
  3. Enter user identification
  4. Select role: "Coach"
  5. Click "Send Invite"
     - **Expected Result**: Invite is sent successfully
     - **Expected Result**: Invitation shows "Coach" role

- [ ] **Test: Owner can see invitation status and user responses**
  1. Login as Owner
  2. After sending invites (previous tests)
  3. Navigate to project team management or invitations list
     - **Expected Result**: All sent invitations are listed
     - **Expected Result**: Each invitation shows:
       - User identifier (email/UUID)
       - Selected role
       - Status (Pending, Accepted, Rejected)

### Test Suite: Receiving and Responding to Invitations (Invited Users)

- [ ] **Test: Invited user can see invitation in their account**
  1. Login as Viewer: `planterplan.role_tester@mail.com` (invited user)
  2. Navigate to dashboard or notifications area
     - **Expected Result**: Invitation notification or section is visible
     - **Expected Result**: Invitation shows:
       - Project name
       - Inviter name
       - Assigned role (Viewer)
       - Option to Accept or Reject

- [ ] **Test: User can accept project invitation**
  1. Login as invited user (Viewer)
  2. Find pending invitation
  3. Click "Accept" button
     - **Expected Result**: Invitation status changes to "Accepted"
     - **Expected Result**: Project appears in user's "Joined Projects" section
     - **Expected Result**: User can now navigate to the project

- [ ] **Test: User can reject project invitation**
  1. Setup: Owner invites a user to a project
  2. Login as invited user
  3. Find pending invitation
  4. Click "Reject" button
     - **Expected Result**: Invitation status changes to "Rejected"
     - **Expected Result**: Project does NOT appear in "Joined Projects"
     - **Expected Result**: User cannot access the project

- [ ] **Test: Owner sees accepted invitation reflected in team**
  1. User accepts invitation (previous test)
  2. Login as Owner
  3. Navigate to project team management
     - **Expected Result**: Invited user now appears in project team members list
     - **Expected Result**: User's role is correctly displayed

- [ ] **Test: Owner sees rejected invitation status**
  1. User rejects invitation (previous test)
  2. Login as Owner
  3. Navigate to invitations list
     - **Expected Result**: Invitation shows "Rejected" status
     - **Expected Result**: User is not in team members list

### Test Suite: Editor Inviting Users (Limited Permissions)

- [ ] **Test: Editor can invite users to project**
  1. Login as Editor: `tim.planterplan@gmail.com`
  2. Navigate to a project where user is Editor
  3. Click invite user button
     - **Expected Result**: Invite form opens (Editors can invite)
  4. Fill in user details and role
  5. Send invite
     - **Expected Result**: Invitation is sent successfully

- [ ] **Test: Editor cannot change existing member roles**
  1. Login as Editor
  2. Navigate to project team management
  3. Attempt to change another member's role
     - **Expected Result**: Role change controls are disabled or not available
     - **Expected Result**: Only Owner can change roles

### Test Suite: Viewer, Coach, Limited Cannot Manage Team

- [ ] **Test: Viewer cannot invite users**
  1. Login as Viewer
  2. Navigate to a joined project
     - **Expected Result**: Invite user button is not visible
     - **Expected Result**: No team management controls available

- [ ] **Test: Coach cannot invite users**
  1. Login as Coach
  2. Navigate to project
     - **Expected Result**: No invite or team management options

- [ ] **Test: Limited user cannot invite users**
  1. Login as Limited user
  2. Navigate to project
     - **Expected Result**: No invite or team management options

---

## 5. Role-Based Permissions Journey

**File**: `e2e/journeys/role-permissions.spec.ts`  
**Purpose**: Comprehensive testing of permission boundaries for all roles  
**Roles Tested**: Owner, Editor, Viewer, Coach, Limited

### Test Suite: Owner Permissions (Full Access)

- [ ] **Test: Owner has full task visibility**
  1. Login as Owner
  2. Navigate to owned project
     - **Expected Result**: All tasks are visible in all views (list, board, phases)

- [ ] **Test: Owner can perform all task operations**
  1. Login as Owner
  2. Test ability to:
     - Add tasks ✅
     - Edit any task ✅
     - Delete tasks ✅
     - Change task status ✅
     - Assign users to tasks ✅
     - Drag and drop tasks ✅
     - **Expected Result**: All operations succeed

- [ ] **Test: Owner can manage project settings**
  1. Login as Owner
  2. Navigate to project
  3. Access project settings
  4. Modify project name, description, dates
  5. Save changes
     - **Expected Result**: All settings are editable and save successfully

- [ ] **Test: Owner can manage team members**
  1. Login as Owner
  2. Navigate to team management
  3. Invite users ✅
  4. Change user roles ✅
  5. Remove users from project ✅
     - **Expected Result**: All team management operations succeed

- [ ] **Test: Owner can delete project**
  1. Login as Owner
  2. Navigate to a test project (non-critical)
  3. Access project settings or actions menu
  4. Click "Delete Project"
  5. Confirm deletion
     - **Expected Result**: Confirmation dialog appears
     - **Expected Result**: Project is deleted after confirmation
     - **Expected Result**: Project no longer appears in project list

### Test Suite: Editor Permissions

- [ ] **Test: Editor can view all tasks**
  1. Login as Editor: `tim.planterplan@gmail.com`
  2. Navigate to joined project
     - **Expected Result**: All tasks are visible

- [ ] **Test: Editor can add tasks**
  1. Login as Editor
  2. Navigate to project
  3. Add a new task
     - **Expected Result**: Task is created successfully

- [ ] **Test: Editor can edit any task**
  1. Login as Editor
  2. Select any task in project
  3. Edit task details
  4. Save changes
     - **Expected Result**: Changes save successfully

- [ ] **Test: Editor can delete tasks**
  1. Login as Editor
  2. Select a task
  3. Delete the task
     - **Expected Result**: Task is deleted successfully

- [ ] **Test: Editor can invite users (but cannot assign all roles)**
  1. Login as Editor
  2. Open invite form
  3. Attempt to invite user
     - **Expected Result**: Invitation can be sent
     - **Expected Result**: Editor may have limited role assignment options

- [ ] **Test: Editor cannot edit project settings**
  1. Login as Editor
  2. Navigate to project
  3. Attempt to access project settings
     - **Expected Result**: Settings option is disabled or not visible
     - **Expected Result**: Attempting to edit settings shows permission denied

- [ ] **Test: Editor cannot delete project**
  1. Login as Editor
  2. Navigate to project
  3. Look for delete project option
     - **Expected Result**: Delete project option is not available
     - **Expected Result**: Attempting to delete shows permission denied

### Test Suite: Viewer Permissions (Read-Only)

- [ ] **Test: Viewer can view all tasks**
  1. Login as Viewer: `planterplan.role_tester@mail.com`
  2. Navigate to joined project
     - **Expected Result**: All tasks are visible
     - **Expected Result**: Task details are readable

- [ ] **Test: Viewer cannot add tasks**
  1. Login as Viewer
  2. Navigate to project
  3. Attempt to add a task
     - **Expected Result**: Add task button is not visible or disabled
     - **Expected Result**: Permission denied if attempted

- [ ] **Test: Viewer cannot edit any tasks**
  1. Login as Viewer
  2. Click on a task to view details
     - **Expected Result**: Task is view-only
     - **Expected Result**: Edit controls are disabled or not visible

- [ ] **Test: Viewer cannot delete tasks**
  1. Login as Viewer
  2. Select a task
     - **Expected Result**: Delete option is not available

- [ ] **Test: Viewer cannot change task status**
  1. Login as Viewer
  2. Open task details
  3. Attempt to change status
     - **Expected Result**: Status dropdown is disabled or not interactive

- [ ] **Test: Viewer cannot invite team members**
  1. Login as Viewer
  2. Navigate to project
     - **Expected Result**: Invite button is not visible
     - **Expected Result**: No team management access

- [ ] **Test: Viewer cannot edit project settings**
  1. Login as Viewer
  2. Navigate to project
     - **Expected Result**: Settings option is not available

- [ ] **Test: Viewer cannot delete project**
  1. Login as Viewer
  2. Navigate to project
     - **Expected Result**: Delete option is not available

### Test Suite: Coach Permissions

- [ ] **Test: Coach can view all tasks**
  1. Login as Coach
  2. Navigate to project
     - **Expected Result**: All tasks are visible

- [ ] **Test: Coach can identify coaching tasks**
  1. Login as Coach
  2. Navigate to project
  3. Find tasks marked as "coaching tasks"
     - **Expected Result**: Coaching tasks are clearly marked or filterable

- [ ] **Test: Coach can edit coaching tasks**
  1. Login as Coach
  2. Select a coaching task
  3. Edit task details (status, notes, description)
  4. Save changes
     - **Expected Result**: Changes save successfully for coaching tasks

- [ ] **Test: Coach cannot edit non-coaching tasks**
  1. Login as Coach
  2. Select a regular (non-coaching) task
  3. Attempt to edit
     - **Expected Result**: Edit controls are disabled
     - **Expected Result**: Task is read-only

- [ ] **Test: Coach cannot add tasks**
  1. Login as Coach
  2. Attempt to add a task
     - **Expected Result**: Add task option is not available

- [ ] **Test: Coach cannot delete tasks**
  1. Login as Coach
  2. Attempt to delete even a coaching task
     - **Expected Result**: Delete option is not available

- [ ] **Test: Coach cannot invite team members**
  1. Login as Coach
  2. Navigate to project
     - **Expected Result**: No team management access

- [ ] **Test: Coach cannot edit project settings or delete project**
  1. Login as Coach
  2. Navigate to project
     - **Expected Result**: Settings and delete options not available

### Test Suite: Limited User Permissions

- [ ] **Test: Limited user can view all tasks**
  1. Login as Limited user
  2. Navigate to project
     - **Expected Result**: All tasks are visible (restricted view)

- [ ] **Test: Limited user can identify assigned tasks**
  1. Login as Limited user
  2. Navigate to project
  3. View tasks list
     - **Expected Result**: Assigned tasks are clearly marked or highlighted
     - **Expected Result**: User can distinguish their tasks from others

- [ ] **Test: Limited user can edit own assigned tasks**
  1. Login as Limited user
  2. Click on a task assigned to this user
  3. Edit task details (status, notes, fields)
  4. Save changes
     - **Expected Result**: All edits save successfully for assigned tasks

- [ ] **Test: Limited user cannot edit non-assigned tasks**
  1. Login as Limited user
  2. Click on a task NOT assigned to this user
     - **Expected Result**: Task is view-only
     - **Expected Result**: Edit controls are disabled

- [ ] **Test: Limited user cannot add tasks**
  1. Login as Limited user
  2. Attempt to add a task
     - **Expected Result**: Add option is not available

- [ ] **Test: Limited user cannot delete tasks (even assigned ones)**
  1. Login as Limited user
  2. Select an assigned task
  3. Look for delete option
     - **Expected Result**: Delete option is not available

- [ ] **Test: Limited user cannot invite team members**
  1. Login as Limited user
  2. Navigate to project
     - **Expected Result**: No team management access

- [ ] **Test: Limited user cannot edit project settings or delete project**
  1. Login as Limited user
  2. Navigate to project
     - **Expected Result**: Settings and delete options not available

### Test Suite: Permission Boundary Edge Cases

- [ ] **Test: Role changes take effect immediately**
  1. Setup: Owner changes a user's role from Editor to Viewer
  2. User refreshes their browser
     - **Expected Result**: User's permissions reflect new role
     - **Expected Result**: Previously editable tasks become read-only

- [ ] **Test: Removed users lose project access**
  1. Setup: Owner removes a user from project
  2. Removed user attempts to access project
     - **Expected Result**: User cannot see project in dashboard
     - **Expected Result**: Direct URL access redirects or shows permission denied

- [ ] **Test: Users cannot escalate their own permissions**
  1. Login as Viewer
  2. Attempt to modify own role via UI manipulation or API calls
     - **Expected Result**: Permission denied
     - **Expected Result**: Role remains unchanged

---

## 6. Drag & Drop Journey

**File**: `e2e/journeys/drag-drop.spec.ts`  
**Purpose**: Test drag-and-drop task reordering functionality  
**Roles Tested**: Owner, Editor (can drag), Viewer, Coach, Limited (cannot drag)

### Test Suite: Drag & Drop Functionality (Owner)

- [ ] **Test: Owner can pick up and drag a task**
  1. Login as Owner
  2. Navigate to project with board or list view
  3. Click and hold on a task
  4. Drag task to a new position
     - **Expected Result**: Task becomes "draggable" state (visual feedback)
     - **Expected Result**: Cursor changes to indicate dragging
     - **Expected Result**: Task follows cursor movement

- [ ] **Test: Owner can drop task adjacent to another task (reorder)**
  1. Login as Owner
  2. Navigate to project list/board view
  3. Drag a task
  4. Drop it between two other tasks at same level
     - **Expected Result**: Task is repositioned
     - **Expected Result**: Task order updates immediately
     - **Expected Result**: New order persists after page reload

- [ ] **Test: Owner can drop task on top of another task (make it a child)**
  1. Login as Owner
  2. Navigate to project
  3. Drag a task
  4. Drop it directly on top of another task
     - **Expected Result**: Task becomes a child of the target task
     - **Expected Result**: Task hierarchy updates
     - **Expected Result**: Parent-child relationship is maintained

- [ ] **Test: Drag and drop updates task hierarchy correctly**
  1. Login as Owner
  2. Drag a child task to root level
     - **Expected Result**: Task becomes a root-level task
  3. Drag a root task under another root task
     - **Expected Result**: Task becomes a child
  4. Reload page
     - **Expected Result**: All hierarchy changes persist

- [ ] **Test: Drag and drop works across different views (list, board, phases)**
  1. Login as Owner
  2. Test drag-drop in List view
     - **Expected Result**: Works correctly
  3. Switch to Board view, test drag-drop
     - **Expected Result**: Works correctly, tasks move between columns
  4. Switch to Phases view, test drag-drop
     - **Expected Result**: Works correctly (if applicable)

### Test Suite: Drag & Drop (Editor)

- [ ] **Test: Editor can drag and drop tasks**
  1. Login as Editor
  2. Navigate to project
  3. Drag a task to new position
  4. Drop task
     - **Expected Result**: Task reorders successfully
     - **Expected Result**: Changes persist

- [ ] **Test: Editor can make tasks children via drag-drop**
  1. Login as Editor
  2. Drag a task onto another task
     - **Expected Result**: Task becomes child of target task

### Test Suite: Drag & Drop (Permission Denied)

- [ ] **Test: Viewer cannot drag tasks**
  1. Login as Viewer
  2. Navigate to project
  3. Attempt to drag a task
     - **Expected Result**: Task is not draggable (no visual feedback)
     - **Expected Result**: Cursor does not change to drag state
     - **Expected Result**: Task remains in original position

- [ ] **Test: Coach cannot drag tasks**
  1. Login as Coach
  2. Navigate to project
  3. Attempt to drag a task (even coaching task)
     - **Expected Result**: Tasks are not draggable

- [ ] **Test: Limited user cannot drag tasks**
  1. Login as Limited user
  2. Navigate to project
  3. Attempt to drag even an assigned task
     - **Expected Result**: Tasks are not draggable

### Test Suite: Drag & Drop Edge Cases

- [ ] **Test: Cannot drop task inside itself**
  1. Login as Owner
  2. Drag a parent task
  3. Attempt to drop it inside one of its own children
     - **Expected Result**: Drop is prevented or task returns to original position
     - **Expected Result**: No circular hierarchy is created

- [ ] **Test: Drag and drop handles network errors gracefully**
  1. Login as Owner
  2. Simulate network disconnection (dev tools)
  3. Drag and drop a task
     - **Expected Result**: Task may revert to original position
     - **Expected Result**: Error message or retry mechanism appears

- [ ] **Test: Concurrent drag operations don't conflict**
  1. Setup: Two users (Owner and Editor) in same project
  2. Both drag different tasks simultaneously
     - **Expected Result**: Both operations complete successfully
     - **Expected Result**: Real-time sync keeps both users in sync (test with real-time if possible)

---

## 7. Master Library Journey

**File**: `e2e/journeys/master-library.spec.ts`  
**Purpose**: Test Master Library search, copy, and management features  
**Roles Tested**: All users (search/copy), Admin (management)

### Test Suite: Master Library Search & Copy (All Users)

- [ ] **Test: User can search Master Library when adding task**
  1. Login as Owner
  2. Navigate to project
  3. Click "Add Child Task"
  4. Find Master Library search bar in form
  5. Type search keyword: "planning"
     - **Expected Result**: Search bar accepts input
     - **Expected Result**: Search results appear below search bar
     - **Expected Result**: Results show relevant tasks from Master Library

- [ ] **Test: Search results display task information**
  1. Login as Owner
  2. Open add task form
  3. Search Master Library for "meeting"
     - **Expected Result**: Each result shows:
       - Task title
       - Task description preview
       - Task category or tags (if applicable)

- [ ] **Test: User can select task from search results to copy**
  1. Login as Owner
  2. Open add task form
  3. Search Master Library
  4. Click on a task from search results
     - **Expected Result**: Task form fields are populated with selected task's data
     - **Expected Result**: Title, purpose, description, actions, resources are all copied
     - **Expected Result**: User can still edit the populated fields

- [ ] **Test: Editor can search and copy from Master Library**
  1. Login as Editor
  2. Navigate to project, open add task form
  3. Search Master Library and select a task
     - **Expected Result**: Works identically to Owner

- [ ] **Test: Search returns relevant results**
  1. Login as any user
  2. Search for specific keywords
  3. Verify results match search intent
     - **Expected Result**: Search algorithm returns relevant tasks
     - **Expected Result**: No irrelevant tasks appear

- [ ] **Test: Empty search shows no results or all library tasks**
  1. Login as Owner
  2. Open add task form
  3. Click on Master Library search without typing
     - **Expected Result**: Either shows all library tasks OR shows empty state until search

### Test Suite: Adding Tasks to Master Library (Admin/Owner)

- [ ] **Test: Admin can add template task to Master Library**
  1. Login as Admin user
  2. Navigate to a template
  3. Select a task from the template
  4. Click "Add to Master Library" or similar action
     - **Expected Result**: Task is added to Master Library
     - **Expected Result**: Task appears in Master Library search results

- [ ] **Test: Admin can remove task from Master Library**
  1. Login as Admin
  2. Access Master Library management interface
  3. Select a task from library
  4. Click "Remove from Library"
  5. Confirm removal
     - **Expected Result**: Task is removed from Master Library
     - **Expected Result**: Task no longer appears in search results

### Test Suite: Master Library Management (Future - Admin Only)

**Note: These are future tests, not currently active**

- [ ] **Test: Admin can view all Master Library tasks**
- [ ] **Test: Admin can add new task to library (not from template)**
- [ ] **Test: Admin can edit existing library task**
- [ ] **Test: Admin can delete library task**
- [ ] **Test: Admin can search/filter library tasks**
- [ ] **Test: Admin can categorize or tag library tasks**

---

## 8. Dashboard & Metrics Journey

**File**: `e2e/journeys/dashboard.spec.ts`  
**Purpose**: Test dashboard widgets, task metrics, and project overview  
**Roles Tested**: All users (view own dashboard)

### Test Suite: Dashboard View

- [ ] **Test: User can access dashboard after login**
  1. Login as any user
  2. Complete login flow
     - **Expected Result**: Redirects to `/dashboard`
     - **Expected Result**: Dashboard page loads successfully

- [ ] **Test: Dashboard displays user's projects**
  1. Login as Owner
  2. View dashboard
     - **Expected Result**: "Your Projects" section displays all owned projects
     - **Expected Result**: Project cards show project name, status, and preview
  3. Login as Editor
  4. View dashboard
     - **Expected Result**: "Joined Projects" section displays projects where user is a member

### Test Suite: Task Metrics Display

- [ ] **Test: Dashboard shows current task count**
  1. Login as Owner with active projects
  2. View dashboard metrics area
     - **Expected Result**: "Current Tasks" metric displays total number of active tasks
     - **Expected Result**: Count is accurate

- [ ] **Test: Dashboard shows due soon tasks count**
  1. Login as Owner
  2. View dashboard
     - **Expected Result**: "Due Soon" metric displays tasks due within a certain timeframe (e.g., next 7 days)
     - **Expected Result**: Count is accurate

- [ ] **Test: Dashboard shows overdue tasks count**
  1. Login as Owner with overdue tasks
  2. View dashboard
     - **Expected Result**: "Overdue" metric displays count of tasks past their due date
     - **Expected Result**: Count is accurate and highlighted (e.g., red color)

- [ ] **Test: Dashboard shows tasks by status**
  1. Login as Owner
  2. View dashboard metrics
     - **Expected Result**: Displays count for:
       - To Do tasks
       - In Progress tasks
       - Blocked tasks
       - Complete tasks
     - **Expected Result**: All counts are accurate

- [ ] **Test: Dashboard shows total project count**
  1. Login as Owner
  2. View dashboard
     - **Expected Result**: "Number of Projects" metric displays total owned projects
     - **Expected Result**: Count is accurate

### Test Suite: Dashboard Interactions

- [ ] **Test: Clicking on project card navigates to project**
  1. Login as Owner
  2. View dashboard
  3. Click on a project card
     - **Expected Result**: Navigates to project detail view
     - **Expected Result**: URL changes to `/project/{project-id}` or similar

- [ ] **Test: Dashboard metrics are clickable (if applicable)**
  1. Login as Owner
  2. Click on a metric (e.g., "Overdue Tasks")
     - **Expected Result**: Either navigates to filtered view OR expands to show task list
     - **Expected Result**: Shows relevant tasks

- [ ] **Test: Dashboard updates in real-time (if applicable)**
  1. Setup: Two browser windows logged in as same user
  2. In Window 1: View dashboard
  3. In Window 2: Complete a task in a project
  4. Observe Window 1 dashboard
     - **Expected Result**: Task counts update without page refresh (if real-time enabled)
     - **Expected Result**: Metrics reflect the change

### Test Suite: Dashboard for Different Roles

- [ ] **Test: Editor sees only relevant projects on dashboard**
  1. Login as Editor
  2. View dashboard
     - **Expected Result**: Only shows projects where user is a member
     - **Expected Result**: Does not show other users' private projects

- [ ] **Test: Viewer sees projects they have access to**
  1. Login as Viewer
  2. View dashboard
     - **Expected Result**: Shows joined projects with viewer access
     - **Expected Result**: Metrics reflect only accessible tasks

---

## 9. Project Management Journey

**File**: `e2e/journeys/project-management.spec.ts`  
**Purpose**: Test project-level operations (settings, deletion, phases)  
**Roles Tested**: Owner (full access), Editor, Viewer, Coach, Limited (limited access)

### Test Suite: Project Settings (Owner)

- [ ] **Test: Owner can access project settings**
  1. Login as Owner
  2. Navigate to a project
  3. Click on "Settings" or gear icon
     - **Expected Result**: Project settings page/panel opens
     - **Expected Result**: Settings form displays current project information

- [ ] **Test: Owner can edit project name**
  1. Login as Owner
  2. Open project settings
  3. Change project name to "Updated Project Name"
  4. Save changes
     - **Expected Result**: Changes save successfully
     - **Expected Result**: Project name updates throughout app (dashboard, project page, breadcrumbs)
     - **Expected Result**: Changes persist after reload

- [ ] **Test: Owner can edit project description**
  1. Login as Owner
  2. Open project settings
  3. Modify project description
  4. Save changes
     - **Expected Result**: Description updates successfully

- [ ] **Test: Owner can edit project dates**
  1. Login as Owner
  2. Open project settings
  3. Change start date and/or end date
  4. Save changes
     - **Expected Result**: Dates update successfully
     - **Expected Result**: Date engine may recalculate task due dates (if applicable)

- [ ] **Test: Owner can modify project metadata (tags, categories, etc.)**
  1. Login as Owner
  2. Open project settings
  3. Modify additional metadata fields
  4. Save changes
     - **Expected Result**: All changes save successfully

### Test Suite: Project Deletion (Owner Only)

- [ ] **Test: Owner can delete a project**
  1. Login as Owner
  2. Navigate to a test project (safe to delete)
  3. Open project settings or actions menu
  4. Click "Delete Project" button
     - **Expected Result**: Confirmation dialog appears
     - **Expected Result**: Dialog warns about permanent deletion
  5. Confirm deletion
     - **Expected Result**: Project is deleted
     - **Expected Result**: Redirects to dashboard
     - **Expected Result**: Project no longer appears in project list

- [ ] **Test: Deleting project removes all associated data**
  1. Login as Owner
  2. Note the tasks in a project
  3. Delete the project
  4. Verify tasks are also removed (via database or search)
     - **Expected Result**: All project tasks are deleted
     - **Expected Result**: Project memberships are removed

- [ ] **Test: Confirmation dialog can be cancelled**
  1. Login as Owner
  2. Attempt to delete a project
  3. Click "Cancel" in confirmation dialog
     - **Expected Result**: Deletion is cancelled
     - **Expected Result**: Project remains intact

### Test Suite: Project Settings (Permission Denied)

- [ ] **Test: Editor cannot access project settings**
  1. Login as Editor
  2. Navigate to a project
  3. Look for settings option
     - **Expected Result**: Settings button is not visible OR disabled
     - **Expected Result**: Attempting to access settings URL shows permission denied

- [ ] **Test: Editor cannot delete project**
  1. Login as Editor
  2. Navigate to project
     - **Expected Result**: Delete project option is not available

- [ ] **Test: Viewer cannot access project settings**
  1. Login as Viewer
  2. Navigate to project
     - **Expected Result**: No settings access

- [ ] **Test: Coach cannot access project settings**
  1. Login as Coach
  2. Navigate to project
     - **Expected Result**: No settings access

- [ ] **Test: Limited user cannot access project settings**
  1. Login as Limited user
  2. Navigate to project
     - **Expected Result**: No settings access

### Test Suite: Phase Management (Owner)

- [ ] **Test: Owner can view project phases**
  1. Login as Owner
  2. Navigate to project
  3. Switch to "Phases" view/tab
     - **Expected Result**: All project phases are displayed
     - **Expected Result**: Each phase shows:
       - Phase name
       - Phase status (locked/unlocked)
       - Tasks within phase
       - Completion status

- [ ] **Test: Phases unlock based on checkpoint completion**
  1. Login as Owner
  2. Navigate to project with phases
  3. Complete all tasks in Phase 1
  4. Mark phase checkpoint as complete
     - **Expected Result**: Phase 1 shows as "Complete"
     - **Expected Result**: Phase 2 automatically unlocks (trigger: `trg_unlock_next_phase`)
     - **Expected Result**: Phase 2 tasks become editable

- [ ] **Test: Locked phases prevent task editing**
  1. Login as Owner
  2. Navigate to a project
  3. Find a task in a locked phase
  4. Attempt to edit the task
     - **Expected Result**: Task is view-only or edit is disabled
     - **Expected Result**: Message indicates phase is locked

- [ ] **Test: Owner can manually unlock phase (if feature exists)**
  1. Login as Owner
  2. Navigate to phases view
  3. Find a locked phase
  4. Click "Unlock" or override option
     - **Expected Result**: Phase unlocks manually
     - **Expected Result**: Tasks become editable

---

## 10. UI Interaction Journey

**File**: `e2e/journeys/ui-interactions.spec.ts`  
**Purpose**: Test general UI interactions (expand/collapse, navigation, theme)  
**Roles Tested**: All users

### Test Suite: Task Tree Expand/Collapse

- [ ] **Test: User can expand a collapsed task**
  1. Login as any user
  2. Navigate to project with hierarchical tasks
  3. Find a task with children (showing collapse/expand icon)
  4. Task is initially collapsed (children hidden)
  5. Click expand icon
     - **Expected Result**: Task expands
     - **Expected Result**: Child tasks become visible
     - **Expected Result**: Icon changes to "collapse" state

- [ ] **Test: User can collapse an expanded task**
  1. Login as any user
  2. Navigate to project
  3. Find an expanded task with children
  4. Click collapse icon
     - **Expected Result**: Task collapses
     - **Expected Result**: Child tasks are hidden
     - **Expected Result**: Icon changes to "expand" state

- [ ] **Test: Expand/collapse state persists within session**
  1. Login as any user
  2. Expand several tasks
  3. Navigate away from project
  4. Navigate back to project
     - **Expected Result**: Previously expanded tasks remain expanded (if persistence implemented)

- [ ] **Test: All users (all roles) can expand/collapse tasks**
  1. Test with Owner, Editor, Viewer, Coach, Limited
     - **Expected Result**: Expand/collapse works identically for all roles

### Test Suite: Multi-View Navigation

- [ ] **Test: User can switch to List view**
  1. Login as Owner
  2. Navigate to project
  3. Click "List" view tab/button
     - **Expected Result**: View changes to list layout
     - **Expected Result**: All tasks display in hierarchical list format

- [ ] **Test: User can switch to Board view**
  1. Login as Owner
  2. Navigate to project
  3. Click "Board" view tab/button
     - **Expected Result**: View changes to kanban board layout
     - **Expected Result**: Tasks are grouped by status columns

- [ ] **Test: User can switch to Phases view**
  1. Login as Owner
  2. Navigate to project
  3. Click "Phases" view tab/button
     - **Expected Result**: View changes to phases layout
     - **Expected Result**: Tasks are grouped by phase

- [ ] **Test: View preference is remembered (if implemented)**
  1. Login as Owner
  2. Switch to Board view
  3. Navigate away and return to project
     - **Expected Result**: Board view is still active (if persistence implemented)

### Test Suite: Theme Switching

- [ ] **Test: User can toggle dark/light mode**
  1. Login as any user
  2. Find theme toggle button (usually in header/settings)
  3. Current theme is light (or dark)
  4. Click theme toggle
     - **Expected Result**: Theme switches to dark (or light)
     - **Expected Result**: All UI elements update to new theme
     - **Expected Result**: Theme change applies across all pages

- [ ] **Test: Theme preference persists across sessions**
  1. Login as Owner
  2. Switch to dark mode
  3. Logout
  4. Login again
     - **Expected Result**: Dark mode is still active

- [ ] **Test: Theme is consistent across all pages**
  1. Login as Owner
  2. Set theme to dark mode
  3. Navigate through:
     - Dashboard
     - Project views
     - Settings
     - Master Library
     - **Expected Result**: Dark theme applies consistently everywhere

### Test Suite: Responsive Design (Mobile)

- [ ] **Test: Mobile-specific UI elements appear on mobile viewport**
  1. Set browser viewport to mobile size (e.g., 375x667)
  2. Login as Owner
  3. Navigate to project
     - **Expected Result**: Mobile FAB (Floating Action Button) appears
     - **Expected Result**: Mobile navigation (if different) is visible
     - **Expected Result**: Desktop sidebar may be hidden or collapsible

- [ ] **Test: Mobile Agenda view is accessible**
  1. Set mobile viewport
  2. Login as Owner
  3. Navigate to project
  4. Access Agenda view (if mobile-specific feature)
     - **Expected Result**: Agenda view displays tasks in mobile-optimized format

---

## Future Test Suites

**Note: These test suites are for features marked "for later" and should be implemented when features are ready**

---

## Future Suite: Account Settings Management

**File**: `e2e/journeys/account-settings.spec.ts` (Future)  
**Status**: Not yet implemented

### Future Tests: Account Settings

- [ ] **Test: User can change account password**
- [ ] **Test: User can update username/display name**
- [ ] **Test: User can update email address**
- [ ] **Test: User can enable/disable email notifications**
- [ ] **Test: Password must meet security requirements**

---

## Future Suite: Template Publishing

**File**: `e2e/journeys/template-publishing.spec.ts` (Future)  
**Status**: Not yet implemented

### Future Tests: Template Management

- [ ] **Test: Admin can publish a template**
- [ ] **Test: Published template appears in template library**
- [ ] **Test: Admin can unpublish a template**
- [ ] **Test: Unpublished template is hidden from non-admin users**
- [ ] **Test: Only published templates show in project creation flow**

---

## Future Suite: License Code Usage

**File**: `e2e/journeys/license-codes.spec.ts` (Future)  
**Status**: Not yet implemented

### Future Tests: License Code Workflow

- [ ] **Test: User can enter license code during project creation**
- [ ] **Test: Valid license code allows project creation**
- [ ] **Test: Invalid license code shows error message**
- [ ] **Test: License code tracks usage limits**
- [ ] **Test: Expired license code is rejected**

---

## Future Suite: Admin Master Library Management

**File**: `e2e/journeys/admin-library.spec.ts` (Future)  
**Status**: Not yet implemented

### Future Tests: Admin Library Operations

- [ ] **Test: Admin can add new task to library (not from template)**
- [ ] **Test: Admin can edit existing library task**
- [ ] **Test: Admin can delete library task**
- [ ] **Test: Admin can search/filter library tasks**
- [ ] **Test: Admin can view all library tasks**
- [ ] **Test: Admin can categorize library tasks**
- [ ] **Test: Admin can tag library tasks**

---

## Future Suite: Resource Management

**File**: `e2e/journeys/resources.spec.ts` (Future)  
**Status**: Not yet implemented

### Future Tests: Resource Operations

- [ ] **Test: Admin can add new resource**
- [ ] **Test: Admin can edit existing resource**
- [ ] **Test: Admin can delete resource (or archive)**
- [ ] **Test: Admin can search/filter resources**
- [ ] **Test: Admin can view all resources**
- [ ] **Test: Users can attach resources to tasks**
- [ ] **Test: Resources display correctly in task details**

---

## Test Infrastructure

### Test Utilities & Helpers

Create reusable test utilities in `e2e/fixtures/test-helpers.ts`:

```typescript
// Authentication helpers
export async function loginAsOwner(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'planterplan.test@gmail.com');
  await page.fill('[name="password"]', 'roots99');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function loginAsEditor(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'tim.planterplan@gmail.com');
  await page.fill('[name="password"]', 'roots99(E');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function loginAsViewer(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'planterplan.role_tester@mail.com');
  await page.fill('[name="password"]', 'roots99_role');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Navigation helpers
export async function navigateToProject(page: Page, projectName: string) {
  await page.goto('/dashboard');
  await page.click(`text=${projectName}`);
  await page.waitForLoadState('networkidle');
}

// Task helpers
export async function createTask(page: Page, parentTaskName: string, taskData: any) {
  await page.click(`text=${parentTaskName}`);
  await page.click('button:has-text("Add Child Task")');
  await page.fill('[name="title"]', taskData.title);
  await page.fill('[name="purpose"]', taskData.purpose);
  await page.fill('[name="description"]', taskData.description);
  await page.click('button:has-text("Add Task")');
}

// Assertion helpers
export async function expectTaskExists(page: Page, taskName: string) {
  await expect(page.locator(`text=${taskName}`)).toBeVisible();
}

export async function expectPermissionDenied(page: Page) {
  await expect(page.locator('text=/permission denied|access denied/i')).toBeVisible();
}
```

### Page Object Model (Recommended)

For complex tests, consider implementing Page Objects:

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}

// e2e/pages/ProjectPage.ts
export class ProjectPage {
  constructor(private page: Page) {}

  async addChildTask(parentTask: string, taskData: any) {
    await this.page.click(`text=${parentTask}`);
    await this.page.click('button:has-text("Add Child Task")');
    // ... fill form
  }

  async switchView(viewName: 'list' | 'board' | 'phases') {
    await this.page.click(`button:has-text("${viewName}")`);
  }
}
```

### Test Data Management

```typescript
// e2e/fixtures/test-data.ts
export const TEST_PROJECTS = {
  INVITE_TEST: 'Project to test invitation by email',
  SCRATCH_TEST: 'Custom Project from Scratch',
};

export const TEST_TASKS = {
  PARENT_TASK: 'Planning Phase',
  CHILD_TASK: 'Research Demographics',
};

export const EXAMPLE_TEMPLATE = 'Example Template';
```

---

## Test Execution & CI/CD

### Local Test Execution

```bash
# Run all tests
npx playwright test

# Run specific journey
npx playwright test e2e/journeys/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Generate test report
npx playwright test --reporter=html
```

### CI/CD Integration

#### GitHub Actions Workflow Example

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        
      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for dev server
        run: npx wait-on http://localhost:3000
        
      - name: Run E2E tests
        run: npx playwright test
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Test Environment Setup for CI

- [ ] **Supabase test database configuration**
  - Setup test project ID
  - Configure test environment variables
  - Seed test data (users, templates, projects)

- [ ] **Test user accounts must exist**
  - Verify all test accounts are created in auth table
  - Ensure consistent test data across test runs

- [ ] **Database reset/cleanup strategy**
  - Consider: Should tests clean up after themselves?
  - Or: Should database be reset to known state before test suite?

---

## Test Coverage Tracking

### Current Coverage Status

| Journey | Total Tests | Implemented | Passing | Failing | Skipped |
|---------|-------------|-------------|---------|---------|---------|
| Authentication | 13 | 0 | 0 | 0 | 0 |
| Template to Project | 14 | 0 | 0 | 0 | 0 |
| Task Management | 44 | 0 | 0 | 0 | 0 |
| Team Collaboration | 18 | 0 | 0 | 0 | 0 |
| Role Permissions | 53 | 0 | 0 | 0 | 0 |
| Drag & Drop | 14 | 0 | 0 | 0 | 0 |
| Master Library | 11 | 0 | 0 | 0 | 0 |
| Dashboard & Metrics | 15 | 0 | 0 | 0 | 0 |
| Project Management | 22 | 0 | 0 | 0 | 0 |
| UI Interactions | 14 | 0 | 0 | 0 | 0 |
| **TOTAL** | **218** | **0** | **0** | **0** | **0** |

### Future Tests (Not Counted)

- Account Settings Management: ~5 tests
- Template Publishing: ~5 tests
- License Code Usage: ~5 tests
- Admin Master Library: ~7 tests
- Resource Management: ~7 tests

---

## Test Maintenance Guidelines

### When Adding New Tests

1. **Choose correct journey file** based on user workflow
2. **Follow naming convention**: `Test: [Role] can [action]` or `Test: [Feature] [expected behavior]`
3. **Use test helpers** for common operations (login, navigation)
4. **Include expected results** inline with test steps
5. **Test both happy path and edge cases**
6. **Add to coverage tracking table** above

### When Refactoring Application Code

1. **Run affected test suites** before and after refactoring
2. **Update test selectors** if UI elements change
3. **Verify test helpers** still work correctly
4. **Update expected results** if behavior intentionally changes

### Test Debugging Tips

- Use `--headed` mode to see browser actions
- Use `--debug` mode to step through tests
- Add `await page.pause()` for interactive debugging
- Check Playwright trace for failed tests
- Verify test data exists (test accounts, projects, templates)

---

## Success Criteria

This E2E testing system is considered complete when:

- [ ] All 218 active tests are implemented and passing
- [ ] Test utilities and helpers are in place
- [ ] CI/CD pipeline runs tests on every PR
- [ ] Test coverage is tracked and maintained
- [ ] All 5 user roles are comprehensively tested
- [ ] All critical user journeys have end-to-end coverage
- [ ] Permission boundaries are validated for all roles
- [ ] Real-time collaboration features are tested (if applicable)

---

**End of Document**

*Generated: 2026-02-11*  
*Version: 1.0*  
*Total Active Tests: 218*  
*Total Future Tests: 29*  
*Framework: Playwright 1.58*
