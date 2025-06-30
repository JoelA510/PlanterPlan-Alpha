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
  - [x] Invitation management functions
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