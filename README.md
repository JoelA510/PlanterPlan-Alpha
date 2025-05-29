# PlanterPlan
## Roadmap
- User front-end
    - [ ] Account creation and log in
        - [ ]  authentication
    - Dashboard
      - [ ] overview of projects
    - project task list
      - [ ] edit a project’s settings
      - [ ] view and edit Project Team
        - [ ]  add user to project team : Invite team member (email)
          - [ ]  set the role     
            
      - [ ]  progress bar for tasks
      - [ ]  note taking feature for each task
      - [ ]  edit task details
        - [ ]  edit due date and start date
          - [ ]  cascading effect on the following tasks
          - [ ]  toggle N/A and not N/A

      - [ ]  search for tasks
            - [ ]  result ordering/sorting
            - [ ]  Filter by (within or under the search)
              - [ ]  overdue, current, due soon, not due yet, in/complete
                - [ ]  Priority tasks (includes due soon, over due, current)

      - [ ]  add task from list of master library of tasks
      - [ ]  count of tasks (# of tasks overdue, due soon, etc)
            - [ ]  chart (Gant?)
      - [ ]  assign lead user for task
      - [ ]  Email task
      - [ ] Google Calendar integration
        

    - Resources
        - [ ]  search for resources in resource library
        - [ ]  display resources
        - [ ] resource store
            
    - Project Status Report
        - [ ]  Shows basic info for selected month
        - [ ]  shows num tasks completed, overdue, and due next month
            - [ ]  donut chart breakdown
            - [ ]  table list
        - [ ]  printable
    - [ ]  Foreign language User interface 

- Admin
  - [ ]  Manage Users
  - [ ]  licence management
  - [ ]  white label management
    - [ ] manage the organization's custom url, logo, css, tasks, resources, and pricing structure
  - [ ]  template management       
  - [ ]  New task type “Strategy Template” 
  - [ ]  New task type “Coaching” allows tasks to automatically be assigned to user with Coach level access
  - [ ] automatically send email notifications for tasks being due soon
## 
## Ultra-Simplified Task Search System - Implementation Roadmap

### Phase 1: Core Search Features (5 PRs)

#### **PR #1: Search Foundation**
- [ ] Create `SearchContext.js` with basic search state
- [ ] Add `SearchBar` component with input and clear button
- [ ] Create basic text search across task titles and descriptions
- [ ] Add debounced search (300ms delay) to prevent excessive calls
- [ ] Show search results count

#### **PR #2: Search UI and Results**
- [ ] Add search suggestions dropdown with matching tasks
- [ ] Implement search term highlighting in results
- [ ] Add "no results found" state with helpful message
- [ ] Create active filters display as removable chips
- [ ] Add "clear all" button to reset search

#### **PR #3: Status Filters**
- [ ] Add completion status filters: "completed", "incomplete"
- [ ] Implement quick filter buttons for common searches
- [ ] Add date-based priority detection: "overdue", "due today", "due soon"
- [ ] Create filter combinations (multiple filters at once)

#### **PR #4: Personal and Team Filters**
- [ ] Add "My Tasks" filter (tasks created by or assigned to current user)
- [ ] Implement "Created by me" filter
- [ ] Add user selection filter: "assigned to [user]"
- [ ] Create organization filter for multi-org users

#### **PR #5: Date and Search Operators**
- [ ] Add date range filtering with date picker
- [ ] Implement relative dates: "today", "this week", "next week"
- [ ] Add field-specific search: "title:keyword", "description:keyword"
- [ ] Support exclude terms with minus operator: "-keyword"

#### Success Criteria
- Users can find tasks 50% faster than current view-switching method
- Search handles 90% of common task discovery use cases
- Mobile-responsive and accessible interface

This streamlined 5-PR roadmap focuses on the essential search functionality that will provide the biggest impact for users while being achievable for a single external developer.

## Dual-LLM Self-Adapting Search
Using the LLM for **both** schema inference and query extraction to make it completely dynamic. Here's the architecture:

### Flow
```
Tasks Data → LLM Schema Inference → Search Capabilities
Natural Language + Search Capabilities → LLM Query Extraction → Executable Query → Results
```

### 1. LLM Schema Inference
**Function:** `inferSearchCapabilities(tasks)`

```javascript
const prompt = `
Analyze this sample of task data and describe what search/filter operations are possible:

${JSON.stringify(tasks.slice(0, 10), null, 2)}

Describe the search capabilities in natural language. What can users search for, filter by, or sort by? What are the data types and possible values?
`;

// LLM Response Example:
// "Users can filter by completion status (true/false), search text in titles and descriptions, 
//  filter by duration in days (numbers 1-30), sort by due dates, filter by assigned users 
//  (sarah, john, mike), find tasks by hierarchy level..."
```

### 2. LLM Query Extraction  
**Function:** `extractQuery(naturalLanguage, capabilities)`

```javascript
const prompt = `
Given these search capabilities:
"${searchCapabilities}"

Convert this user query into a structured search:
"${naturalLanguage}"

Return JSON with the specific operations to perform on the data.
`;

// LLM Response Example for "next 5 tasks longer than 3 days":
// {
//   "operations": [
//     {"type": "filter", "condition": "duration_days > 3"},
//     {"type": "sort", "field": "due_date", "order": "ascending"},
//     {"type": "limit", "count": 5}
//   ]
// }
```

### 3. Universal Query Executor
**Function:** `executeOperations(operations, tasks)`

```javascript
function executeOperations(operations, tasks) {
  let results = [...tasks];
  
  for (const op of operations) {
    switch (op.type) {
      case 'filter':
        results = results.filter(task => evaluateCondition(task, op.condition));
        break;
      case 'sort':
        results = results.sort((a, b) => compareFields(a, b, op.field, op.order));
        break;
      case 'limit':
        results = results.slice(0, op.count);
        break;
      case 'textSearch':
        results = results.filter(task => searchText(task, op.terms));
        break;
    }
  }
  
  return results;
}
```

### Complete System
```javascript
// Single entry point - completely self-adapting
async function searchTasks(naturalLanguage, tasks) {
  // Step 1: LLM understands what's searchable in this data
  const capabilities = await inferSearchCapabilities(tasks);
  
  // Step 2: LLM converts natural language to operations  
  const operations = await extractQuery(naturalLanguage, capabilities);
  
  // Step 3: Execute operations against data
  return executeOperations(operations, tasks);
}
```

### Evolution Example

**Today's Data:**
```javascript
[
  { title: "Write docs", duration_days: 5, assigned_to: "sarah", is_complete: false },
  { title: "Fix bug", duration_days: 2, assigned_to: "john", is_complete: true }
]
```

**LLM Infers:** "Can filter by duration_days (numbers), assigned_to (sarah/john), completion status..."

---

**Tomorrow's Data (completely different structure):**
```javascript  
[
  { name: "Write docs", effort_hours: 40, team: ["sarah"], status: "in_progress" },
  { name: "Fix bug", effort_hours: 16, team: ["john"], status: "done" }
]
```

**LLM Infers:** "Can filter by effort_hours (numbers), team members (sarah/john), status (in_progress/done)..."

**Same Query:** "next 5 tasks longer than 3 days"

**LLM Adapts:** Converts "3 days" to "24 hours" and uses `effort_hours > 72` instead of `duration_days > 3`

### Key Benefits
- **Zero assumptions:** No hardcoded field names, types, or operations
- **Self-discovering:** LLM figures out what's possible from actual data
- **Completely adaptive:** Works with any task structure, any field names
- **Natural language interface:** LLM handles all complexity of interpretation

The system becomes truly **data-structure agnostic** because the LLM does all the heavy lifting of understanding both what's available and how to query it.

## Team Management Roadmap Checklist
Role-Based Access Control System for Project-Level Team Management

#### Phase 1: Database Schema & Core Data Model

- [x] **PR #1: Extend Database Schema for Project Team Management**
  - [x] Database migrations for new tables and relationships
  - [x] Create project_memberships table
    - [x] id (uuid, primary key)
    - [x] project_id (uuid, foreign key to tasks table where parent_task_id is null)
    - [x] user_id (uuid, foreign key to users table)
    - [x] role (enum: 'owner', 'full_user', 'limited_user', 'coach')
    - [x] invited_by (uuid, foreign key to users table)
    - [x] invited_at (timestamptz)
    - [x] accepted_at (timestamptz, nullable)
    - [x] status (enum: 'pending', 'accepted', 'declined', 'revoked')
    - [x] created_at (timestamptz)
    - [x] updated_at (timestamptz)
  - [x] Create project_invitations table
    - [x] id (uuid, primary key)
    - [x] project_id (uuid, foreign key to tasks table)
    - [x] email (text)
    - [x] role (enum: 'owner', 'full_user', 'limited_user', 'coach')
    - [x] invited_by (uuid, foreign key to users table)
    - [x] invitation_token (uuid, unique)
    - [x] expires_at (timestamptz)
    - [x] status (enum: 'pending', 'accepted', 'declined', 'expired', 'revoked')
    - [x] created_at (timestamptz)
    - [x] updated_at (timestamptz)
  - [x] Update existing tables to support team assignments
    - [x] Add assigned_users column to tasks table (array of user IDs)
    - [x] Add coaching_notes text column to tasks table
    - [x] Add is_coaching_task boolean column to tasks table
  - [ ] Create database views for efficient querying
    - [x] project_team_members_view (combines memberships with user details)
    - [ ] user_project_permissions_view (flattened permissions per user/project)

- [ ] **PR #2: Database Constraints and RLS Policies**
  - [ ] Add database constraints and indexes
    - [ ] Unique constraints on project_memberships (project_id, user_id)
    - [ ] Unique constraints on project_invitations (project_id, email) where status = 'pending'
    - [ ] Indexes on frequently queried columns
    - [ ] Check constraints for role validation
  - [ ] Implement Row Level Security (RLS) policies
    - [ ] Policy for project_memberships table (users can see their own memberships and project owners can see all)
    - [ ] Policy for project_invitations table (invited users and project admins)
    - [ ] Update existing tasks table RLS to incorporate project-level permissions
    - [ ] Policy for accessing projects based on membership

#### Phase 2: Backend API Layer

- [ ] **PR #3: Core Permission Service**
  - [ ] Create project permission service module
    - [ ] getUserProjectRole(userId, projectId) - get user's role in specific project
    - [ ] canUserAccessProject(userId, projectId) - basic access check
    - [ ] canUserEditTask(userId, taskId, projectId) - task-level permission check
    - [ ] canUserManageTeam(userId, projectId) - team management permission
    - [ ] canUserInviteMembers(userId, projectId) - invitation permission
    - [ ] getUserProjectPermissions(userId, projectId) - comprehensive permissions object
  - [ ] Permission constants and role definitions
    - [ ] Define permission matrices for each role
    - [ ] Create permission constants (READ, WRITE, DELETE, INVITE, MANAGE_TEAM, etc.)
    - [ ] Role hierarchy definitions

- [ ] **PR #4: Project Membership API Endpoints**
  - [ ] Core membership management functions
    - [ ] getProjectMembers(projectId) - get all members of a project
    - [ ] addProjectMember(projectId, userId, role, invitedBy) - direct member addition
    - [ ] updateMemberRole(projectId, userId, newRole, updatedBy) - role changes
    - [ ] removeMember(projectId, userId, removedBy) - remove team member
    - [ ] getUserProjects(userId) - get all projects user has access to
  - [ ] Membership validation and business logic
    - [ ] Ensure project owner always exists
    - [ ] Prevent removing last project owner
    - [ ] Validate role transitions
    - [ ] Audit trail for membership changes

- [ ] **PR #5: Invitation System API**
  - [ ] Invitation management functions
    - [ ] createInvitation(projectId, email, role, invitedBy) - create new invitation
    - [ ] getProjectInvitations(projectId) - get pending invitations
    - [ ] getPendingInvitationsForUser(userId) - get user's pending invitations
    - [ ] acceptInvitation(invitationToken, userId) - accept invitation
    - [ ] declineInvitation(invitationToken) - decline invitation
    - [ ] revokeInvitation(invitationId, revokedBy) - cancel invitation
    - [ ] resendInvitation(invitationId) - resend invitation email
  - [ ] Invitation validation and security
    - [ ] Token generation and validation
    - [ ] Expiration handling
    - [ ] Duplicate invitation prevention
    - [ ] Security checks for invitation acceptance

#### Phase 3: Frontend State Management & Context Updates

- [ ] **PR #6: Extend Authentication Context for Project Permissions**
  - [ ] Update AuthContext to include project-level permissions
    - [ ] Add userProjectRoles state to track user's roles across projects
    - [ ] Add currentProjectPermissions for active project context
    - [ ] Implement hasProjectPermission(projectId, permission) helper
    - [ ] Add getUserProjectRole(projectId) helper
    - [ ] Update session management to include project permissions
  - [ ] Permission hooks and utilities
    - [ ] Create useProjectPermissions(projectId) hook
    - [ ] Create useCanEditTask(taskId) hook
    - [ ] Create useCanManageTeam(projectId) hook
    - [ ] Permission-aware component wrapper utilities

- [ ] **PR #7: Project Team Context Provider**
  - [ ] Create new ProjectTeamContext
    - [ ] State for current project's team members
    - [ ] State for pending invitations
    - [ ] Functions for team management operations
    - [ ] Integration with permission system
  - [ ] Team management state and operations
    - [ ] teamMembers - current project team
    - [ ] pendingInvitations - pending invites for project
    - [ ] inviteUser(email, role) - invitation workflow
    - [ ] updateMemberRole(userId, newRole) - role management
    - [ ] removeMember(userId) - member removal
    - [ ] cancelInvitation(invitationId) - invitation cancellation

- [ ] **PR #8: Update TaskContext for Permission Integration**
  - [ ] Integrate project permissions into TaskContext
    - [ ] Update task fetching to respect project permissions
    - [ ] Add permission checks before task operations
    - [ ] Filter tasks based on user's project access
    - [ ] Update task creation/editing to include permission validation
  - [ ] Task-level permission enforcement
    - [ ] Modify createTask to check project permissions
    - [ ] Update updateTask with permission validation
    - [ ] Add canUserEditTask checks throughout
    - [ ] Handle assigned task filtering for limited users

#### Phase 4: Permission Enforcement Layer

- [ ] **PR #9: Task-Level Permission Enforcement**
  - [ ] Update TaskItem component with permission-aware UI
    - [ ] Hide/show edit controls based on permissions
    - [ ] Add permission checks for drag-and-drop operations
    - [ ] Update task completion toggle with role validation
    - [ ] Show/hide add child task button based on permissions
  - [ ] Update TaskDetailsPanel with role-based controls
    - [ ] Conditional rendering of edit/delete buttons
    - [ ] Role-based field access (coaching notes only for coaches)
    - [ ] Assignment controls for project owners/full users
    - [ ] Permission-aware task form rendering

- [ ] **PR #10: TaskForm Permission Integration**
  - [ ] Update TaskForm components with role-based access
    - [ ] Disable fields based on user role and task type
    - [ ] Show/hide coaching-specific fields
    - [ ] Add assignment user selection for appropriate roles
    - [ ] Validate form submissions against user permissions
  - [ ] Permission-aware form validation
    - [ ] Client-side permission validation
    - [ ] Role-specific field requirements
    - [ ] Assignment validation for limited users
    - [ ] Coach-specific field validation

- [ ] **PR #11: Project-Level Access Control**
  - [ ] Update TaskList with project permission filtering
    - [ ] Filter projects based on user membership
    - [ ] Show role-based project actions
    - [ ] Hide/show create project button based on permissions
    - [ ] Add team management access points
  - [ ] Navigation and routing permission checks
    - [ ] Update Layout component with project-aware navigation
    - [ ] Add route guards for team management pages
    - [ ] Permission-based menu item rendering
    - [ ] Project context switching validation

#### Phase 5: Team Management User Interface

- [ ] **PR #12: Core Team Management Components**
  - [ ] Create ProjectTeamPanel component
    - [ ] Team member list with roles
    - [ ] Pending invitation display
    - [ ] Role management controls
    - [ ] Member removal functionality
  - [ ] Create TeamMemberItem component
    - [ ] Individual team member display
    - [ ] Role badge and status indicators
    - [ ] Action buttons (edit role, remove) based on permissions
    - [ ] User avatar and contact information

- [ ] **PR #13: Invitation Management Interface**
  - [ ] Create InvitationForm component
    - [ ] Email input and validation
    - [ ] Role selection dropdown
    - [ ] Form submission and error handling
    - [ ] Integration with invitation API
  - [ ] Create PendingInvitationsList component
    - [ ] Display pending invitations
    - [ ] Resend invitation functionality
    - [ ] Cancel invitation capability
    - [ ] Invitation status tracking

- [ ] **PR #14: Team Management Integration**
  - [ ] Integrate team management into TaskDetailsPanel
    - [ ] Add "Team" tab to project details
    - [ ] Show team management controls for project owners
    - [ ] Display current user's role and permissions
    - [ ] Add quick team access from project header
  - [ ] Create dedicated team management page
    - [ ] Full team management interface
    - [ ] Advanced filtering and sorting
    - [ ] Bulk operations for larger teams
    - [ ] Team analytics and usage insights

#### Phase 6: Assignment and Coaching Features

- [ ] **PR #15: Task Assignment System**
  - [ ] Update TaskForm with assignment capabilities
    - [ ] Multi-select user picker for task assignment
    - [ ] Assignment validation based on project membership
    - [ ] Visual indicators for assigned tasks
    - [ ] Assignment notification system
  - [ ] Create AssignmentManager component
    - [ ] Bulk assignment operations
    - [ ] Assignment history tracking
    - [ ] Workload distribution visualization
    - [ ] Assignment conflict resolution

- [ ] **PR #16: Coaching Task Features**
  - [ ] Add coaching-specific task fields
    - [ ] Coaching notes field in TaskForm
    - [ ] Coaching task type toggle
    - [ ] Coach-only editing permissions
    - [ ] Coaching progress indicators
  - [ ] Create CoachingDashboard component
    - [ ] Overview of coaching tasks
    - [ ] Progress tracking for coached team members
    - [ ] Coaching analytics and insights
    - [ ] Feedback and evaluation tools

#### Phase 7: Email Notification System

- [ ] **PR #17: Email Service Infrastructure**
  - [ ] Create email service module
    - [ ] Email template system
    - [ ] SMTP/API integration (SendGrid/AWS SES)
    - [ ] Queue management for bulk emails
    - [ ] Email tracking and delivery status
  - [ ] Email template system
    - [ ] Invitation email templates
    - [ ] Role change notification templates
    - [ ] Task assignment notification templates
    - [ ] Coaching update notification templates

- [ ] **PR #18: Notification Triggers and Workflows**
  - [ ] Implement notification triggers
    - [ ] Project invitation notifications
    - [ ] Role change notifications
    - [ ] Task assignment notifications
    - [ ] Project updates for team members
  - [ ] User notification preferences
    - [ ] Email notification settings
    - [ ] Digest vs. immediate notifications
    - [ ] Notification type filtering
    - [ ] Unsubscribe functionality

#### Phase 8: Enhanced Permission Features

- [ ] **PR #19: Advanced Permission Controls**
  - [ ] Custom permission sets
    - [ ] Granular permission configuration
    - [ ] Project-specific permission overrides
    - [ ] Temporary permission elevation
    - [ ] Permission inheritance rules
  - [ ] Permission audit and logging
    - [ ] Activity logging for permission changes
    - [ ] Audit trail for sensitive operations
    - [ ] Permission usage analytics
    - [ ] Security compliance reporting

- [ ] **PR #20: Bulk Operations and Management**
  - [ ] Bulk team management operations
    - [ ] Multi-user invitation system
    - [ ] Bulk role changes
    - [ ] CSV import/export for team data
    - [ ] Template-based team setup
  - [ ] Advanced team management features
    - [ ] Team groups and sub-teams
    - [ ] Permission delegation
    - [ ] Time-based access controls
    - [ ] Integration with external directory services

#### Phase 9: Integration and Polish

- [ ] **PR #21: Error Handling and Edge Cases**
  - [ ] Comprehensive error handling
    - [ ] Permission denied error handling
    - [ ] Network failure recovery
    - [ ] Invalid state recovery
    - [ ] User-friendly error messages
  - [ ] Edge case handling
    - [ ] Concurrent permission changes
    - [ ] User deletion with active memberships
    - [ ] Project deletion with team members
    - [ ] Invitation expiration handling

- [ ] **PR #22: Performance Optimization**
  - [ ] Performance improvements
    - [ ] Permission caching strategies
    - [ ] Lazy loading for team data
    - [ ] Optimized database queries
    - [ ] Client-side permission caching
  - [ ] Scalability enhancements
    - [ ] Pagination for large teams
    - [ ] Search and filtering optimization
    - [ ] Real-time updates for team changes
    - [ ] Mobile responsiveness for team management

- [ ] **PR #23: Testing and Documentation**
  - [ ] Comprehensive testing suite
    - [ ] Unit tests for permission logic
    - [ ] Integration tests for team workflows
    - [ ] E2E tests for invitation flows
    - [ ] Permission enforcement testing
  - [ ] Documentation and migration guides
    - [ ] API documentation
    - [ ] User guide for team management
    - [ ] Migration guide for existing projects
    - [ ] Developer documentation for permission system

## Date Engine Roadmap
(I will develop the roadmap more thoroughly later)
### Sequential Date Engine Roadmap
- [ ] Edit the date's end date/duration will change the rest of the dates
- [ ] Delete a task will change the rest of the dates
- [ ] Add a task will change the rest of the dates
### AI powered Date Engine Roadmap
#### features:
- User will ask AI to change a task date and AI will adjust dates
  - AI might have settings for dates in mind that user can specify
  - AI might ask user follow up questions to adjust dates correctly
  - Changes are logged so user can see what was adjusted and can undo or alter the date adjustments

Technical Implementation Notes
Database Considerations:

Use UUIDs for all primary keys to avoid enumeration attacks
Implement proper indexing strategy for permission queries
Consider partitioning for large-scale deployments
Use database triggers for audit logging

Security Considerations:

Implement rate limiting for invitation endpoints
Use signed tokens for invitation URLs
Validate all permissions server-side
Implement CSRF protection for sensitive operations

Performance Considerations:

Cache user permissions in Redis/memory
Use database views for complex permission queries
Implement efficient permission checking algorithms
Consider GraphQL for flexible team data fetching

Integration Points:

Existing AuthContext and authentication flow
Current TaskContext and task management
Organization-level permissions and white-labeling
Existing UI components and styling patterns

This roadmap provides a comprehensive, incrementally buildable approach to implementing the RBAC system while maintaining compatibility with the existing codebase and allowing parallel development by multiple contributors.

## Documentation
Database Schema (Mermaid code):

```
erDiagram
    tasks {
        uuid id PK
        text title
        text description
        text purpose
        text actions
        _text resources
        task_hierarchy type
        task_origin origin
        bool published
        uuid license_id
        uuid creator FK
        timestamptz created_at
        timestamptz last_modified
        int4 default_duration
        int4 days_from_start_until
        uuid parent_task_id FK
        int4 position
        bool is_complete
        bool marked_na
        date start_date
        date due_date
        uuid task_lead FK
        uuid modified_by FK
        uuid white_label_id FK
    }
    
    white_label_orgs {
        uuid id PK
        text organization_name
        text subdomain
        text status
        timestamptz created_at
        timestamptz updated_at
        text primary_color
        text secondary_color
        text logo
        uuid admin_user_id FK
    }
    
    users {
        uuid id PK
        text email
        text first_name
        text last_name
        timestamptz created_at
    }
    
    tasks ||--o{ tasks : "parent_task_id"
    tasks }o--|| users : "creator"
    tasks }o--|| users : "modified_by"
    tasks }o--|| users : "task_lead"
    tasks }o--|| white_label_orgs : "white_label_id"
    white_label_orgs }o--|| users : "admin_user_id"
```

### PlanterPlan - Component Architecture and Logic

This documentation covers the main components and logic of the PlanterPlan application, focusing on how tasks, templates, and their relationships are managed through the codebase.

Component Architecture

Core Components

| Component | Purpose | Key Functions |
|-----------|---------|---------------|
| `TaskList` | Displays and manages projects/tasks | Task creation, selection, hierarchical display |
| `TaskItem` | Represents a single task | Displays task, handles drag events, toggles expansion |
| `TemplateList` | Manages templates | Template creation, listing, and management |
| `TemplateItem` | Represents a single template | Displays template, handles drag events |
| `TaskForm` | Task/template creation/editing form | Handles form data for tasks/templates |
| `TaskDropZone` | Drop target between tasks | Handles drop positioning for drag and drop |
| `TaskDetailsPanel` | Displays detailed task information | Shows task properties, completion status, actions |
| `TaskUIComponents` | Reusable UI components for tasks | EmptyPanel, DeleteConfirmation, ProjectForm, TemplateSelector |
| `Layout` | Main application layout | Manages routing, navigation, user context |
| `OrganizationProvider` | Manages organization context | Provides organization data and branding |
| `AuthProvider` | Manages authentication | Provides user data and authentication state |
| `TaskProvider` | Manages task data | Centralizes task fetching, caching, and updates |
| `LoginPage`/`RegisterPage` | Authentication UI | Handles user login/registration |


Component Relationships

```
App
├── AuthProvider
│   └── TaskProvider
│       └── Router
│           └── ProtectedRoutes
│               └── OrganizationProvider
│                   └── Layout (varies by user type)
│                       ├── TaskList
│                       │   ├── TaskItem (recursive)
│                       │   │   └── TaskDropZone
│                       │   ├── TaskDetailsPanel
│                       │   ├── TaskForm
│                       │   └── TaskUIComponents
│                       ├── TemplateList
│                       │   ├── TemplateItem (recursive)
│                       │   │   └── TaskDropZone
│                       │   └── TaskForm
│                       ├── AdminSettings/UserSettings
│                       │   └── AppearanceSettings
│                       └── WhiteLabelOrgList
```


## Dev notes

### May 19 2025
* issue: create new task needs to have the right start date based on duedate
* we working on task reordering
  * we want to implement a sparse positioning system so that we don't have to make updates to all sibling tasks every time a task is reordered
  * we want to implement caching for the tasks
  * we want to do batch updates
### May 18 2025
* issue: start date is stored as a date type in Supabase. don't need to do a conversion to local time.
  * solved:  added the formatDisplayDate function and use that instead of formatDate in taskUtils
### May 15 2025
* issue: end date was not right
  * solved: changed how due date was being calculated. all "effective" due dates and durations are calculated in TaskContext when tasks are loaded. the "effective" due dates and durations are stored in a separate array. Made a getter function to get a task's due date and duration.
### May 7 2025
* I think i fixed the Auth context
  * I used chat gpt to do a simple auth and copied that into claude to add features and edits
  * no longer getting stuck when you leave the tab and then come back (for now?)
* next: need to update the uses of Auth context provider useAuth()
### April 17 2025
* weird bug loading tasks after returning to tab occured again for user
  * Claude's fix: refresh if there is change in user id, org id,
    * prevents extra reloads
  * correctly nesting the contexts: Auth context, Router, Org Context, Task Context
* planter plan now has an row in the white label org table. 
  * trying to update the code for the potential changes because before: planter plan had no id (whitelabelorg would be set to NULL)
    * effects on the database
      * change table on supabase to be organization table (do this later)
      * all the tasks in tasks table with whitelabelorgid = NULL should be set to id of planterplan
        * used a sql update to do that
    * later: make sure planter plan id is being passed in all the task service functions
### April 16 2025

* Claude drafted a check your email page

### April 15 2025
* ran into issue where tasks are loading after changing tabs and coming back to planter plan app
  * claude's solution: Task Context
* create account doesn't work
  * added new pages for account creation, forgot password, password reset form
* need to make new page for "check your email"
### April 14 2025
* moving forward with login and supabase auth
  * new files: 
    * LoginPage.js
    * AuthContext.js
    * ProtectedRoute.js
    * authService.js
  * set up email auth on supabase
* only show user's tasks in tasklist (projects page)
  * edit to taskService function: fetchAllTasks
* for admin: show all templates of the org
* reconfigured tailwind css
  * the login page styling wasn't working
  * running npx tailwindcss init
    * error: tailwind is not found
  * eventually figured out with claude:
    * uninstall all the dependencies and reinstall them
### April 10 2025
* display white label logo on admin appearance settings
* start to configure tailwind for styling
* start login form
  * will consider auth with supabase
### April 9 2025
* removed the test different roles from app.js (it wasn't working; could be useful later one in dev tho)
* updated white_label_org table in supabase:
  * added fields: tertiary_color, font
* put appearance settings component as a "tab" in Admin settings
  * start with displaying default values
  * fetch org's styling settings from supabase
  * update org's styling settings in supabase after editing form in settings
    * it wasn't updating correctly at first bc of 
  * difficulty displaying logo
    * Claude thought that logo field in table was url and not svg
    * Three different approaches to displaying svg's:
      * dangerousHtml
        * not secure? need to change for the places i used it before
      * etc
    * formatting issues
### April 8 2025
* changed the links on the white label org page for planterplan admin
* ran into problem that white label orgs are not loading their tasks 
### April 7 2025
* added white label org page back to planterplan admin site
* reverted back to previous styling for the side navigation
  * Layout.js now takes the place of SideNavigation.js
    * Layout needed to copy styling from SideNavigation.js
### April 4 2025
* Settings page
* implemented different routes for different user types:
  * planter plan user, planter plan admin, white label org user, white label org admin
  * there is no authentication or login; only using different paths for now
### April 3 2025
* white label admin settings page
### April 2 2025
* added logos to the white label orgs in the admin's white label org page 
* added logos to side bar for white label org pages
* can add new templates and template tasks to white label orgs
### April 1 2025
* removed buttons in the side navigation
* added stats to the details panel for white label orgs
* changed the link to link to the tasks page of the org
### March 30 2025
* links in White Label Orgs page direct user to the white label org's task list page
### March 28 2025
* adding WhiteLabelOrgList.js (from Claud)
* edit to SideNavigation.js (from Claud)
### March 27 2025
* admin: needs to manage white label organizations
  * view all the orgs
  * edit orgs
  * claude suggests new component
    * src/components/WhiteLabelOrgList.js
### March 26 2025
* fixing query to fetch an org's tasks
  * explained the problem to Claude. It gave some good fixes. essentially we need to fetch the org id from database
  * I suggested to move the api call to taskService.js. Claude responds and suggests make a new services file for org related stuff. better for separation.
    * new file: src/services/organizationService.js
  * used the services to get org name and id in OrganizationProvider.
* New problem: no tasks were being fetched; logging didn't help; realized it was bc of RLS (Claude caught it but not right away), so I disabled RLS and then it worked
  * in taskService.js: changed all api service calls to include org id
    * if there is no org slug, then there is no org or org id; filter data by org id is null
      * in OrgProvider, update useOrganization() hook to allow for null to be handled for org in other components w/o error (error was fixed by claude)
* New problem: tasks being fetched were not being filtered by the org
  * Claude's first reponse is to just console log everything but that doesn't help unless i know what i'm looking at.
  * After looking carefully at the logs (and un console logging unimportant stuff) I realize that figuring out the org is slow (bc of api call) but it's needed right away for fetching tasks.
  * Solution: by Claude: useEffect to load page depends on orgId and org loading (from useOrg hook) and only fetch if not useOrg is not loading.
* I wanted to make the side navigation more consistent
  * Claude suggested reorganizing the App.js and making SideNavigation component along with other components that are imported into App.js
    * code is cleaner

### March 25 2025
* Redid the readme
  * changed the database on Supabase: added a white_label_org table. then updated the schema mermaid code on the readme (with claude)
  * used https://repomix.com/ to give Claude context for building the readme
    * give it the link to the repo. generate a markdown. then copy result into claude
  * prompted Claude to create a readme. 
    * result was too long, too many things that I felt wasn't as important to put so I deleted some of it.
    below is some of what was generated. not as essential as the info in documentation so i moved it here

    *Key Logic Components*

    1. Task Hierarchical Structure
      - Tasks and templates are stored in a flat structure but displayed hierarchically:
        - Top-level tasks/templates: `parent_task_id === null`
        - Children: filtered by matching `parent_task_id`
        - Ordering: determined by `position` field

    2. Drag and Drop System
      - The drag and drop system uses a custom hook (`useTaskDragAndDrop`)
        - Note: The drop operation updates the frontend state first (optimistic update), then updates the database state (API call)

    3. Project Templates System
      - The template system allows creating reusable project structures:
        1. Creating Templates: Same process as tasks but with `origin: "template"`
        2. Using Templates: When creating a new project, user can select a template

    4. Organization White-labeling
      - The `OrganizationProvider` enables white-labeling through:
        1. Route-based organization selection: `/org/:orgSlug/*`
        2. Organization context: fetch styles and logo from supabase and update the display
        3. Filtered data access: All API calls for tasks filter by organization ID for data isolation

* worked on data isolation for white label orgs
  * gave Claud the new readme and asked it to make fixes to the current set up of the organization context and fetching an org's tasks
    * no tasks showing
    * tried to console log query but couldn't figure out that (should eventually figure this out)
    * found that query wasn't correct: passing the query the org's name instead of org's id. tasks table has field for org id (not name)

