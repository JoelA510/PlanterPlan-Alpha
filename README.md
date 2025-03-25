PlanterPlan

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


