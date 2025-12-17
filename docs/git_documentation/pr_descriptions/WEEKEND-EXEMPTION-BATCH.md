# Weekend Exemption Batch (P1.4, P2, P3, P4.1)

## 0. Overview (TL;DR, 2–4 bullets)

- **Deep Copy Integration:** Users can now create new projects or subtasks by copying existing templates, with the full task tree cloned recursively.
- **Team Management:** Added "Joined Projects" section to the dashboard, supported by new RLS policies and a membership service, allowing users to view projects they are invited to.
- **Code Hygiene:** Refactored CSS imports to be component-specific and added comprehensive unit tests for date and search utilities.
- **Data Fixtures:** Introduced complex project fixtures to support future drag-and-drop development.

---

## 1. Roadmap alignment

### 1.x Roadmap item: P1-UI-COPY-WIRING - Copy Mode Integration (UI Layer)

- **Phase/milestone:** Phase 1 -> Master Library & Deep Copy
- **Scope in this PR:** Connected the Search component in `NewTaskForm` to the `deepCloneTask` service, enabling template copying.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P2-DB-RLS-POLICIES - Database RLS Policies

- **Phase/milestone:** Phase 2 -> Team Management & Joined Projects
- **Scope in this PR:** Added RLS policy `select_joined_projects` to allow users to view projects they are members of.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P2-SVC-MEMBERSHIPS - Membership Service

- **Phase/milestone:** Phase 2 -> Team Management & Joined Projects
- **Scope in this PR:** Implemented `getJoinedProjects` service to fetch projects for a user based on `project_members` table.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P2-UI-ROLE-INDICATOR - Role Indicator UI

- **Phase/milestone:** Phase 2 -> Team Management & Joined Projects
- **Scope in this PR:** Created `RoleIndicator` component to visually display user roles (Owner, Editor, Viewer).
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P2-UI-JOINED-SECTION - Dashboard "Joined" Section

- **Phase/milestone:** Phase 2 -> Team Management & Joined Projects
- **Scope in this PR:** Added a new section to the Dashboard to list joined projects, distinct from owned projects.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P3-CLEAN-DIRS - Directory Cleanup

- **Phase/milestone:** Phase 3 -> Code Hygiene
- **Scope in this PR:** Refactored CSS imports to be modular and component-specific, removing global imports from `index.css`.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P3-TEST-UTILS - Test Coverage Spike

- **Phase/milestone:** Phase 3 -> Code Hygiene
- **Scope in this PR:** Added unit tests for `dateUtils.js` and `highlightMatches.js`, achieving high coverage.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

### 1.x Roadmap item: P4-DATA-FIXTURES - Data Fixtures (Safety Net)

- **Phase/milestone:** Phase 4 -> The Date Engine & Drag-n-Drop
- **Scope in this PR:** Created `complexProject.json` fixture and a verification test to ensure it loads correctly.
- **Status impact:** Not started -> Complete
- **Linked tickets:** None

---

## 2. Changes by roadmap item

### 2.x P1-UI-COPY-WIRING - Copy Mode Integration (UI Layer)

**A. TL;DR (1–2 sentences)**

- Updated `NewTaskForm` and `TaskList` to handle template selection and trigger the deep clone process upon submission.

**B. 5W + H**

- **What changed:**
  The task creation flow now supports a "Copy" mode where selecting a template triggers a deep clone of that template's entire tree instead of creating a single blank task.

- **Why it changed:**
  To allow users to quickly instantiate complex project structures from templates, a core requirement of the Master Library feature.

- **How it changed:**
  Modified `NewTaskForm` to pass `sourceTemplateId` up to `TaskList`. `TaskList` checks for this ID and calls `deepCloneTask` (implemented in P1.3) to generate the new task tree, then inserts it into the database.

- **Where it changed:**
  `src/components/tasks/NewTaskForm.jsx`, `src/components/tasks/TaskList.jsx`

- **When (roadmap):**
  Phase 1 -> Master Library & Deep Copy (Complete)

**C. Touch points & citations**

- `src/components/tasks/NewTaskForm.jsx`: L124–130 -> Pass `sourceTemplateId` to `onSubmit` handler.
- `src/components/tasks/TaskList.jsx`: L221–255 -> Logic to handle `sourceTemplateId` in `handleCreateProject`, calling `deepCloneTask`.
- `src/components/tasks/TaskList.jsx`: L345–382 -> Logic to handle `sourceTemplateId` in `handleSubmitTask` (subtasks).

**D. Tests & verification**

- **Automated tests:**
  - None added for UI wiring (relying on existing service tests).

- **Manual verification:**
  - Environment: Local
  - Scenarios:
    - Created a new project from "Onboarding" template. Verified all subtasks appeared.
    - Added a subtask from a template. Verified it attached correctly to the parent.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Medium
- **Potential impact if broken:**
  - Task creation might fail or create incomplete trees.
- **Rollback plan:**
  - Revert changes to `NewTaskForm.jsx` and `TaskList.jsx`.

---

### 2.x P2-DB-RLS-POLICIES - Database RLS Policies

**A. TL;DR (1–2 sentences)**

- Added SQL policy to allow users to select tasks from projects they are members of.

**B. 5W + H**

- **What changed:**
  Users can now read tasks if their ID is present in the `project_members` table for that project.

- **Why it changed:**
  To enable shared project access, which was previously restricted to project owners.

- **How it changed:**
  Added `select_joined_projects` policy to `tasks` table in `policies.sql`.

- **Where it changed:**
  `docs/db/policies.sql`

- **When (roadmap):**
  Phase 2 -> Team Management (Complete)

**C. Touch points & citations**

- `docs/db/policies.sql`: L4–14 -> Added `select_joined_projects` policy.

**D. Tests & verification**

- **Automated tests:**
  - None (SQL only).

- **Manual verification:**
  - Environment: Local (simulated)
  - Verified policy syntax in editor.

- **Known gaps / follow-ups:**
  - Assumes `project_id` in `project_members` maps to root task ID.

**E. Risk & rollback**

- **Risk level:** High (Security)
- **Potential impact if broken:**
  - Users might see projects they shouldn't, or not see projects they should.
- **Rollback plan:**
  - Drop the policy `select_joined_projects`.

---

### 2.x P2-SVC-MEMBERSHIPS - Membership Service

**A. TL;DR (1–2 sentences)**

- Created a service to fetch projects a user has joined.

**B. 5W + H**

- **What changed:**
  New `getJoinedProjects` function fetches project details for projects where the user is a member.

- **Why it changed:**
  To provide the data needed for the "Joined Projects" dashboard section.

- **How it changed:**
  Queries `project_members` for IDs, then fetches those projects from `tasks` table.

- **Where it changed:**
  `src/services/projectService.js`

- **When (roadmap):**
  Phase 2 -> Team Management (Complete)

**C. Touch points & citations**

- `src/services/projectService.js`: L1–34 -> Entire file (new service).

**D. Tests & verification**

- **Automated tests:**
  - None added.

- **Manual verification:**
  - Environment: Local
  - Verified data fetching via UI integration.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - "Joined Projects" section will be empty or error out.
- **Rollback plan:**
  - Delete `src/services/projectService.js`.

---

### 2.x P2-UI-ROLE-INDICATOR - Role Indicator UI

**A. TL;DR (1–2 sentences)**

- Added a badge component to display user roles.

**B. 5W + H**

- **What changed:**
  New `RoleIndicator` component renders a styled badge based on the `role` prop.

- **Why it changed:**
  To give users visual context about their permissions in a shared project.

- **How it changed:**
  Created a functional component with CSS modules for styling.

- **Where it changed:**
  `src/components/common/RoleIndicator.jsx`, `src/styles/components/role-indicator.css`

- **When (roadmap):**
  Phase 2 -> Team Management (Complete)

**C. Touch points & citations**

- `src/components/common/RoleIndicator.jsx`: L1–15 -> New component.
- `src/styles/components/role-indicator.css`: L1–19 -> New styles.
- `src/components/tasks/TaskItem.jsx`: L109–110 -> Integrated `RoleIndicator`.

**D. Tests & verification**

- **Automated tests:**
  - None.

- **Manual verification:**
  - Environment: Local
  - Verified rendering in `TaskItem`.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - Visual glitch in role display.
- **Rollback plan:**
  - Revert changes to `TaskItem.jsx` and delete component files.

---

### 2.x P2-UI-JOINED-SECTION - Dashboard "Joined" Section

**A. TL;DR (1–2 sentences)**

- Added a section to the dashboard to display joined projects.

**B. 5W + H**

- **What changed:**
  The dashboard now has a "Joined Projects" section above "Templates".

- **Why it changed:**
  To allow users to access projects they don't own but are members of.

- **How it changed:**
  Updated `TaskList` to fetch joined projects on mount and render them using `TaskItem`.

- **Where it changed:**
  `src/components/tasks/TaskList.jsx`

- **When (roadmap):**
  Phase 2 -> Team Management (Complete)

**C. Touch points & citations**

- `src/components/tasks/TaskList.jsx`: L98–100 -> Fetch joined projects.
- `src/components/tasks/TaskList.jsx`: L639–665 -> Render "Joined Projects" section.

**D. Tests & verification**

- **Automated tests:**
  - None.

- **Manual verification:**
  - Environment: Local
  - Verified section appears and handles empty state.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - Dashboard might crash or display incorrect data.
- **Rollback plan:**
  - Revert changes to `TaskList.jsx`.

---

### 2.x P3-CLEAN-DIRS - Directory Cleanup

**A. TL;DR (1–2 sentences)**

- Refactored CSS imports to be component-specific.

**B. 5W + H**

- **What changed:**
  Components now import their own CSS files instead of relying on global imports in `index.css`.

- **Why it changed:**
  To improve code hygiene, modularity, and make it easier to track dependencies.

- **How it changed:**
  Commented out imports in `index.css` and added `import './styles/...'` to relevant JSX files.

- **Where it changed:**
  `src/styles/index.css`, `src/components/tasks/TaskItem.jsx`, `src/components/tasks/TaskDetailsView.jsx`, `src/components/tasks/TaskList.jsx`, `src/components/tasks/NewTaskForm.jsx`, `src/components/tasks/NewProjectForm.jsx`

- **When (roadmap):**
  Phase 3 -> Code Hygiene (Complete)

**C. Touch points & citations**

- `src/styles/index.css`: L11–19 -> Commented out imports.
- `src/components/tasks/TaskItem.jsx`: L4 -> Added import.
- `src/components/tasks/TaskDetailsView.jsx`: L4–5 -> Added imports.
- `src/components/tasks/TaskList.jsx`: L8–10 -> Added imports.
- `src/components/tasks/NewTaskForm.jsx`: L3–4 -> Added imports.
- `src/components/tasks/NewProjectForm.jsx`: L2–3 -> Added imports.

**D. Tests & verification**

- **Automated tests:**
  - None (Visual change).

- **Manual verification:**
  - Environment: Local
  - Verified styles still apply correctly in the UI.

- **Known gaps / follow-ups:**

## 📦 Changes

### 🔄 Deep Copy Integration (P1)

- **Implemented `deepCloneTask` service**: Recursively clones task trees (templates -> instances).
- **Updated `TaskList.jsx`**: Now supports creating projects from templates with full deep copy.
- **Updated `NewTaskForm.jsx`**: Captures template ID for subtask cloning.
- **Added `treeHelpers.js`**: Utilities for ID remapping and tree preparation.
- **Unit Tests**: Added comprehensive tests for `deepCloneTask` and `treeHelpers`.

### 👥 Membership & Joined Projects (P2)

- **Created `projectService.js`**: Added `getJoinedProjects` to fetch projects where user is a member.
- **Updated RLS Policies**: Added `select_joined_projects` policy to `docs/db/policies.sql`.
- **UI Integration**: Added "Joined Projects" section to `TaskList.jsx` dashboard.
- **Role Badges**: Created `RoleIndicator` component to display "Owner", "Editor", or "Viewer" roles.

### 🔍 Master Library Search (Fix)

- **Hardened Search**: Improved error handling in `useMasterLibrarySearch.js` and `MasterLibrarySearch.jsx`.
- **Test Coverage**: Added unit tests for search failure scenarios and highlight logic.

### 🛠 Local Development

- **Documentation**: Created `docs/local_development.md` with setup, linting, and testing instructions.
- **Testing Guide**: Added instructions for manually testing membership features locally.

## 🧪 Verification

- **Automated Tests**:
  - `npm test src/services/taskService.test.js` (Deep copy, Search)
  - `npm test src/utils/treeHelpers.test.js` (Tree logic)
  - `npm test src/utils/highlightMatches.test.js` (Search highlighting)
- **Manual Verification**:
  - Verified "Joined Projects" section renders correctly.
  - Verified deep copy logic via unit tests mocking Supabase.
    / follow-ups:\*\*
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - Styles might be missing.
- **Rollback plan:**
  - Uncomment imports in `index.css` and remove imports from components.

---

### 2.x P3-TEST-UTILS - Test Coverage Spike

**A. TL;DR (1–2 sentences)**

- Added unit tests for utility functions.

**B. 5W + H**

- **What changed:**
  Added `dateUtils.test.js` and `highlightMatches.test.js`.

- **Why it changed:**
  To ensure reliability of core utility functions and prevent regressions.

- **How it changed:**
  Created Jest test files with comprehensive test cases.

- **Where it changed:**
  `src/utils/dateUtils.test.js`, `src/utils/highlightMatches.test.js`

- **When (roadmap):**
  Phase 3 -> Code Hygiene (Complete)

**C. Touch points & citations**

- `src/utils/dateUtils.test.js`: L1–60 -> New test file.
- `src/utils/highlightMatches.test.js`: L1–47 -> New test file.

**D. Tests & verification**

- **Automated tests:**
  - Added.
  - `src/utils/dateUtils.test.js`
  - `src/utils/highlightMatches.test.js`

- **Manual verification:**
  - Ran `npm test` and verified all passed.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - None (Tests only).
- **Rollback plan:**
  - Delete test files.

---

### 2.x P4-DATA-FIXTURES - Data Fixtures (Safety Net)

**A. TL;DR (1–2 sentences)**

- Created a complex project fixture for testing.

**B. 5W + H**

- **What changed:**
  Added `complexProject.json` and a verification test.

- **Why it changed:**
  To provide a realistic data set for testing upcoming complex features like drag-and-drop.

- **How it changed:**
  Created a JSON file with nested tasks and a test to verify it loads.

- **Where it changed:**
  `src/tests/fixtures/complexProject.json`, `src/tests/fixtures/fixtures.test.js`

- **When (roadmap):**
  Phase 4 -> The Date Engine & Drag-n-Drop (Complete)

**C. Touch points & citations**

- `src/tests/fixtures/complexProject.json`: L1–35 -> New fixture.
- `src/tests/fixtures/fixtures.test.js`: L1–10 -> New test.

**D. Tests & verification**

- **Automated tests:**
  - Added `src/tests/fixtures/fixtures.test.js`.

- **Manual verification:**
  - Ran `npm test`.

- **Known gaps / follow-ups:**
  - None.

**E. Risk & rollback**

- **Risk level:** Low
- **Potential impact if broken:**
  - None.
- **Rollback plan:**
  - Delete fixture files.

---

## 3. Cross-cutting changes (if any)

- **Type:** Lint cleanup
- **Scope:** `src/components/tasks/TaskDetailsView.jsx`
- **Rationale:** Fixed a lint error caused by an accidental markdown fence in the file.
- **Touch points (optional):**
  - `src/components/tasks/TaskDetailsView.jsx`: L1 -> Removed markdown fence.

---

## 4. Implementation notes for reviewers (optional)

- **Deep Clone Logic:** The deep clone logic was implemented in `TaskList.jsx` to leverage existing state and position calculation logic. This might be refactored into a hook later.
- **RLS Assumptions:** The `select_joined_projects` policy assumes that `project_id` in `project_members` refers to the root task ID. This is a simplification that works for the current schema but might need adjustment if the project structure changes.
- **CSS Refactor:** The CSS refactor is a step towards better component isolation. Future components should follow this pattern.

---

## 5. Checklist

- [x] All changes are mapped to a roadmap item (from `roadmap.md`) or explicitly marked as cross-cutting
- [x] Touch points and line ranges added for each meaningful change hunk
- [x] TL;DR provided for each roadmap item
- [x] What / Why / How / Where / When (roadmap) documented
- [x] Automated tests added/updated where appropriate
- [x] Manual verification performed (or rationale if not)
- [x] Breaking changes, if any, are documented and communicated
- [x] Rollback plan is defined and feasible
- [x] Linked tickets (if any) are referenced and updated as needed
