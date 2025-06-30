# Developer Notes

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
        - Extract Task Creation Logic
        - Extract Template-to-Project Conversion
        - Extract Task Deletion Logic
        - Extract Task Update Logic
        - Extract Drag & Drop Operations

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

