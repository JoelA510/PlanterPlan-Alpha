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
| `OrganizationProvider` | Manages organization context | Provides organization data and branding |

Component Relationships

```
App
├── OrganizationProvider
│   └── OrganizationLayout
│       ├── TaskList
│       │   ├── TaskItem (recursive)
│       │   │   └── TaskDropZone
│       │   └── TaskForm
│       └── TemplateList
│           ├── TemplateItem (recursive)
│           │   └── TaskDropZone
│           └── TaskForm
```


## Dev notes
### March 25 2025
Key Logic Components

1. Task Hierarchical Structure

Tasks and templates are stored in a flat structure but displayed hierarchically:
- **Top-level tasks/templates**: `parent_task_id === null`
- **Children**: filtered by matching `parent_task_id`
- **Ordering**: determined by `position` field

2. Drag and Drop System

The drag and drop system uses a custom hook (`useTaskDragAndDrop`):

The drop operation updates:
1. Frontend state (optimistic update)
2. Database state (API call)

Project Templates System

The template system allows creating reusable project structures:

1. **Creating Templates**: Same process as tasks but with `origin: "template"`
2. **Using Templates**: When creating a new project, user can select a template

Organization White-labeling

The `OrganizationProvider` enables white-labeling through:

1. **Route-based organization selection**: `/org/:orgSlug/*`
2. **Organization context**: fetch styles and logo from supabase and update the display
3. **Filtered data access**: All API calls for tasks filter by organization ID for data isolation