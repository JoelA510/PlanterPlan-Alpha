# Developer Notes
## July 23
- master library search bar: the searching capability is done. 
- next step: prompt:
I would like to redo the buttons that appear for the search results for master library search.
There are two user flows:
* User wants to view a task from the master libary:
   * User uses search bar to search for a master library task. When results popoulate, each result will have a "view task" button to view the template. 
   * if user clicks the button, it will show the task details in the panel
      * this should use the task context's template tasks to get the infromation, not the view and without querying supabase. 
* user wants to copy a master library task and add it to a template
   * user wants to add a child task and the template task form is on the side panel.
   * user searches for task in master libary and results show.
   * on each task result, there is a button that says "Copy to new task". the "view task" button doesn't show at this point. 
   * if user clicks that button, the new template task form populates with the same info from the master library task. Again, this infor should be gathered from the task context without using the view or making a query to supabase 
give me a step by step plan divided into PRs and commits for each PR. dont give me any code yet

- context:
src/components/MasterLibrary/MasterLibrarySearchBar.js
src/components/TaskForm/CreateNewTemplateForm.js
src/components/TaskForm/NewProjectForm.js
src/components/TaskForm/TaskForm.js
src/components/TaskForm/TemplateTaskForm.js
src/components/TaskForm/useTaskForm.js
src/components/TaskForm/useTemplateTaskForm.js
src/components/TemplateList/TemplateDetailsPanel.js
src/components/TemplateList/TemplateItem.js
src/components/TemplateList/TemplateList.js
src/components/contexts/TaskContext.js
src/hooks/useTaskCreation.js
src/services/taskService.js
src/utils/taskUtils.js

- roadmap for the buttons for search results (after asking Claude to make it simpler):
PR 1: Add Flow Detection to MasterLibrarySearchBar
Commit 1: Add mode prop and conditional buttons

- Add mode prop ('view' | 'copy') to MasterLibrarySearchBar
- Replace current buttons with conditional rendering:

- View mode: Show "View Task" button only
- Copy mode: Show "Copy to New Task" button only


- Add onViewTask and onCopyTask callback props

Commit 2: Implement task data lookup from context

- Use useTasks hook to access templateTasks
- Create helper to find actual task data from search results
- Pass real task data to callbacks instead of search result data

PR 2: Update TemplateList for View Flow
Commit 1: Configure search bar for view mode

- Set mode="view" on the search bar in TemplateList
- Add onViewTask handler that calls selectTask
- Remove old onCreateFromTemplate integration

PR 3: Update TemplateList for Copy Flow
Commit 1: Detect copy mode and populate form

- When TemplateTaskForm is showing, render search bar with mode="copy"
- Add onCopyTask handler that populates the form with task data
- Update form state management to handle pre-populated data

Commit 2: Clean up and test

- Remove unused master library state and handlers
- Test both view and copy flows
- Add error handling for missing task data

## July 10 [Tim]
- add the hyper linking capability to resources
- able to do it for project task list
- Template tasks are not working (updating after editing and adding child task)

## July 8 [Tim]
- reprompted Claude: I want to continue implementing team management. 
right now a project owner can invite other users to join the project with a specific role in mind, and those users are able to accept those invitations and join the project. the project member ship table in supabase is update when the user accepts.  
  - included these in the context: TaskList, TaskItem, TaskContext, the rest of the /TaskList directory, 
      also the team_management service and task Service
  - it gave me a ton of code
  - updated TaskDetails, TaskList, TaskItem, TaskContext
-    bugs:
  - duplicate tasks
    - Claude made changes to TaskContext, task service, bcc service


the next step is for a user who is a member of another project to be able to view projects that they have joined. I want this to be viewed in the same projects page, as a separate section underneath the  projects the user owns. the project and all of its tasks should be viewable, and should utilize the task list and task item components.

- the prompt worked and it came up with changes to implement it. 
  - ! might need to refactor this later
## July 7th [Tim]
# Show Joined Projects Feature - Implementation Roadmap

## Phase 1: Database Layer (2 PRs)

### **PR #1: Database Schema & Queries**
- [ ] Create `getProjectMemberships()` function in `src/utils/teamManagement.js`
- [ ] Create `getProjectsByIds()` function to fetch multiple projects efficiently in `src/utils/teamManagement.js`
- [ ] Create `getUserProjectRole()` helper function in `src/utils/teamManagement.js`

### **PR #2: Project Membership Service**
- [ ] Create `ProjectMembershipService` class in `src/services/ProjectMembershipService.js`
  - [ ] Add `getJoinedProjects(userId)` method to new service
    - [ ] gets project ids and user roles
- [ ] Add membership role constants to `src/utils/constants.js`
- [ ] Add error handling and logging throughout service

## Phase 2: UI Components (2 PRs)

### **PR #3: Project Role Indicator Component**
- [ ] Create `ProjectRoleIndicator` component in `src/components/ProjectRoleIndicator.jsx`
  - [ ] Add role icons and tooltips to component
  - [ ] Roles: Project Owner, Full User, 
- [ ] Export new component in `src/components/index.js`

### **PR #4: Enhanced Project Display**
- [ ] Update `TaskItem` component to show role indicator
- [ ] Update project list layout in `TaskList.js` to accommodate role indicators
- [ ] Ensure consistent spacing and alignment in project list

## Phase 3: State Management & Integration (1 PR)

### **PR #5: Projects State & Filtering**
- [ ] Update projects context in `TaskContext.js` to handle joined projects
- [ ] Add `joinedProjects` state in context
- [ ] Create `loadJoinedProjects()` action in projects context
- [ ] Update loading states and error handling in `src/hooks/useProjects.js`
- [ ] Update main projects page in `TaskList` to use new state


Maybe later:
- [ ] Implement caching for membership data in service
---


## July 7th 

- still not clear why it's not working 
- maybe I need to not update Supabase and just focus on the UI first
- ok so I created a toy example with Claude, and it's able to implement the drag and drop with correctly updating dates 
  - however, once we add milestones into the mix then it starts breaking
    - this seems to suggest the issue arises with milestones
- the issues appears to be that TaskList.js uses HTML5 DropZone but wraps everything in @dnd-kit DndContext. This creates incompatible event systems.
- [x] TaskList.js
  1. Remove all @dnd-kit imports (DndContextProvider, SortableTaskWrapper)
  2. Replace custom HTML5 DropZone with proper HTML5 drop zones
  3. Remove DndContextProvider wrapper entirely
  4. Simplify handleDragEnd to direct state updates (like toy example)
  5. Remove complex async chain (fetchTasks, recalculateAllDates calls)
  6. Add direct date recalculation after reordering
  7. Replace renderTasksWithDropZones() with HTML5 version
  8. Remove useSimpleDragHandler integration
- [x] TaskItem.js  
  1. Add draggable={!isTopLevel} attribute to main div
  2. Add onDragStart, onDragEnd, onDragOver, onDrop handlers
  3. Add drag visual feedback (opacity, transform effects)
  4. Remove any @dnd-kit related props or logic
  5. Add drag handle visual indicator (⋮⋮ or ☰ icon)
  6. Add hover states for drag operations
- [x] remove useSimpleDragHandler.js bc we integrate logic directly into TaskList.js
- [x] TaskContext.js
  1. Remove any @dnd-kit related integration callbacks
  2. Add optimistic update helper functions
  3. Simplify drag-related context methods
  4. Remove complex async coordination for drag operations
  5. Add direct state update methods for immediate UI feedback
- [x] src/components/TaskList/HTML5DragDropZone.js
  1. Create based on our toy example DropZone component
  2. Handle 'between' and 'into' drop types
  3. Visual feedback during drag operations
  4. Proper event handling (dragOver, drop, dragLeave)
  5. Integration with TaskList positioning logic
- [x] TaskList.css
  1. Add drag states (.dragging, .drag-over, .drop-target)
  2. Add insert line animations (@keyframes)
  3. Add drop zone visual feedback
  4. Add smooth transitions for reordering
  5. Add touch-friendly drag handles
- [x] src/utils/dragUtils.js
  1. Extract reusable drag & drop logic
  2. Position calculation helpers
  3. Visual feedback utilities
  4. Touch device detection and polyfills
  5. Accessibility helpers for keyboard navigation
- [x] src/utils/dragVisualFeedback.js
  1. Insert line animations and positioning
  2. Drag overlay styles and effects
  3. Hover state management
  4. Drop zone highlighting logic
  5. Smooth transition utilities
- [x] sparsePositioning.js
  1. Keep all existing logic (it's good!)
  2. Update any @dnd-kit specific event parsing
  3. Ensure compatibility with HTML5 event structure
  4. Add helper for HTML5 dataTransfer integration

- ok let's see if we can further refactor drag-n-drop

## July 2nd [Lorenzo]

- ok let's focus on the drag and drop
  - let's only give the relevant files to Claude

- lets make a to-do list 

- ok so let's stablize drag-n-drop
  - Current flow
    - Drag → Optimistic Update → Database Update → Maybe Date Calc → Maybe Refresh
  - New Flow
    - Drag → Database Update → Refresh Tasks → Recalculate All Dates → Done
  - elements
    - drag handler shoudl only do one thing
    - a single post-move hook
    - clean up Date Cache System
    - simplify position management
    - remove separate detection logic


## June 30th [Lorenzo]

- ok, the first Deep Work set is just orientation
  - I had to setup the .env file, now Supabase works

- ok I created a new admin user for myself

- now let's try to push a simple commit moving the devleoper notes into its own separate file
    - ok that worked

- what's interesting is that I was able to use Repomix to compress the repo to feed into Claude
    - I selected `compress-code` and `remove comments` and added `*.json, *.lock` to "Ingore Patterns"

- ok let's start implementing the search bar   
    - let's drop the LLM idea for now, and focus on a radically simpler smart-filter-based search 

- ok now let's do the date engine
    - the template itself has the info to help with dates, but right now we are using duration (how long tasks and their children take) but the updates are not working well
    - Claude seems to think it's because date calculations are happenign at differen times (drag&drop, task updates, component re-renders)
        - also `position` determines the visual order but date calculations assume sequential execution
        - database the source of calculated values, but then drag & drop changes need to update the database immediately, creating sync complexity.
        -  Parent durations are calculated from children, but if children dates change, parent durations need to recalculate. This creates a cascade that's hard to manage.
    - on one hand, we need to do a database change, but then we having to wait for that is slow, hence the optimistic update but that's what creates the inconsistency 
        - we need a TaskContext cache that stores a hash of current task structure to detect changes 
        - For drag & drop (position change)
            - Identify which tasks are affected (the moved task + its siblings in new position)
            - Only recalculate dates for those tasks
            - Leave all other cached dates unchanged
        - For duration change
            - Identify affected tasks (the changed task + all its descendants + parent chain)
            - Recalculate only that branch
            - Leave unrelated branches cached
        - For hierarchy change (parent_task_id)
            - Affects old parent branch + new parent branch
            - Recalculate both affected branches
    - date updates are not happening but at least we have solid architecture now

- let's take a moment to refactor TaskContext.js
    - Move large, self-contained operations to custom hooks
        - useTaskCreation - handles all create logic including validation
        - useTaskDeletion - handles deletion with cascading effects
        - useTaskDragDrop - drag and drop operations
        - useTemplateToProject - template conversion logic
    - let's break it down into incremental steps
        - Step 1: Extract Task Creation Logic
            - Target: useTaskCreation hook
            - Move createNewTask function and all its complexity
            - Handle license validation, positioning, date calculations
            - Simplify NewProjectForm, TaskForm, TemplateProjectCreator
        - Step 2: Extract Template-to-Project Conversion
            - Target: useTemplateToProject hook
            - Move createProjectFromTemplate and getAllTemplateTasksInHierarchy
            - Handle the complex hierarchy creation and date calculations
            - Simplify TemplateProjectCreator, UseTemplateForm
        - Step 3: Extract Task Deletion Logic
            - Target: useTaskDeletion hook
            - Move deleteTaskHandler with all its error handling
            - Handle cascade deletion, hierarchy updates, date recalculation
            - Simplify TaskList, TaskDetailsPanel, TemplateList
        - Step 4: Extract Task Update Logic
            - Target: useTaskUpdate hook
            - Move updateTaskHandler and updateTaskDates
            - Handle template vs instance differences, date propagation
            - Simplify TaskForm, TemplateTaskForm, TaskDetailsPanel
        - Step 5: Extract Drag & Drop Operations
            - Target: useTaskDragDrop hook (enhance existing)
            - Move updateTaskAfterDragDrop and related logic
            - Integrate with existing drag-drop hook better
            - Simplify TaskList, TemplateList
    - TaskContext is now a thin coordinator that provides integration, while all the complex logic lives in focused hooks.

- ok let's get back to the date engine
    - the best approach seems to be use to use dnd-kit I.E. an external React library that takes care of drag and drop
    - overall, there are too many places where the drag and drop logic needs to be updated. This makes me think that I should refactor it to simplify it
        - ideally if we change dnd logic, we'd update it once and it would propagate everywhere
    - the issue might be that the old logic is still in the subtasks

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

