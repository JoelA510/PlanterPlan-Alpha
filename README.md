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
### April 15 2025
* ran into issue where tasks are loading after changing tabs and coming back to planter plan app
  * claude's solution: Task Context
* create account doesn't work
  * added new pages
  * need to make new page for "check you email"
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

