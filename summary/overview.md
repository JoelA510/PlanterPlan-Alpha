# Task Management App Codebase Summary

## Overview
This is a React-based web application for task and project management, integrated with Supabase for backend services (confirmed by `supabaseClient.js` and services using Supabase ops across tables like 'tasks', 'licenses', 'resources', 'users', 'white_label_orgs', 'project_invitations', 'project_memberships', 'master_library_tasks'). The app supports user authentication (sign up/in/out, reset, profiles), task CRUD (hierarchies, positions, dates, completions, master library), templates (lists/items/details/forms for creation/projects from templates with name/date/license), resources (documents/links CRUD/validation), reports (stats/exports), invitations/teams (memberships/roles), licensing (keys for project limits, entry form, management with generate/filter/copy), and white-labeling (orgs with colors/fonts/logos, list/select/details with admin/colors/subdomain). Additional features include user settings (profile/notifications/licenses), appearance settings (colors/fonts/logos for org branding), admin settings (tabs for general/appearance with org/users/billing management placeholders), license management UI (display available/used licenses with dates/status, generate bulk), and organization-specific UI (headers with links, app routing, logos, settings for logo upload/validation, selectors for org lists, white-label org list with details/edit/manage).

From the pseudocode, tasks are managed via lists (hierarchies with expand/drag-drop/add child/refresh/search results), items (headers with titles/durations/details/add child), details panels (views/edits with fields like purpose/actions/resources/start/due), forms for tasks/templates/projects (with hooks for logic like date modes/array fields/validation/preparation), and drag-drop zones (between/into with hover/active styles/animations/debug). Integrates with tasks (origin 'instance'/'template', hooks for create/update/delete/dates/drag), auth/org for scoping, utils for dates/levels/colors/drags/positions, services for task CRUD. Settings extend with user/admin panels for personalization, and organization components enhance white-labeling (fetch/update logos as SVG, selectors with links, headers with nav, app with routing/sidebar/dashboard). Licensing extends with entry form (apply key), manager (fetch/filter by status/org/search, generate bulk, copy keys), and org list (fetch/select/view details with logo/colors/font/admin/subdomain/created, actions edit/manage licenses/delete).

**Key Technologies/Assumptions:**
- Frontend: React (hooks/contexts/memoization, forms with validation/submit/modes, drag-drop HTML5, routing with react-router-dom).
- Styling: Tailwind CSS (bg/padding/radius/shadow/border/flex/gap/opacity/transition/cursor/anim in components/css).
- Backend: Supabase (auth/DB with RLS for scoping, views like 'master_library_view').
- State Management: Contexts/hooks; local state (expanded/selected/adding/submitting/status/error/dateMode/isManualUpdate/loading/saving/logoFile/preview).
- Optimizations: Recursive rendering for hierarchies, drag-drop with utils, filtered/sorted arrays.
- Other: Confirm deletes, error/status messages, date formatting/validation (modes: calculateEndDate/duration), array fields (actions/resources), disabled during submit, SVG logo handling/validation.

This summary incorporates all provided pseudocode: contexts, hooks, utils, resources, services, templates, tasks (HTML5DragDropZone.js, TaskList.js, TaskList.css, TaskDetailsPanel.js, TaskItem.js, TaskUIComponents.js, TaskForm.js, TemplateTaskForm.js, NewProjectForm.js, useTemplateTaskForm.js, useTaskForm.js, CreateNewTemplateForm.js), settings (UserSettings.js, AppearanceSettings.js, AdminSettings.js, LicenseSection.js), organization (OrganizationHeader.js, OrganizationApp.js, OrganizationLogo.js, OrganizationSettings.js, OrganizationSelector.js), and now license (LicenseKeyEntry.js, LicenseManager.js, WhiteLabelOrgList.js). License components add UI for key entry/application, management (bulk generate/filter/copy), and org list (select/details/actions).

## Directory Structure Breakdown

### `public/`
- Static assets and entry points:
  - `index.html`: Main HTML template.
  - `manifest.json`: For PWA capabilities.
  - `robots.txt`: SEO/search engine instructions.

### `src/`
- **components/**: UI building blocks, organized by feature areas.
  - **Admin/**: Administrative tools, e.g., `LicenseManager.js` for handling licenses, `WhiteLabelOrgList.js` for org list/details.
  - **contexts/**: React contexts for global state (detailed below).
    - `AuthContext.js`: Manages user authentication, roles, and info.
    - `OrganizationProvider.js`: Handles organization data, white-labeling, and defaults.
    - `SearchContext.js`: Provides search filters and filtered task results.
    - `TaskContext.js`: Central task management, including fetching, CRUD, and integrations.
  - **License/**: License-related UI, e.g., `LicenseKeyEntry.js` for key entry form.
  - **Login/**: Authentication pages and components:
    - Forms for login, registration, password reset.
    - `ProtectedRoute.js`: Route guarding for authenticated access.
  - **MasterLibrary/**: Search bar for a master library (possibly templates or resources).
  - **Organization/**: Organization-specific UI for white-labeling.
    - `OrganizationHeader.js`: Header with nav links and user info.
    - `OrganizationApp.js`: App wrapper with routing and sidebar.
    - `OrganizationLogo.js`: Logo display with fallback.
    - `OrganizationSettings.js`: Settings form for logo upload.
    - `OrganizationSelector.js`: List of organizations with links.
  - **Reports/**: Reporting features:
    - Subfolder `types/` with filters and UI components.
    - Components for milestones, month selection, charts (e.g., `ProgressDonutChart.js`), and project status.
  - **Resources/**: Resource management.
    - `ResourceDetailsPanel.js`: Details view for selected resource.
    - `ResourceForm.js`: Form for create/edit.
    - `ResourceItemComponent.js`: List item UI.
    - `ResourcesPage.js`: Main page with list/details.
    - `resourceTypes.js`: Constants/helpers for formats/labels/icons/colors/validation.
    - `ResourceUIComponents.js`: Shared UI (e.g., badges, empties).
  - **Search/**: General search UI.
  - **Settings/**: User and admin settings, including appearance and licenses.
    - `UserSettings.js`: User profile, notifications, licenses.
    - `AppearanceSettings.js`: Edit organization appearance (colors, font, logo).
    - `AdminSettings.js`: Admin panel with tabs (general, appearance).
    - `LicenseSection.js`: Display available/used licenses.
  - **TaskForm/**: Forms for creating/editing tasks, templates, and projects (detailed below from pseudocode).
    - `CreateNewTemplateForm.js`: Form for new templates.
    - `NewProjectForm.js`: Form for new projects.
    - `TaskForm.js`: Form for tasks.
    - `TemplateTaskForm.js`: Form for template tasks.
    - `useTaskForm.js`: Hook for task form logic.
    - `useTemplateTaskForm.js`: Hook for template task form logic.
  - **TaskList/**: Task listing (detailed below from pseudocode).
    - `HTML5DragDropZone.js`: Drag-drop zones.
    - `TaskDetailsPanel.js`: Details panel for tasks.
    - `TaskItem.js`: Individual task item.
    - `TaskList.css`: Styles for task list/drag-drop.
    - `TaskList.js`: Main task list page.
    - `TaskUIComponents.js`: Shared UI for tasks.
  - **TemplateList/**: Template management.
    - `TemplateDetailsPanel.js`: Details/edit panel for templates.
    - `TemplateItem.js`: Recursive item in template list.
    - `TemplateList.js`: Main template list page with create/refresh/expand/select.
  - **TemplateProject/**: Project creation from templates.
    - `TemplateProjectCreator.js`: Form for selecting template and creating project.
    - `UseTemplateForm.js`: Form for creating project from specific template.
  - Shared: `DefaultHeader.js`, `Header.js`, `Layout.js`, `NotFound.js`, etc., for common UI elements.

- **hooks/**: Custom React hooks for reusable logic (detailed below).
  - `useInvitations.js`: Manages project invitations and pending user invites.
  - `useLicenses.js`: Handles license fetching, application, and project creation limits.
  - `useMasterLibrary.js`: (Not detailed yet; likely for template library).
  - `useMasterLibrarySearch.js`: (Not detailed yet).
  - `useReportData.js`: (Not detailed yet; for report fetching).
  - `useTaskCreation.js`: Logic for creating tasks/projects with date enhancement and license checks.
  - `useTaskDates.js`: Date calculations with caching for tasks.
  - `useTaskDeletion.js`: Recursive task deletion with hierarchy updates.
  - `useTasksByDateRange.js`: (Not detailed yet; likely filters tasks by dates).
  - `useTaskUpdate.js`: Task updates handling various change types (dates, durations, positions).
  - `useTemplateToProject.js`: Converts templates to projects, preserving hierarchy.

- **services/**: API/service layers, wrapping Supabase calls (detailed below).
  - `authService.js`: Auth ops (sign up/in/out, reset, profile).
  - `invitationService.js`: Invitation CRUD (create/get/accept/decline/revoke).
  - `licenseService.js`: License gen/validate/mark used, project creation checks.
  - `organizationService.js`: Org fetch/create/update/delete.
  - `reportService.js`: Report generation/fetch (tasks/stats/exports).
  - `resourceService.js`: Resource fetch/create/update/delete, tags.
  - `taskService.js`: Task fetch (all/descendants/projects), CRUD, stats, master library.
  - `teamManagementService.js`: Membership add/update/remove, get stats/roles/projects.

- **utils/**: Helper functions (detailed below).
  - `DateCacheEngine.js`: Class for caching task dates with dependency maps and change detection.
  - `dateUtils.js`: Date calculations, formatting, and hierarchy updates.
  - `dragUtils.js`: Drag-and-drop helpers with HTML5/touch/keyboard support.
  - `sequentialTaskManager.js`: Sequential date/duration updates for hierarchies.
  - `sparsePositioning.js`: Sparse position calculations and validations.
  - `taskUtils.js`: Task-specific utils like date formatting, levels, descendants.

- Root files: `App.js` (main app component), `index.js` (entry), styling, logo, testing utils, Supabase client.

### Root Files
- `.gitignore`, `package.json`, configs for PostCSS/Tailwind, README, and developer notes (including `task-management-notes.md`).

## High-Level Architecture
- **State Management**: Contexts for global (auth/org/tasks/search); local in components (expanded/selected/adding/submitting/status/error/dateMode/isManualUpdate/loading/saving/logoFile/preview/filterStatus/orgId/searchQuery/copied).
- **Data Flow**:
  - Tasks: Fetch via TaskContext, list top-level (expand/add child/refresh/search), recursive items/children, details with fields, forms for tasks/templates/projects (validate/mode/date/array fields, submit to create/update with origin/parent).
  - Drag-Drop: Zones (between/into) with handlers/hover/active/styles/animations/debug, integrated in lists.
  - Integrations: Use tasks/auth/org/search contexts/hooks; utils for dates/levels/colors/drags/positions; services for task CRUD.
  - Settings: User/admin panels with tabs, forms for appearance (colors/font/logo upload), license display (available/used with status/dates).
  - Organization: Fetch org data/logo, update logo (SVG validation/upload), selectors with links, app with routes (dashboard/tasks/templates), headers with nav.
  - Licensing: Apply key via form, manage (fetch with joins to users/orgs, filter by status/org/search, generate bulk, copy keys), org list (fetch with admin, select/view details with logo/colors/font/subdomain/created/actions).
- **User Flows**:
  - Tasks: List (create project/refresh/add child/search) → Select view details (edit/add child/delete) → Create/edit task/template/project (form with modes/actions/resources).
  - Drag-Drop: In lists with zones for reorder/nest.
  - Settings: User settings for profile/notifications/licenses; Admin for general (org/users/billing) and appearance edits.
  - Organization: Select org → App with header/logo/sidebar/routes to tasks/templates/dashboard; Settings for logo update.
  - Licensing: Enter/apply key; Manage (generate bulk, filter/copy); Org list (select/details/edit/manage licenses/delete).
- **Performance**: Recursive rendering, drag-drop optimizations, filtered/sorted arrays, mounted checks.
- **Potential Challenges for Rewrite**:
  - Recursive hierarchies in lists/forms.
  - Date modes/validation in forms.
  - Drag-drop accessibility/animations.
  - White-labeling application (CSS vars for colors/font/logo, SVG handling).
  - License/org joins in fetches.

## Detailed File Summaries

### src/components/contexts/SearchContext.js
- **Context**: SearchContext – Provides search state and actions.
- **Hook**: useSearch() – Returns context or throws if outside provider.
- **Provider**: SearchProvider({ children }) – Wraps app; uses useTasks for tasks, useAuth for user.
  - State: searchFilters (text, status, taskType, timeframe, projectFilter, includeTemplates); isSearchActive.
  - Value: Filters, filteredTasks, activeFilterCount/filters, update/remove/clear/applyQuickFilter, helper fns (isOverdue/Today/ThisWeek).
- **Helper Functions**:
  - isOverdue/DueToday/DueThisWeek: Date comparisons for tasks.
  - isCreatedByUser/AssignedToUser: Checks against user.id.
  - matchesTextSearch: Searches task fields (title/desc/purpose/actions/resources).
- **Computed**:
  - filteredTasks (memo): Combines instance/template tasks, applies filters sequentially.
  - activeFilterCount (memo): Counts non-default filters.
  - activeFilters (memo): Array of active filter objects for UI.
- **Actions**:
  - updateFilter/type-specific (e.g., updateTextSearch).
  - removeFilter: Resets specific, checks if search still active.
  - clearAllFilters: Reset to defaults.
  - applyQuickFilter: Applies presets (e.g., my_overdue).

### src/components/contexts/OrganizationProvider.js
- **Context**: OrganizationContext – Provides org data.
- **Constant**: DEFAULT_PLANTER_PLAN_ORG – Fallback org with colors.
- **Hook**: useOrganization() – Returns context or warns/returns nulls.
- **Provider**: OrganizationProvider({ children }) – Uses useAuth, useParams, useLocation.
  - State: organization, organizationId, loading, error, lastFetchTime.
  - Value: organization, id, loading, error.
- **Functions**:
  - fetchOrganizationData (callback): Debounced fetch by slug/path/user; applies CSS vars for colors; catches to default.
- **Effects**:
  - Visibility change: Refetch if stale (>5min).
  - On !userLoading: Fetch.
  - Logging on updates (debug).

### src/components/contexts/AuthContext.js
- **Context**: AuthContext – Provides auth state.
- **Provider**: AuthProvider({ children }) – Manages user/session.
  - State: user, loading, userRole, userOrgId, userInfo.
  - Value: user, loading, hasRole, userRole, userInfo, userOrgId.
- **Functions**:
  - fetchUserInfo (callback): Supabase query for user data; sets role/orgId/info.
  - hasRole (callback): Checks userInfo.role.
- **Effect**: On mount – Get user/session, fetch info, setup auth change listener.
- **Hook**: useAuth() – Returns context.

### src/components/contexts/TaskContext.js
- **Context**: TaskContext – Central for tasks.
- **Hook**: useTasks() – Returns context or throws.
- **Provider**: TaskProvider({ children }) – Uses useAuth, useOrganization, various task hooks, useLocation.
  - State: tasks, loading, error, isFetching; ref for initial fetch.
  - Value: Tasks (all/instance/template), loading/error/fetching, actions (fetch/set/create/update/delete/dates/projectFromTemplate/afterDragDrop), optimistic helpers, hook results, updateCompletion, determineStartDate.
- **Functions**:
  - getProjectStartDate (callback): Finds earliest start or today.
  - fetchTasks (callback): Parallel fetch instance/template; sets tasks.
- **Hooks Used**: useTaskCreation/TemplateToProject/Deletion/Update/Dates/Licenses – Provide modular logic.
- **Computed**:
  - instanceTasks/templateTasks (memo): Filter by origin.
  - optimisticUpdateHelpers (memo): Functions for positions/reorder/recalculate/sync/batch/handleDragDrop.
  - integrationCallbacks: onCreated/Updated/Deleted/Refresh – Update state, recalc dates.
- **Actions** (callbacks):
  - createTask/projectFromTemplate/deleteTask/updateTask/updateDates/afterDragDrop: Call hooks with integrations.
- **Effect**: Fetch on load if ready.
- **Other**: dateHookResult for date logic; optimistic for UI (e.g., recalc dates sequentially by milestones/tasks).

### src/hooks/useTaskDeletion.js
- **Hook**: useTaskDeletion() – Manages task deletion logic.
  - State: isDeleting, deletionError, deletionProgress.
  - Returns: deleteTask, isDeleting, deletionError, deletionProgress, canDelete (!isDeleting), getDeletionConfirmationMessage, clearDeletionError, resetProgress.
- **Functions**:
  - deleteTask(taskId, options {deleteChildren, existingTasks, onTasksDeleted, onTasksUpdated}): Analyzes deletion (descendants, hasChildren), performs recursive delete via service, updates hierarchy (reorder siblings, update ancestors if template), calls callbacks.
  - analyzeTaskDeletion: Finds task/descendants recursively, counts.
  - performTaskDeletion: Recursive service deletes, collects IDs.
  - updateHierarchyAfterDeletion: Reorders siblings (via updateAfterReordering), updates template durations/ancestors if needed.
  - getDeletionConfirmationMessage: Builds string with task title/child count.
  - clearDeletionError/resetProgress: Reset states.

### src/hooks/useTaskCreation.js
- **Hook**: useTaskCreation() – Handles task/project creation with enhancements.
  - Uses: useAuth, useOrganization, useLicenses.
  - State: isCreating, creationError.
  - Returns: createTask, isCreating, creationError, canCreate (!isCreating), clearCreationError.
- **Functions**:
  - createTask(taskData, options {licenseId, existingTasks, onTaskCreated}): Validates license for top-level, enhances data (creator/org/position via getNextAvailablePosition, dates via enhanceTaskDataWithDates), creates via service, marks license used, calls callback.
  - enhanceTaskDataWithDates: Determines start (parent/sibling-based or today), calculates due (duration-based).
  - clearCreationError: Reset error.

### src/hooks/useLicenses.js
- **Hook**: useLicenses() – Manages user licenses and project creation limits.
  - Uses: useAuth.
  - State: canCreateProject, userHasProjects, projectLimitReason, userLicenses, selectedLicenseId, isCheckingLicense.
  - Returns: Above states, checkForExistingProjects, fetchUserLicenses, applyLicenseKey, selectLicense, clearSelectedLicense, checkProjectCreationAbility, validateProjectCreation, getSelectedLicense, availableLicenses (filter !used), usedLicenses (filter used).
- **Functions**:
  - checkForExistingProjects: Calls service, sets userHasProjects.
  - fetchUserLicenses: Supabase select by user_id, sets userLicenses.
  - applyLicenseKey(licenseKey): Validates via service, updates DB (set user_id/used), refetches.
  - selectLicense/clearSelectedLicense: Manage selectedId (only unused).
  - checkProjectCreationAbility: Checks existing, fetches licenses, sets canCreate/reason.
  - validateProjectCreation(licenseId): Checks hasProjects, finds unused license.
  - getSelectedLicense: Finds by id.
- **Effects**: On user.id: check ability; On hasProjects/licenses: Update canCreate/reason.

### src/hooks/useInvitations.js
- **Hook**: useInvitations() – Handles project invitations.
  - Uses: useAuth.
  - State: projectInvitations, userPendingInvitations, invitationLoading.
  - Returns: Above states, sendProjectInvitation, fetchProjectInvitations, fetchUserPendingInvitations, acceptProjectInvitation, declineProjectInvitation, revokeProjectInvitation.
- **Functions**:
  - sendProjectInvitation(projectId, email, role): Creates via service, refreshes project invites.
  - fetchProjectInvitations(projectId): Gets via service, sets list.
  - fetchUserPendingInvitations: Gets pendings for user.email, sets list.
  - accept/declineProjectInvitation(invitationId): Calls service, refreshes user pendings.
  - revokeProjectInvitation(invitationId, projectId): Calls service, refreshes project if provided.
- **Effect**: On user.email: Fetch pendings.

### src/hooks/useTaskUpdate.js
- **Hook**: useTaskUpdate() – Manages task updates with impact analysis.
  - State: isUpdating, updateError, updateProgress.
  - Returns: updateTask, updateTaskDates, isUpdating, updateError, updateProgress, canUpdate (!isUpdating), getUpdateStatus, clearUpdateError, resetProgress.
- **Functions**:
  - updateTask(taskId, updatedTaskData, options {existingTasks, onTaskUpdated, onTasksUpdated, onRefreshNeeded}): Analyzes update, handles specific types (template ancestors, dates, durations, positions) or general update, calls callbacks.
  - updateTaskDates(taskId, newStartDate, newDuration): Updates fields, calls date update.
  - analyzeTaskUpdate: Flags changes (template impacts, date/duration/position).
  - handleTemplateAncestorUpdate: Updates task/ancestors durations.
  - handleDateUpdate: Updates dates, gets affected (descendants/siblings), recalcs sequential.
  - handleDurationUpdate: Updates duration, ancestors if template, descendants dates.
  - handlePositionUpdate: Updates position, reorders siblings, recalcs dates if affected.
  - getAffectedTasksForDateUpdate: Recursive descendants + siblings.
  - clearUpdateError/resetProgress/getUpdateStatus: Manage states.

### src/hooks/useTemplateToProject.js
- **Hook**: useTemplateToProject() – Converts templates to instance projects.
  - Uses: useAuth, useOrganization, useLicenses, useTaskCreation (for createTask).
  - State: isConverting, conversionError, conversionProgress.
  - Returns: createProjectFromTemplate, isConverting, conversionError, conversionProgress, canConvert (!isConverting), clearConversionError, resetProgress, getAllTemplateTasksInHierarchy.
- **Functions**:
  - createProjectFromTemplate(templateId, projectData, options {licenseId, templateTasks, onProjectCreated}): Validates, gets hierarchy, builds levels, creates root via createTask, marks license, recursively creates children (enhance data), calcs dates for root, calls callback.
  - createProjectChildren: Recursive by level, maps template to project IDs, enhances (parent/position/dates).
  - buildTemplateTasksByLevel: Traverses to group by hierarchy level.
  - getAllTemplateTasksInHierarchy: Fetches if needed, recursive collect children + root.
  - clearConversionError/resetProgress: Reset states.

### src/hooks/useTaskDates.js
- **Hook**: useTaskDates(tasks, projectStartDate) – Calculates and caches task dates.
  - Uses: ref DateCacheEngine (from utils).
  - State: taskDates (object), isCalculating, lastUpdate.
  - Returns: taskDates, isCalculating, recalculateAllDates, updateTaskDates, getTaskDates/StartDate/DueDate/Duration, isTaskOverdue/DueToday, getCacheStats, clearCache.
- **Functions**:
  - recalculateAllDates: Timeout engine.calculateAllDates, sets taskDates.
  - updateTaskDates(changedTaskIds): Timeout engine.updateTaskDatesIncremental, sets taskDates.
  - getTaskDates/StartDate/DueDate: From taskDates or null.
  - getTaskDuration: Sums recursive children durations (sorted position) or task's (default 1).
  - isTaskOverdue/DueToday: Date comparisons (normalized, skip complete).
  - getCacheStats/clearCache: Engine methods, reset taskDates.
  - forceUpdate: Sets lastUpdate for re-renders.
- **Effect**: On tasks/projectStartDate: Recalculate all.

### src/utils/taskUtils.js
- **Functions**:
  - toDate(value): Converts string/number/Date to valid Date or null (handles formats like YYYY-MM-DD).
  - formatDisplayDate(input, locale='en-US'): Locale string like "Fri, Jul 18, 2025" or 'Invalid date'.
  - formatDate(input): Simple locale date or 'N/A'.
  - getBackgroundColor(level): Cycles colors for nesting levels.
  - getTaskLevel(task, tasks): Traverses parents to count level.
  - isDescendantOf(potentialChild, potentialParentId, tasks): Traverses parents to check ancestry.
  - calculateDueDate(startDate, durationDays): Adds days to start.
  - calculateStartDate(parentStartDate, position, siblingTasks): Sequential start based on prev siblings' durations.
  - updateChildDates(tasks, parentId, parentStartDate): Recursive sequential updates for children.

### src/utils/sequentialTaskManager.js
- **Functions**:
  - calculateSequentialStartDates(parentId, parentStartDate, tasks): Depth-first traversal to set starts/dues/durations, updates parent.
  - calculateParentDuration(parentId, tasks): Recursive sum of children's durations (min 1).
  - updateAncestorDurations(taskId, tasks): Recursively updates parents' durations, recalcs dates if start exists.
  - updateAfterReordering(parentId, tasks): Normalizes positions, recalcs dates if parent start.
  - getTasksRequiringUpdates(originalTasks, updatedTasks): Finds tasks with changed fields (duration/start/due/days_from_start/position).
  - updateTasksInDatabase(tasksToUpdate, updateTaskFunc): Async batch updates via func.

### src/utils/dateUtils.js
- **Functions**:
  - calculateDueDate(startDate, durationDays): Adds days (parses strings).
  - calculateStartDate(parentStartDate, daysFromStartUntil): Adds days (parses strings).
  - calculateTaskEndDate: Alias for calculateDueDate.
  - determineTaskStartDate(task, allTasks): Parent/sibling-based start (prev due or sum durations).
  - calculateSequentialStartDates(rootTaskId, projectStartDate, tasks): Level-by-level recursive calcs.
  - updateTaskDatesInHierarchy(rootTaskId, newStartDate, tasks): Sets root start, calls sequential calcs.
  - formatDate(date, formatStr='MMM d, yyyy'): Manual locale format or 'No date'/'Invalid'.
  - isValidDateRange(startDate, dueDate): Start <= due (parses).
  - safeToISOString(date): Parses to ISO or null.
  - recalculateTaskDates(task, allTasks): Updates based on parent + days_from_start_until_due.
  - updateDependentTaskDates(parentTaskId, tasks): Recursive descendant updates.

### src/utils/DateCacheEngine.js
- **Class**: DateCacheEngine – Caches dates with maps for cache/dependencies/versions/hashes.
- **Methods**:
  - generateCacheKey(tasks, projectStartDate): Hash from task structures + start + timestamp.
  - hasTaskStructureChanged(tasks): Compares structure hash (parents/positions/durations).
  - generateTaskStructureHash(tasks): Sorted task strings hashed.
  - hashString(str): Simple 32-bit hash.
  - buildDependencyMap(tasks): Maps affects/affectedBy (children/next/parents/prev).
  - calculateTaskDates(task, tasks, projectStartDate, existingDates): Computes start/due (parent/sibling/days override).
  - calculateAllDates(tasks, projectStartDate): Full calc if changed/uncached; processes with deps.
  - updateTaskDatesIncremental(changedIds, tasks, projectStartDate): Currently forces full calc.
  - getTaskLevel(task, tasks): Traverses parents (max 20).
  - invalidateCache/clearCache: Clears all.
  - getTaskDates(id)/getAllDates: From cache.
  - getCacheStats: Sizes/version/flags/hash.
  - debugCacheState(label): Logs stats/samples if debug.

### src/utils/dragUtils.js
- **Constants**: DATA_TRANSFER_KEY, DROP_EFFECT, POSITION_MULTIPLIER=1000, etc.
- **Functions**:
  - createDragData(taskId, additionalData): Object with id/timestamp/data.
  - extractDragData(dataTransfer): Gets id from text/plain.
  - calculateSparsePosition(siblings, insertIndex): Insert pos (half/midpoint/+1).
  - calculateDropPosition(draggedTask, targetTask, allTasks, dropType='onto'): Pos/parent/type by dropType.
  - canTaskBeDragged(task): False for top-level.
  - canDropOnTarget(draggedTask, targetTask, dropType): Checks no cycle/same.
  - isDescendantOf(potentialDescendant, potentialAncestorId, allTasks): Traverses with visited.
  - isTouchDevice: Checks touch features.
  - addTouchSupport(element, handlers): Listeners for start/move/end with distance check.
  - addKeyboardDragSupport(element, handlers): Keydown for space/enter/esc/arrows, aria/announce.
  - announceToScreenReader(message): Hidden aria-live temp div.
  - add/removeDragClass, add/removeDropTargetClass: Class/data attrs.
  - debounce(func, wait), throttle(func, limit): Standards.
  - handleDragError(error, context): Logs, returns error obj.
  - getBrowserDragSupport: Checks draggable/DataTransfer/touch/pointer.
  - makeDraggable(element, options): Sets attrs/listeners for drag events/touch/keyboard.

### src/utils/sparsePositioning.js
- **Constants**: POSITION_INCREMENT=1000, MIN_POSITION_GAP=10.
- **Functions**:
  - calculateInsertPosition(siblings, newPosition): Pos for insert (half/+INCREMENT/midpoint).
  - getNextAvailablePosition(tasks, parentId): Last + INCREMENT or INCREMENT.
  - generateSparsePositions(count, startingPosition=INCREMENT): Array with increments.
  - checkIfRenormalizationNeeded(tasks, parentId): True if gaps < GAP or first < GAP.
  - generateNormalizedPositions(siblings, startPosition=INCREMENT): Sorted with increments.
  - calculatePositionForInsert(tasks, parentId, insertIndex): Calls insert pos.
  - extractDropPositionFromEvent(event, tasks): Parses dataTransfer/closest attrs for drop info.
  - calculateMovePosition(tasks, taskId, newParentId, newIndex): Insert pos, checks renorm need.
  - handleHTML5DropPosition(dropInfo, tasks): Detailed pos/parent/type/needsRenorm by 'into'/'onto'.
  - createHTML5DragData(taskId, additionalData): text/plain id, json full.
  - extractHTML5DragData(dataTransfer): id + optional json.
  - getChildPositions(tasks, parentId): Sorted positions.
  - debugPositions(tasks, parentId, context, eventInfo): Logs counts/positions/gaps/renorm.
  - validatePositionIntegrity(tasks): Groups by parent, checks dups/gaps/negatives; returns issues/recommendations.

### src/supabaseClient.js
- **Main**: Imports createClient; gets env SUPABASE_URL/ANON_KEY; exports supabase = createClient(url, key).

### src/components/Resources/ResourcesPage.js (pseudocode as resourceList.js)
- **Component**: ResourceList() – Main resources page.
  - Uses: useAuth (user), useOrganization (organizationId).
  - State: resources[], loading, error, selectedResource, showForm, editingResource, isCreating.
  - Filters: filterFormat ('all'), filterText, showMyResourcesOnly.
  - Returns: Split panels (left: list/filters, right: details/form).
- **Effect**: On orgId/userId/myOnly: loadResources.
- **Functions**:
  - loadResources: Fetches via fetchAllResources (org/user/true?), sets resources.
  - filteredResources: Filters by format/text (title/desc/tags).
  - handleCreateResource(resourceData): Validates, enhances (creator/org), creates via service, prepends, selects.
  - handleUpdateResource(id, data): Validates, updates via service, maps update.
  - handleDeleteResource(id): Confirms, deletes via service, filters out.
  - handleResourceSelect: Sets selected, clears form/editing.
  - handleFormCancel: Hides form, clears editing.
- **Render**: Loading/error divs; flex panels – left: header (title/count/create btn), filters (text/select/checkbox), list (empty or map to ResourceItem); right: form if showForm, details if selected, else empty prompt.

### src/components/Resources/ResourceItemComponent.js (pseudocode in resourceList.js)
- **Component**: ResourceItem({ resource, isSelected, onClick, onEdit, onDelete }) – List item.
  - Gets: formatColors/icon/label via helpers.
  - Returns: Div (clickable, styled selected/hover), flex: left (icon/title/badge/desc/tags/created), right (edit/delete btns).

### src/components/Resources/resourceTypes.js
- **Constants**:
  - RESOURCE_FORMATS: {pdf, hyperlink, powerpoint, microsoft_doc}.
  - RESOURCE_FORMAT_LABELS/ICONS/COLORS: Mappings for display (labels/emojis/hex).
  - DEFAULT_RESOURCE: Empty defaults (title '', format hyperlink, etc.).
  - RESOURCE_VALIDATION_RULES: Per-field (required/min/max/pattern/allowed/maxItems/maxTagLength).
  - RESOURCE_SEARCH_FILTERS: {all, my_resources, ...}.
  - SEARCH_SCOPE: {tasks, resources, all}.
  - COMMON_RESOURCE_TAGS: Array of suggestions.
- **Functions**:
  - getResourceFormatLabel/Icon/Colors(format): From maps or defaults.
  - isUrlRequiredForFormat(format): Checks if in url requiredForFormats.
  - validateResourceField(fieldName, value, allData): Applies rules (required/min/max/pattern/allowed/array limits).
  - validateResourceData(resourceData): Collects errors per field.
  - createSafeResourceObject(partial): Merges with defaults, ensures tags array.
  - formatResourceForDisplay(resource): Enhances with label/icon/colors/hasUrl/tagCount/formatted dates.

### src/components/TemplateProject/TemplateProjectCreator.js
- **Component**: TemplateProjectCreator({ onSuccess, onCancel, userHasProjects }) – Form to create project from selected template.
  - Uses: useTasks (templateTasks, createProjectFromTemplate, applyLicenseKey), useAuth (user).
  - State: selectedTemplateId, projectName, startDate, licenseKey, licenseStatus, isSubmitting, status, error.
  - Filters: topLevelTemplates (!parent).
  - Returns: Div styled (padding/bg/radius/shadow), form: h2, select template, license input (if hasProjects), name input, date input, error/status divs, cancel/create buttons.
- **Effect**: On mount: Set startDate to today ISO date.
- **Functions**:
  - handleTemplateSelect(templateId): Set id, set name from template title.
  - handleLicenseChange(e): Set key, clear status/error.
  - handleSubmit(e): Validate (template/name/date/license), submit license if needed, create project with data/licenseId, call onSuccess, handle errors/status.

### src/components/TemplateProject/UseTemplateForm.js
- **Component**: UseTemplateForm({ template, onSuccess, onCancel }) – Form to create project from specific template.
  - Uses: useTasks (createProjectFromTemplate, applyLicenseKey, userHasProjects, templateTasks), useAuth (user).
  - State: projectName (template.title), startDate, licenseKey, licenseStatus, isSubmitting, status, error.
  - Returns: Div styled, form: h2 (template title), license input (if hasProjects), name input, date input, error/status, cancel/create buttons.
- **Effect**: On mount: Set startDate to today ISO date.
- **Functions**:
  - handleLicenseChange(e): Set key, clear status/error.
  - handleSubmit(e): Validate (name/date/license), submit license if needed, create project with data/licenseId, call onSuccess, handle errors/status.

### src/components/TemplateList/TemplateDetailsPanel.js
- **Component**: TemplateDetailsPanel({ task, tasks, onClose, onAddTask, onDeleteTask, onEditTask }) – Details/edit panel for template.
  - State: isEditing, hasChildren.
  - Returns: If editing: TemplateTaskForm (initial task, parent id, onSubmit update, onCancel cancel, bg color); Else: Div styled (bg/overflow), header with title/close, details rows (parent/level/days/duration/default/start/due/purpose/desc/actions/resources), buttons (edit/add child/delete).
- **Effect**: On task/tasks: Check hasChildren.
- **Functions**:
  - handleEditClick: Set editing true.
  - handleCancelEdit: Set false.
  - handleTemplateUpdate(updated): Call onEditTask, set false.
  - formatDisplayDate(date): Locale or 'Not set'/'Invalid'.

### src/components/TemplateList/TemplateItem.js
- **Component**: TemplateItem({ task, tasks, expandedTasks, toggleExpandTask, selectedTaskId, selectTask, setTasks, dragAndDrop, onAddTask, parentTasks=[] }) – Recursive template list item.
  - State: isHovering.
  - Extracts: dragAndDrop handlers.
  - Computed: isExpanded/selected/hasChildren/children/level/isTopLevel/bgColor/isDropTarget/isBeingDragged.
  - Returns: Div styled (margin/transition), header (drop classes/draggable/events/click/hover, bg/cursor/opacity/shadow), flex (expand btn/title/add child btn/duration/details btn/toggle btn), children recursive if expanded, drop indicator if target.
- **Functions**:
  - handleDragStart(e, task): Prevent if top-level.

### src/components/TemplateList/TemplateList.js
- **Component**: TemplateList() – Main template list page.
  - Uses: useTasks (templateTasks as tasks, loading, initialLoading, error, fetchTasks, setTasks, createTask, deleteTask, updateTask).
  - Ref: isMounted.
  - State: expandedTasks {}, selectedTaskId, isRefreshing, isCreatingNewTemplate, addingChildToTemplateId, draggedTask, dropTarget, dropPosition.
  - Returns: Div flex vh-100, left (header with title/create/refresh, loading/error/empty or map top-level to TemplateItem), right (create form if new/child, details if selected, else prompt).
- **Effect**: Cleanup isMounted false.
- **Functions**:
  - handleRefresh: Fetch true, set refreshing.
  - handleCreateNewTemplate: Set creating true, child null.
  - handleAddTemplateTask(parentId): Set creating false, child parentId.
  - cancelTemplateCreation: Clear creating/child.
  - toggleExpandTask(id, e): Toggle expanded.
  - selectTask(id, e): Toggle selected.
  - simpleDragAndDrop: Handlers for drag (set dragged/target/position).
  - handleCreateTemplate(newData): Create task (template origin, parent if child), append to tasks if mounted, cancel.
  - handleEditTemplate(id, updated): Update task (template origin), map replace.
  - handleDeleteTemplate(id): Confirm, delete, filter out, clear selected.
  - renderTopLevelTemplates: Filter top-level/sort, empty UI or map to TemplateItem.
  - renderRightPanel: Form if creating/new child (with bg), details if selected, else prompt.

### src/components/TaskList/HTML5DragDropZone.js
- **Component**: HTML5DragDropZone({ type 'between'/'into', parentId, position, level=0, onDropBetween, onDropInto, isDragActive=false, className='', style={}, children=null, showWhenInactive=false, customColors=null, debugMode=false }) – Drag-drop zone.
  - State: isHovering, dragEnterCount.
  - Returns: If !active && !show: null; Else: Div with enter/over/leave/drop handlers, styled (height/margin/bg/border/flex/font/color/opacity/shadow/cursor/transform/anim/data attrs) by type/between/into/hovering/active, text/icons for drop, debug divs, children.
- **Functions**:
  - handleDragEnter(e): Prevent/stop, +count, hover true.
  - handleDragOver(e): Prevent/stop, effect 'move', hover true.
  - handleDragLeave(e): Prevent/stop, -count, hover false if <=0.
  - handleDrop(e): Prevent/stop, get draggedId, hover false/count0, call onDropBetween/Into with id/parent/pos.

### src/components/TaskList/DropZoneGroup.js
- **Component**: DropZoneGroup({ children, beforeZone=null, afterZone=null, intoZone=null, spacing='4px' }) – Group zones.
  - Returns: Div relative margin spacing, beforeZone, relative with children/intoZone, afterZone.

### src/components/TaskList/SmartDropZone.js
- **Component**: SmartDropZone({ type, parentTask, insertIndex, allTasks, onDrop, isDragActive, debugMode=false }) – Smart zone.
  - Computes: level (parent+1), siblings (parent children), position=insertIndex.
  - Functions: handleDrop(draggedId, parentId, pos): Call onDrop with details.
  - Returns: HTML5DragDropZone with handlers for between/into.

### src/components/TaskList/TaskList.js
- **Component**: TaskList() – Main task list page.
  - Uses: useTasks (instanceTasks as tasks, loading/initialLoading/error/fetchTasks/setTasks/createTask/selectedLicenseId/userHasProjects/updateTaskDates/getTaskStartDate/getTaskDueDate/handleOptimisticDragDrop/updateTasksOptimistic/recalculateDatesOptimistic/syncTaskPositionToDatabase/...), useSearch (isActive, filteredTasks).
  - Refs: isMounted, initialFetchDone.
  - State: expandedTasks {}, selectedTaskId, addingChildToTaskId, isCreatingProject, projectLicenseId, isRefreshing, isCreatingFromTemplate, showProjectMenu, showInvitationTest, showSearchResults, draggedTask, dragHoverTarget.
  - Returns: Div padding/maxW/margin, if dev dragged info, flex vh-100, left (search bar, header with title/invitations dropdown/new project menu/refresh, search banner if active, loading/spinner/error/empty or renderTasksWithHTML5DropZones), right (renderRightPanel), search results if show.
- **Effect**: Set initial fetch done.
- **Functions**:
  - handleRefresh: Refreshing true, fetch, false.
  - handleCreateNewProject: Set creating true, license selected or null.
  - handleCreateFromTemplate: Set creatingFrom true.
  - toggleShowInvitationTest: Toggle test.
  - toggleSearchResults: Toggle show.
  - toggleExpandTask(id, e): Toggle expanded.
  - selectTask(id, e): Toggle selected.
  - handleAddTaskToProject(projectId): Set adding child projectId.
  - handleCancelAddTask: Set adding null.
  - handleCreateTask(newData): Create task (instance origin, parent adding or null, license if !hasProjects or adding root), append/update dates if mounted, cancel.
  - handleEditTask(id, updated): Update task (instance origin), replace if mounted.
  - handleDeleteTask(id): Confirm, delete, filter out/clear selected if mounted.
  - handleUpdateTaskDates(id, newStart, newDuration): Update dates, recalc optimistic, sync if mounted.
  - handleDragStart(e, task): Prevent if root, set dragged.
  - handleDragOver(e, target): Prevent, set hover target.
  - handleDragLeave(e): Set hover null.
  - handleDragEnd(e): Clear dragged/hover.
  - handleDrop(e, targetTask): Get draggedId, calc drop pos/type, handle optimistic drag-drop/sync.
  - renderTasksWithHTML5DropZones: Filter top-level/sort, empty or map to TaskItem with drop zones.
  - renderRightPanel: Form if creating project/template/add child, details if selected, else prompt.
  - renderInvitationTestPanel: Test panel if show.

### src/components/TaskList/TaskList.css
- **Styles**: Key rules for task list/drag-drop.
  - .task-list-container: max-width 1200px, margin auto.
  - .task-header: font bold, margin bottom.
  - .task-item: margin bottom 8px.
  - .task-title: truncate, bold.
  - .drop-zone: transition all 0.2s.
  - .html5-drop-zone-between: height 2px, bg blue light, hover height 12px bg blue.
  - .html5-drop-zone-into: min-height 20px, border dashed green light, hover min-height 32px bg green.
  - Animations: spin for loading, pulse for hovering zones.
  - Hover/selected: shadows/opacity/transforms.
  - Debug: fixed positions, bg black opacity.
  - .task-item[data-is-dragging=true]: opacity 0.4, transform scale 1.02 rotate 1deg, z1000, shadow, cursor grabbing, transition none.
  - .task-item[data-is-drop-target=true]: transform scale 1.01, z5, shadow purple, bg purple, transition all.
  - .task-item .drag-handle: opacity 0.6, cursor grab, transition opacity color, user-select none, touch-action none.
  - Hover: opacity 0.9.
  - Dragging: opacity 1, cursor grabbing, color white, shadow text.
  - Draggable true: cursor grab, active grabbing.
  - .html5-drop-zone-between: transition all, pos relative overflow hidden.
  - Hovering: anim pulse-blue, transform scaleY 1.5.
  - ::before bg linear blue, opacity 0/1 hovering, anim shimmer.
  - .html5-drop-zone-into: transition all, pos relative overflow hidden.
  - Hovering: anim pulse-green, transform scale 1.02, filter shadow green.
  - ::before bg linear green, opacity 0/1 hovering, anim shimmer-green.
  - .insert-line: abs left right, height 4 bg linear blue, radius, z10, anim insert-line-pulse, shadow blue.
  - ::before abs top50 left right height2 bg white opacity 0.8 transform translateY -50.
  - Keyframes for pulse-blue/green, insert-line-pulse, shimmer/green, task-reorder, shake, sync-progress, glow-rotate.
  - Media hover none pointer coarse: larger drag-handle, minHeight zones.
  - Prefers-contrast high: borders black, bg yellow/white.
  - Prefers-reduced-motion: no anim/transition, no transform.
  - Focus-within: outline blue.
  - GPU accel: transform translateZ0, backface hidden, perspective.
  - Will-change for drag ops.
  - .task-item[data-is-drop-target=true]::after abs glow linear purple, opacity 0.3 anim glow-rotate.
  - .task-item.drag-success: anim task-reorder.
  - .task-item.syncing::before abs sync anim linear white.
  - .task-item.drag-error: anim shake, border red.
  - Browser fixes for FF/Safari user-select etc.

### src/components/TaskList/TaskDetailsPanel.js
- **Component**: TaskDetailsPanel({ task, tasks, onClose, onAddTask, onDeleteTask, onEditTask, onUpdateDates }) – Details/edit panel for task.
  - State: isEditing, hasChildren, showEditConfirmation false.
  - Returns: If editing: TaskForm initial task, parent id, onSubmit update, onCancel cancel, bg color, tasks, onUpdateDates; Else: Div overflow, header title/close, details rows (parent/level/start/due/duration/purpose/desc/actions/resources), buttons (edit/add child/delete), confirmation if edit has impacts.
- **Effect**: On task/tasks: Check hasChildren.
- **Functions**:
  - handleEditClick: If ancestors impacted set showConfirm true else editing true.
  - handleCancelEdit: Set editing false.
  - handleConfirmEdit: Set showConfirm false, editing true.
  - handleTaskUpdate(updated): Call onEditTask, editing false.
  - formatDisplayDate(date): Locale or 'Not set'/'Invalid'.
  - getEffectiveDuration(): Try getTaskDuration(id) catch duration_days or 1.
  - getCalculatedDueDate()/getCalculatedStartDate(): Similar try getTaskDueDate/StartDate toISO or stored, catch stored.
  - parseArrayField(field): If array return, if !field [] , if string trim==='' [] , try JSON.parse if array return else [], catch console warn return [field], else [].
  - getRoleDisplay(role)/getStatusDisplay(status): Return {label, color, bgColor} maps for owner/full/limited/coach etc.

### src/components/TaskList/TaskItem.js
- **Component**: TaskItem({ task, tasks, expandedTasks, toggleExpandTask, selectedTaskId, selectTask, setTasks, onAddTask, parentTasks=[] }) – Recursive task list item.
  - State: isHovering.
  - Computed: isExpanded/selected/hasChildren/children/level/isTopLevel/bgColor/isDropTarget/isBeingDragged.
  - Returns: Div styled (margin/transition), header (drop classes/draggable/events/click/hover, bg/cursor/opacity/shadow), flex (expand btn/title/add child btn/duration/details btn/toggle btn), children recursive if expanded, drop indicator if target.
- **Functions**:
  - handleDragStart(e, task): Prevent if top-level.
  - getEffectiveDuration(): Try getTaskDuration(id) catch duration_days or 1.
  - getTaskStyle(): Base style with modifications for dragging/dropTarget/selected.

### src/components/TaskList/TaskUIComponents.js
- **Components**: Shared UI for tasks (e.g., badges/icons/buttons/empties/spinners/banners/dropdowns, inferred from usage in TaskList/Item/Details).
  - Examples: Spinner for loading, EmptyPanel for no tasks, SearchBanner for active search, Dropdown for menus, Confirmation for edits/deletes.
  - EmptyPanel({ message, icon }): Div center with icon/p message.
  - DeleteConfirmation({ onConfirm, onCancel, message, title='Confirm Deletion' }): Modal with title/message/buttons.
  - ProjectForm({ formData, onFieldChange, onArrayChange, onAddArrayItem, onRemoveArrayItem, onSubmit, onCancel, backgroundColor='#3b82f6', formTitle='Create New Project' }): Form with fields (title/purpose/desc/start/due/duration/actions/resources), submit/cancel.
  - TemplateSelector({ templates, selectedTemplateId, onTemplateSelect, onCancel, onContinue }): Selector with list of templates, continue button.

### src/components/TaskForm/TaskForm.js
- **Component**: TaskForm({ initialData={}, parentTaskId=null, onSubmit, onCancel, backgroundColor='#3b82f6', isEditing=false, tasks=[], onUpdateDates=null }) – Form for task create/edit.
  - Uses: useTaskForm (formData/setFormData/errors/setErrors/dateMode/handleDateModeChange/handleChange/handleArrayChange/addArrayItem/removeArrayItem/validateForm/prepareFormData).
  - State: affectedAncestors [].
  - Returns: Div bg light/radius/border/height/overflow, header bg color/white/text/padding with title/close, form padding: title input, duration number, start/due dates with mode select (calculate end/duration), purpose/desc textareas, actions/resources arrays with add/remove, buttons cancel/submit.
- **Effect**: On formData/default_duration change: Calc ancestors impacts.
- **Functions**:
  - handleSubmit(e): Prevent, validate (title/duration/dates/range), prepare data, submit, catch error.
  - calculateParentDuration(parentId, tasks): Recursive sum children durations.
  - calculateAncestorImpacts: Traverse parents, sim update duration, calc new durations for impacts.

### src/components/TaskForm/TemplateTaskForm.js
- **Component**: TemplateTaskForm({ initialData={}, parentTaskId=null, onSubmit, onCancel, backgroundColor='#3b82f6', isEditing=false, tasks=[] }) – Form for template task.
  - Uses: useTemplateTaskForm (formData/setFormData/errors/setErrors/handleChange/handleArrayChange/addArrayItem/removeArrayItem/validateForm/prepareFormData).
  - State: affectedAncestors [].
  - Returns: Similar to TaskForm but for templates: title input, default duration number, purpose/desc, actions/resources arrays, buttons.
- **Effect**: On formData/default_duration change: Calc ancestors impacts.
- **Functions**:
  - handleSubmit(e): Prevent, validate (title/default_duration), prepare data, submit, catch error.
  - calculateParentDuration/calculateAncestorImpacts: Similar to TaskForm.

### src/components/TaskForm/NewProjectForm.js
- **Component**: NewProjectForm({ onSubmit, onCancel, licenseId=null, userHasProjects=false, backgroundColor='#10b981' }) – Form for new project.
  - Uses: useTaskForm (formData/setFormData/errors/setErrors/dateMode/handleDateModeChange/handleChange/handleArrayChange/addArrayItem/removeArrayItem/validateForm/prepareFormData).
  - Returns: Div styled, header with title/close, form: name input, start date, duration number, purpose/desc, actions/resources, buttons cancel/create.
- **Functions**:
  - handleSubmit(e): Prevent, validate (name/start/duration), prepare data, submit with licenseId.

### src/components/TaskForm/useTemplateTaskForm.js
- **Hook**: useTemplateTaskForm(initialData={}, parentTaskId=null)
  - Returns: formData, setFormData, errors, setErrors, handleChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData, affectedAncestors.
- **State**: formData {title '', purpose '', description '', actions [''], resources [''], default_duration 1}, errors {}, affectedAncestors [].
- **Functions**:
  - ensureArray(value): Array or [].
  - handleChange(e): Set field, clear error.
  - handleArrayChange(field, index, e): Update array item.
  - addArrayItem(field): Append ''.
  - removeArrayItem(field, index): Filter out.
  - validateForm(additional=()=>{}) : Check title/default_duration, additional, set errors.
  - prepareFormData: Clean arrays, parse default_duration.
- **Effects**: Process initial actions/resources to arrays, update formData if needed; Calc ancestors on default_duration change.

### src/components/TaskForm/useTaskForm.js
- **Hook**: useTaskForm(initialData={}, parentStartDate=null)
  - Returns: formData, setFormData, errors, setErrors, dateMode, handleDateModeChange, handleChange, handleDateChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData.
- **State**: formData {title '', purpose '', description '', actions [''], resources [''], start_date '', days_from_start_until_due 0, duration_days 1, due_date ''}, isManualUpdate false, dateMode 'calculateEndDate', errors {}.
- **Functions**:
  - ensureArray(value): Array or [].
  - handleDateModeChange(e): Set mode.
  - handleChange(e): Set field/manual true, parse duration, clear error.
  - handleDateChange(e): Set date/manual true, validate range if calculateDuration.
  - handleArrayChange/addArrayItem/removeArrayItem: Similar.
  - validateForm(additional=()=>{}) : Check title, range if calculateDuration, additional.
  - prepareFormData: Clean arrays, parse duration/days.
- **Effects**: Process initial to arrays; Log date changes; Auto calc due/duration/days based on mode, validate range.

### src/components/TaskForm/CreateNewTemplateForm.js
- **Component**: CreateNewTemplateForm({ onSubmit, onCancel, backgroundColor='#3b82f6' }) – Form for new template.
  - State: formData {title '', purpose '', description '', actions [''], resources [''], duration_days 1}, errors {}.
  - Returns: Div styled, header create/close, form: title input, duration number, purpose/desc textareas, actions/resources with add/remove, buttons cancel/create.
- **Functions**:
  - handleChange/handleArrayChange/addArrayItem/removeArrayItem/validateForm/prepareFormData: Similar to TemplateTaskForm, origin 'template', parent null, is_complete false.
  - handleSubmit(e): Prevent, validate (title/duration), prepare, submit.

### src/services/licenseService.js
- **Functions**:
  - generateLicense(licenseData): Gen key if none, defaults (org null, used false), insert 'licenses', return data.
  - canUserCreateProject(userId): Count top-level instance tasks, canCreate if <1.
  - generateRandomLicenseKey: XXXX-XXXX-XXXX uppercase alphanum.
  - validateLicense(licenseKey, userId): Select unused by key, check user match/null.
  - markLicenseAsUsed(licenseId): Update is_used=true.

### src/services/taskService.js
- **Functions**:
  - fetchAllTasks(organizationId, userId, origin, projectId, options): Query 'tasks' by origin/creator/org/project, recursive descendants if project, order position.
  - fetchAllDescendants(parentTasks, organizationId): Recursive children batch, unique map.
  - fetchTasksForProjects(projectIds, organizationId): Roots + descendants.
  - createTask(taskData): Validate required, next position, insert 'tasks'.
  - updateTaskCompletion(taskId, isComplete): Update is_complete.
  - updateTaskPosition(taskId, newPosition, newParentId): Update pos/parent, reorder siblings.
  - updateTaskDateFields(taskId, dateFields): Update start/due, update dependents.
  - updateTaskFields(taskId, fields): Arbitrary updates.
  - updateTaskComplete(taskId, isComplete): Update is_complete.
  - updateTaskHierarchy(taskId, newParentId, newPosition): Move, handle cycles/dates.
  - deleteTask(taskId): Recursive delete descendants + task.
  - getTaskById(taskId): Select single.
  - getTasksByParent(parentId): Children ordered position.
  - getTaskWithPermissions(taskId, userId): Check creator/membership.
  - findRootProject(taskId): Traverse parents.
  - batchUpdateTasks(updates): Batch updates.
  - getTaskStatistics(userId, organizationId): Counts total/complete/overdue.
  - addToMasterLibrary(taskId, organizationId, addedBy): Insert 'master_library_tasks'.
  - removeFromMasterLibrary(taskId, organizationId): Delete from 'master_library_tasks'.
  - checkIfInMasterLibrary(taskId, organizationId): Select exists.
  - getMasterLibraryTasks(organizationId, options): Select 'master_library_view' paginated.
  - searchMasterLibraryTasks(searchTerm, organizationId, options): Search view by title/desc/purpose.

### src/services/resourceService.js
- **Functions**:
  - fetchAllResources(organizationId, userId, publishedOnly): Select with creator, filter org/user/published, order created desc.
  - createResource(resourceData): Validate required, normalize tags/published, insert 'resources' with creator.
  - updateResource(resourceId, updateData): Validate id/data, update fields.
  - deleteResource(resourceId): Delete by id.
  - getResourceById(resourceId): Select with creator.
  - getResourceTags(organizationId): Unique sorted tags from resources.
- **Constants**: RESOURCE_FORMATS/LABELS: Enums/mappings.
- **Functions**:
  - validateResourceData(resourceData): Check title/format/url (if hyperlink).
  - isValidUrl(url): Try new URL.

### src/services/authService.js
- **Functions**:
  - signUp(email, password, userData, role, whitelabelOrgId): Auth signUp with metadata, upsert 'users' profile.
  - signIn(email, password): Auth signInWithPassword.
  - signOut: Auth signOut.
  - getCurrentSession: Auth getSession.
  - getCurrentUser: Auth getUser + select 'users' profile, combine.
  - requestPasswordReset(email): Auth resetPasswordForEmail with redirect.
  - updatePassword(newPassword): Auth updateUser password.
  - updateUserProfile(userData): Update auth metadata + 'users' table.

### src/services/organizationService.js
- **Functions**:
  - fetchOrganizationBySlug(slug): Select 'white_label_orgs' by subdomain single.
  - fetchAllOrganizations: Select all ordered name.
  - createOrganization(orgData): Insert 'white_label_orgs'.
  - updateOrganization(updateData): Update colors/font/logo by id.
  - deleteOrganization(id): Delete by id.

### src/services/reportService.js
- **Functions**:
  - fetchTasksForReporting(params): Query 'tasks' with filters (org/user/origin/dates/projects/completion), order created desc.
  - generateProjectReport(projectId, options): Get project, fetch tasks, calc stats (total/complete/incomplete/overdue/upcoming).
  - generateUserReport(userId, options): Get projects, fetch tasks, stats per/overall.
  - generateOrganizationReport(organizationId, options): Get projects, fetch tasks, stats.
  - exportReport(reportData, format, options): Delegate to PDF/CSV/JSON/Excel gen.
  - generatePDFExport(reportData, baseFilename, options): Build PDF sections (stats/overdue/upcoming).
  - generateCSVExport(reportData, baseFilename, options): CSV string with sections.
  - generateJSONExport(reportData, baseFilename, options): Stringify with exportedAt.
  - generateExcelExport(reportData, baseFilename, options): CSV-like for Excel.
  - saveGeneratedReport(reportData, metadata): Save to 'reports' table (placeholder).

### src/services/invitationService.js
- **Functions**:
  - getUserByEmail(email): Select 'users' by email lower.
  - createInvitation(projectId, email, role, invitedBy): Validate/email/format/role/existing, get user, insert 'project_invitations'.
  - getProjectInvitations(projectId): Select with user/inviter/project, order created desc.
  - getPendingInvitationsForUser(userId): Select pending with project/inviter, order created desc.
  - getInvitationsSentByUser(userId): Select by invited_by with user/project.
  - acceptInvitation(invitationId, userId): Validate pending/match, create membership, update status.
  - declineInvitation(invitationId): Update status declined if pending.
  - revokeInvitation(invitationId, revokedBy): Update status revoked if pending.

### src/services/teamManagementService.js
- **Functions**:
  - getProjectMembers(projectId): Select memberships with user/inviter, order created asc.
  - addProjectMember(projectId, userId, role, invitedBy): Validate/role/exists/not member/project, insert with accepted.
  - updateMemberRole(membershipId, newRole): Validate role/exists, update.
  - removeMember(membershipId): Delete by id.
  - getUserProjects(userId): Select memberships with project where accepted.
  - getProjectMember(projectId, userId): Select by project/user with user/inviter.
  - checkUserRole(projectId, userId, requiredRole): Get member, check role >= required (hierarchy).
  - getProjectMembershipStats(projectId): Select role/status, count total/byRole/byStatus/active.

### src/components/Settings/UserSettings.js
- **Component**: UserSettings() – User settings page.
  - Returns: Div with h1 User Settings, intro panel with icon/h2/p, sections for profile (info form placeholder), notifications (preferences placeholder), licenses (LicenseSection).

### src/components/Settings/AppearanceSettings.js
- **Component**: AppearanceSettings() – Appearance customization.
  - Uses: useOrganization (organization, refreshOrganization).
  - State: appearanceData {primaryColor, secondary, tertiary, font, logo}, initialData, logoError, loading, error, isEditing, saving, saveError.
  - Returns: If loading: spinner/p; If error: message; Else: Form with color inputs, font select, logo upload (SVG only, validate type), edit/save/cancel buttons (disabled if no changes/saving).
- **Effect**: Load data from org or fetch all (fallback to planter org), set appearance/initial.
- **Functions**:
  - toggleEditMode: Toggle editing.
  - handleColorChange/field, handleFontChange, handleLogoChange (readAsText, validate SVG).
  - handleSubmit: Async update org, refresh, reset initial/editing.

### src/components/Settings/AdminSettings.js
- **Component**: AdminSettings() – Admin settings panel.
  - Uses: useOrganization (organization).
  - State: activeTab 'general'.
  - Returns: Div with h1 Admin Settings (org name if), tabs (general/appearance), content: Switch tab – appearance: AppearanceSettings; General: Grid sections for org/users/billing with icons/h3/p/manage buttons (placeholders).

### src/components/Settings/LicenseSection.js
- **Component**: LicenseSection() – License display.
  - Uses: useTasks (userLicenses, fetchUserLicenses, canCreateProject, projectLimitReason, isCheckingLicense).
  - Computed: availableLicenses (!is_used), usedLicenses (is_used).
  - Returns: If checking: message; Else: Status panel (can create/reason), available/used sections with h3/lists (key/date/status badges).
- **Effect**: Fetch licenses on mount.

### src/components/Organization/OrganizationHeader.js
- **Component**: OrganizationHeader() – Organization header with navigation.
  - Uses: useOrganization (organization).
  - Returns: If !org: null; Else: Header styled, links to tasks/templates, org name + user.

### src/components/Organization/OrganizationApp.js
- **Component**: OrganizationApp() – Organization app wrapper.
  - Uses: useOrganization (organization, loading).
  - Returns: If loading: message; Else: Div with Header, container with Sidebar, main with Routes (dashboard/tasks/templates).

### src/components/Organization/OrganizationLogo.js
- **Component**: OrganizationLogo() – Logo display.
  - Uses: useOrganization (organization, loading).
  - Returns: Div styled, if loading/!org/!logo: h1 org name; Else: Div with dangerouslySetInnerHTML logo SVG.

### src/components/Organization/OrganizationSettings.js
- **Component**: OrganizationSettings() – Org settings form.
  - State: org, loading, saving, error, successMessage, logoFile, logoPreview.
  - Returns: If loading: message; Else: Div with h1, error/success, logo section with form (preview/upload/save), details section (name/subdomain/status/created).
- **Effect**: Fetch org by admin user id, set org/preview.
- **Functions**:
  - handleLogoChange: Validate SVG, readAsText, set file/preview.
  - handleSubmit: Prevent, validate SVG, update org logo, set success/org, clear file.

### src/components/Organization/OrganizationSelector.js
- **Component**: OrganizationSelector() – Org list selector.
  - State: organizations, loading.
  - Returns: If loading: message; Else: Div with h3, list of links to org tasks, or no orgs message.
- **Effect**: Load all orgs.
- **Functions**:
  - loadOrganizations: Async fetch all, set list.

### src/components/License/LicenseKeyEntry.js
- **Component**: LicenseKeyEntry({ onSuccess, onCancel }) – License key entry form.
  - Uses: useTasks (applyLicenseKey).
  - State: licenseKey, isSubmitting, error, success.
  - Returns: Div styled, h2/p, error/success, form with input, cancel/apply buttons.
- **Functions**:
  - handleChange: Set key, clear error.
  - handleSubmit: Async validate/apply key, set success/error, call onSuccess if success.

### src/components/Admin/LicenseManager.js
- **Component**: LicenseManager() – License management page.
  - Uses: useAuth (user).
  - State: licenses, loading, error, bulkAmount, generatingLicenses, filterStatus, filterOrgId, organizations, searchQuery, copiedLicense.
  - Returns: Div with h1, loading/error, stats (available/used/total), filters (status/org/search), generate bulk input/button, table with keys/status/org/user/created/actions (copy).
- **Effect**: Fetch licenses/orgs on mount.
- **Functions**:
  - fetchLicenses: Async select with joins to users/orgs, filter by status/org, order created desc.
  - fetchOrganizations: Async select id/name/subdomain, order name.
  - handleGenerateBulk: Async loop generateLicense, prepend to list.
  - handleCopyLicense: Clipboard copy, temp set copied.
  - handleFilterChange: Update filters, refetch.

### src/components/Admin/WhiteLabelOrgList.js
- **Component**: WhiteLabelOrgList() – White-label org list page.
  - State: organizations, loading, error, selectedOrgId.
  - Returns: Div flex vh-100, left (header with title/create/refresh, loading/error/empty or org list items with name/subdomain/colors), right (details if selected with logo/colors/font/admin/subdomain/created, actions edit/manage licenses/delete).
- **Effect**: Fetch orgs with admin on mount.
- **Functions**:
  - fetchOrganizations: Async select with admin_user join, order name.
  - selectOrg: Toggle selected.
  - renderSmallLogo: Fallback icon or SVG.
  - renderOrgList: Empty UI or map clickable items with logo/name/subdomain/colors.
  - renderOrgDetailsPanel: Prompt or details with header/close, logo/colors/font/admin/subdomain/created, buttons.

## Next Steps for Updates
With license, UI for key entry/management/org list is clear – next, perhaps reports/login. We can draft docs: e.g., task management guide. Provide next pseudocode!