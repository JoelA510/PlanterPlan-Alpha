- [ ] User Experience
  - [ ] Project Templates & Hierarchy
    - [ ] Phases
    - [ ] Milestones (major accomplishments)
    - [ ] Tasks (action items)
    - [ ] Subtasks
  - [ ] Due Date Engine
    - [ ] Set project start/end dates
    - [ ] Auto-assign relative due dates
    - [ ] Milestone/Phase date inheritance
    - [ ] Nightly status updates
  - [ ] Team Management
    - [ ] Invite users
    - [ ] manage users
    - [ ] Permission levels:
      - [ ] Project Owner
      - [ ] Full User
      - [ ] Limited User
      - [ ] Coach

            | Project Owner | can view and edit any task in the project, edit project settings, and invite other project users. |
            | --- | --- |
            | Full User | can view and edit any task in the project. |
            | Limited User | can view any task but can only edit their own assigned tasks. |
            | Coach | can view any task but can only edit coaching tasks. |

  - [ ] Project Customization (LLM integration solves this)
    - [ ] Add/delete custom tasks
    - [ ] Manage master task library
    - [ ] Mark tasks as N/A
    - [ ] When adding a custom task, the Master Library of tasks should also display for the user to select from at their option
    - [ ] Send ‘new project’ notification email to System Admin, including project details
    - [ ] Create secondary projects
  - [ ] Task Views (search bar)
    - [ ] Priority view
    - [ ] Status-based views
    - [ ] Organization views
    - [ ] Personal views

  - [ ] Project Status Reports
    - [ ] dropdown to change the reporting month
    - [ ] progress donut chart with legend
    - [ ] list of Milestones Completed during the reporting month
    - [ ] list of Milestones Overdue as of the end of the reporting month
    - [ ] list of Milestones Due the month after the reporting month
  - [ ] Project Settings
    - [ ] Name
    - [ ] location
    - [ ] Start/end dates
    - [ ] 'Due soon' settings
    - [ ] apply license to new project

  - [ ] Progress Tracking UI
  - [ ] Task Details
    - [ ] Dates and assignments
    - [ ] Task information
    - [ ] Actions and resources
    - [ ] Task management
  - [ ] Resource Library
  - [ ] Account Management
    - [ ] Create and manage user accounts
    - [ ] Change email and password
  - [ ] Store with Stripe Integration
  - [ ] Checkpoint System
    - PlanterPlan offers a template based on ‘checkpoints’ that unlocks the first Phase of Milestones and Tasks, then unlocks the next Phase when all the tasks in the previous Phase have been completed; this interface has no due dates but instead a donut chart for each Phase (see Screenshot 3 in Exhibit C below)

```markdown
Looking at this codebase, I can see it's a task management application called PlanterPlan. Here's a comprehensive breakdown of what the app does and its key architecture:What the App DoesPlanterPlan is a hierarchical project and task management system with template capabilities and white-label support for organizations. Here's what it offers:Core Features:

Project & Task Management

Create projects with nested tasks in a hierarchical structure
Drag-and-drop reordering of tasks
Task completion tracking with checkboxes
Due dates, durations, and sequential scheduling
Resource and action tracking for each task

Template System

Create reusable project templates
Convert templates into active projects
Master library for sharing templates across the organization
Copy templates to create new tasks

Team Collaboration

Project invitations with role-based permissions (owner, full_user, limited_user, coach)
Member management for projects
View projects you own vs projects you're a member of

White-Label Organizations

Support for multiple organizations with custom branding
Custom colors, logos, and fonts per organization
Data isolation between organizations
Admin panels for organization management

Resource Management

Create and manage resources (documents, links, etc.)
Tag-based organization
URL detection and hyperlinking

Key Architecture ComponentsFrontend ArchitectureThe app uses React with a context-based state management pattern:App
├── AuthProvider (Authentication context)
│ └── TaskProvider (Task data context)
│ └── OrganizationProvider (Organization context)
│ └── Layout (Varies by user type)
│ ├── TaskList (Main project view)
│ ├── TemplateList (Template management)
│ └── Settings/Admin panelsState Management Approach
Context Providers for global state:

AuthContext - User authentication and roles
TaskContext - All task/project data and operations
OrganizationContext - Organization branding and settings
SearchContext - Search functionality

Custom Hooks for business logic:

useTaskCreation - Task creation logic
useTaskDeletion - Deletion with cascade handling
useTaskUpdate - Update operations
useTemplateToProject - Template conversion
useMasterLibrary - Library management
useTaskDates - Date calculations and caching

Data Flow PatternThe app follows a consistent pattern:
User Action → Component Handler → Custom Hook → Service Layer → Supabase API
↓
Context Update ← Integration CallbackKey Technical Decisions
Optimistic Updates for Drag & Drop

Immediate UI updates without waiting for API
Background sync with error fallback
Uses HTML5 drag-and-drop API

Date Management System

DateCacheEngine for efficient date calculations
Sequential task scheduling with automatic date propagation
Parent duration calculated from children

Sparse Positioning System

Tasks use sparse position values (1000, 2000, etc.)
Allows reordering without updating all siblings
Renormalization when gaps get too small

Permission System

Role-based access control at project level
UI elements show/hide based on permissions
Server-side validation through Supabase RLS

Database SchemaThe app uses Supabase (PostgreSQL) with these main tables:

users - User accounts with organization associations
tasks - Both projects and tasks (hierarchical)
white_label_orgs - Organization settings
licenses - License management for project creation
project_memberships - Team collaboration
resources - Shared resources
master_library_tasks - Template sharing
Notable Implementation Details
Task Hierarchy: Tasks and templates are stored flat but displayed hierarchically using parent_task_id

Dual Purpose Tasks Table: The same table stores both active tasks (origin: 'instance') and templates (origin: 'template')

License System: Users get one free project, then need licenses for additional projects

White-Label Routing: Organizations accessed via /org/:orgSlug/\* routes with automatic branding application

Error Handling: Each operation has its own error state and fallback logic, particularly important for date calculations
The architecture shows a mature, well-structured application with clear separation of concerns, comprehensive error handling, and thoughtful optimization strategies for common operations like drag-and-drop.Claude can make mistakes. Please double-check responses.
```

# August 13, 2025

- Main objectives for Joel:
  - Take a look at the documentation (task-management-notes)
    - Let me know if it was helpful or not!
  - Fix tasks functionality
    - adding tasks, editing tasks, drag and drop tasks, removing tasks
      - Might be able to fix it if we fix the date engine
    - reference to main page major todos before launch
      - [ ] Task functionality
        - [x] Add task
        - [x] edit task
        - [x] Remove task
        - [ ] Add template task
          - need to refresh to do it
        - [ ] Edit template task
          - Error: Task not found
        - [ ] remove template task
          - Infinite loop somewhere

  - Date Engine
    - updating all other tasks when a given task’s date info is changed
    - Consider how template date work
      - templates don’t have actual start or due dates
      - when a project is instantiated from a template:
        - a template (in supabase, the template tasks have: origin = template) is basically copied but the copy is considered an actual project (in supabase, project tasks have: origin = instance).
          - maybe we could change origin = instance to origin = project (up to you)
        - the start and due dates need to be determined based on template’s durations and days from start
    -
    - reference to main page’s Major to do before launch
      - [ ] Date engine
        - [ ] Template has info to help with dates
          - [ ] Right now (feel free to scrap): it’s a duration (how long tasks take, how long children tasks take )
        - [ ] Making a project from template instantiates correct dates
        - [ ] Adding task, deleting task, reordering task should have correct effects on relevant task dates
        - [ ] Editing task dates has correct effect on relevant task dates
        - [ ] Try this: don’t update start date and end date just update the hierachy order

  - Shifting project list to the side navigation bar, so that you see only one project at a time
    - reference to main page Major todo before launch
      - [ ] Projects page:
        - [ ] nav bar: move list of projects to the nav bar

- Other notes
  - We’ll use this page as reference for your objectives are and jot down notes from when we meet
    - feel free to also ask questions in comments, jot down your progress, etc
  - text me when you push a commit/branch
    - I’ll look over it if i have time, and then I’ll merge it with the main
  - feel free to text me for any questions or updates
  - If you we merge something to main that breaks something else, it should be okay and we’ll fix it later; we can probably avoid it by using branches
  - Feel free to scrap however much you want (don’t hesitate to ask if you are unsure)
    - I think keeping the Task Context to manage all tasks makes sense and keeping many of the task related components themselves also. But changing handlers and hooks within them is probably needed.
