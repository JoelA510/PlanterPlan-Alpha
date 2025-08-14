# PlanterPlan
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

MASTER_LIBRARY_TASKS {
    uuid id PK
    uuid task_id FK
    uuid added_by FK
    timestamp_with_timezone added_at
    uuid white_label_id FK
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
TASKS ||--o{ MASTER_LIBRARY_TASKS : "included_in"
USERS ||--o{ MASTER_LIBRARY_TASKS : "adds"
WHITE_LABEL_ORGS ||--o{ MASTER_LIBRARY_TASKS : "contains"

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
| `TaskDetailsPanel` | Displays detailed project task information | Shows task properties, completion status, actions |
| `TemplateDetailsPanel` | Displays detailed template task information | Shows task properties, completion status, actions |
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

