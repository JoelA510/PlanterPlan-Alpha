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


Technical Implementation Notes


## Documentation
Database Schema (Mermaid code):

```
erDiagram
USERS {
uuid id PK
text email
text first_name
text last_name
timestamp_with_timezone created_at
text role
uuid white_label_org_id FK
}
WHITE_LABEL_ORGS {
    uuid id PK
    text organization_name
    text subdomain UK
    text status
    timestamp_with_timezone created_at
    timestamp_with_timezone updated_at
    text primary_color
    text secondary_color
    text logo
    uuid admin_user_id FK
    text tertiary_color
    text font
}

LICENSES {
    uuid id PK
    timestamp_with_timezone created_at
    uuid user_id FK
    uuid org_id FK
    boolean is_used
    text license_key
}

TASKS {
    uuid id PK
    text title
    text description
    text purpose
    text actions
    text[] resources
    task_hierarchy type
    task_origin origin
    boolean published
    uuid license_id FK
    uuid creator FK
    timestamp_with_timezone created_at
    timestamp_with_timezone last_modified
    integer duration_days
    integer days_from_start_until_due
    uuid parent_task_id FK
    integer position
    boolean is_complete
    boolean marked_na
    date start_date
    date due_date
    uuid task_lead FK
    uuid modified_by FK
    uuid white_label_id FK
    integer default_duration
    uuid[] assigned_users
    text coaching_notes
    boolean is_coaching_task
}

PROJECT_INVITATIONS {
    uuid id PK
    uuid project_id FK
    text email
    project_membership_role role
    uuid invited_by FK
    uuid invitation_token UK
    timestamp_with_timezone expires_at
    project_invitation_status status
    timestamp_with_timezone created_at
    timestamp_with_timezone updated_at
    timestamp_with_timezone accepted_at
}

PROJECT_MEMBERSHIPS {
    uuid id PK
    uuid project_id FK
    uuid user_id FK
    project_membership_role role
    uuid invited_by FK
    timestamp_with_timezone invited_at
    timestamp_with_timezone accepted_at
    project_membership_status status
    timestamp_with_timezone created_at
    timestamp_with_timezone updated_at
}

RESOURCES {
    uuid id PK
    text title
    resource_format format
    text url
    text description
    text usage_rights
    uuid white_label_id FK
    boolean is_published
    timestamp_with_timezone created_at
    timestamp_with_timezone updated_at
    uuid created_by FK
    text[] tags
}

USERS ||--o{ LICENSES : "has"
WHITE_LABEL_ORGS ||--o{ LICENSES : "has"
WHITE_LABEL_ORGS ||--o{ USERS : "contains"
WHITE_LABEL_ORGS ||--o{ USERS : "administered_by"
WHITE_LABEL_ORGS ||--o{ RESOURCES : "owns"
USERS ||--o{ RESOURCES : "creates"
LICENSES ||--o{ TASKS : "licensed_to"
USERS ||--o{ TASKS : "creates"
USERS ||--o{ TASKS : "leads"
USERS ||--o{ TASKS : "modifies"
WHITE_LABEL_ORGS ||--o{ TASKS : "owns"
TASKS ||--o{ TASKS : "contains"
USERS ||--o{ PROJECT_INVITATIONS : "invites"
TASKS ||--o{ PROJECT_INVITATIONS : "receives"
USERS ||--o{ PROJECT_MEMBERSHIPS : "member_of"
USERS ||--o{ PROJECT_MEMBERSHIPS : "invites_to"
TASKS ||--o{ PROJECT_MEMBERSHIPS : "has_members"

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