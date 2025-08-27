# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`SearchContext.js`, `OrganizationProvider.js`, `AuthContext.js`, and `TaskContext.js`) into a single reference. Each file's contexts, hooks, providers, and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## SearchContext.js

### Context: SearchContext

### Hook: useSearch()
// Returns context or throws error if not in provider

### Provider: SearchProvider({ children })
// Uses useTasks: instanceTasks, templateTasks
// Uses useAuth: user
// Uses state: searchFilters {text: '', status: 'all', taskType: 'all', timeframe: 'all', projectFilter: 'all', includeTemplates: false}
// Uses state: isSearchActive false
// Returns <SearchContext.Provider> with value {searchFilters, filteredTasks, isSearchActive, activeFilterCount, activeFilters, updateFilter, updateTextSearch, removeFilter, clearAllFilters, applyQuickFilter, isOverdue, isDueToday, isDueThisWeek}

// Function: isOverdue(task)
// If no due_date: false
// Due = new Date(due_date), today = new Date() hours 0
// Returns due < today && !is_complete

// Function: isDueToday(task)
// If no due_date: false
// Due = new Date(due_date), today = new Date()
// Returns due.toDateString() === today.toDateString()

// Function: isDueThisWeek(task)
// If no due_date: false
// Due = new Date(due_date), today = new Date(), weekFromNow = today +7 days
// Returns due >= today && due <= weekFromNow

// Function: isCreatedByUser(task)
// Returns task.creator === user?.id

// Function: isAssignedToUser(task)
// If array assigned_users: includes user?.id
// Else: task_lead === user?.id

// Function: matchesTextSearch(task, searchText)
// If !searchText: true
// Lower = searchText.toLowerCase()
// Fields: title, description, purpose, actions array, resources array
// Returns some field lower includes lower

// Computed: filteredTasks (useMemo)
// TasksToFilter = [...instanceTasks], if includeTemplates add templateTasks
// Filters task:
// If !matchesTextSearch: false
// Switch status: complete !is_complete false, incomplete is_complete false, overdue !isOverdue false, due_today !isDueToday false, due_week !isDueThisWeek false
// Switch taskType: my_tasks ! (created or assigned) false, created_by_me !created false, assigned_to_me !assigned false
// Switch timeframe: today !dueToday false, this_week !dueThisWeek false, overdue !overdue false, upcoming !(due > today && !complete) false
// If projectFilter !== 'all': root_id !== projectFilter false
// Returns filtered array
// Deps: searchFilters, instanceTasks, templateTasks, user

// Computed: activeFilterCount (useMemo)
// Count = 0
// If text: ++
// If status !== all: ++
// If taskType !== all: ++
// If timeframe !== all: ++
// If includeTemplates: ++
// Returns count
// Deps: searchFilters

// Computed: activeFilters (useMemo)
// Filters array
// If text: push {type 'text', label `Text: "${text}"`, value text}
// If status !== all: push {type 'status', label from map, value}
// If taskType !== all: push {type 'taskType', label from map, value}
// If timeframe !== all: push {type 'timeframe', label from map, value}
// If includeTemplates: push {type 'includeTemplates', label 'Include Templates', value true}
// Returns filters
// Deps: searchFilters

// Function: updateFilter(filterType, value)
// Sets searchFilters {...prev, [type]: value}
// Sets isSearchActive true

// Function: updateTextSearch(text)
// Calls updateFilter('text', text)

// Function: removeFilter(filterType)
// Resets: {text '', status 'all', taskType 'all', timeframe 'all', includeTemplates false}
// Calls updateFilter(type, reset[type])
// Remaining = {...searchFilters, [type]: reset}
// HasActive = some entries value !== '' / 'all' / false
// If !hasActive: isSearchActive false

// Function: clearAllFilters()
// Sets searchFilters to defaults, isSearchActive false

// Function: applyQuickFilter(preset)
// Presets object: my_overdue {taskType 'my_tasks', status 'overdue', text '', timeframe 'all', include false}, etc.
// If presets[preset]: sets searchFilters {...prev, ...preset}, isSearchActive true

## OrganizationProvider.js

### Context: OrganizationContext

### Constant: DEFAULT_PLANTER_PLAN_ORG
// {id, name 'Planter Plan', organization_name 'Planter Plan', subdomain 'planter', primary_color '#10b981', secondary_color '#3b82f6', tertiary_color '#8b5cf6', status 'active'}

### Hook: useOrganization()
// Returns context or warn and {organization null, organizationId null, loading false, error null}

### Provider: OrganizationProvider({ children })
// Uses useAuth: user, userLoading
// Uses useParams, useLocation
// Uses state: organization null, organizationId null, loading true, error null, lastFetchTime 0
// Ref: renderCountRef for initial console log
// Returns <OrganizationContext.Provider> with value {organization, organizationId, loading, error}

// Function: fetchOrganizationData() (useCallback)
// Now = Date.now(), if now - last <5000: return
// Sets loading true, lastFetchTime now
// Path = location.pathname, isOrgPath includes '/org/', orgSlug = params.orgSlug
// If isOrgPath && slug: fetchOrganizationBySlug, if error throw, set organization data, id, apply --primary-color, --secondary-color if present
// If path includes '/admin' or '/user': set DEFAULT, id, apply colors
// If user?.profile?.white_label_org: set from user.profile.white_label_org, id, apply colors from orgData
// Default: set DEFAULT, id, apply colors
// Catch: console error, setError message, fallback DEFAULT, id, apply colors
// Finally loading false
// Deps: params.orgSlug, location.pathname, user, lastFetchTime

// Effect: addEventListener visibilitychange
// If visible: now, if now - last >300000 (5min): fetch
// Cleanup removeEventListener
// Deps: fetchOrganizationData, lastFetchTime

// Effect: if !userLoading: fetchOrganizationData
// Deps: fetchOrganizationData, userLoading

// Computed: contextValue (useMemo)
// {organization, organizationId, loading, error}
// Deps: organization, id, loading, error

// Effect: log 'Organization context updated' with JSON {id, name, loading, error} when debugString changes
// Deps: debugString

## AuthContext.js

### Context: AuthContext

### Provider: AuthProvider({ children })
// Uses state: user null, loading true, userRole null, userOrgId null, userInfo null
// Returns <AuthContext.Provider> with value {user, loading, hasRole, userRole, userInfo, userOrgId}

// Function: fetchUserInfo(authUser) (useCallback)
// If !authUser: return
// Supabase from 'users' select * eq 'id' authUser.id single
// If error: console
// Set userRole data.role, userOrgId data.white_label_org_id, userInfo data
// Deps: []

// Effect: on mount
// InitAuth async: supabase.auth.getUser, setUser user, if user fetchUserInfo, finally loading false
// Listener: onAuthStateChange setUser session?.user ?? null
// Cleanup: listener.subscription.unsubscribe
// Deps: []

// Function: hasRole(role) (useCallback)
// If !user or !userInfo: false
// Returns userInfo.role === role
// Deps: user, userInfo

### Hook: useAuth()
// Returns useContext(AuthContext)

## TaskContext.js

### Context: TaskContext

### Hook: useTasks()
// Returns context or throws error if not in provider

### Provider: TaskProvider({ children })
// Uses useAuth: user, userLoading
// Uses useOrganization: organizationId, orgLoading
// Uses hooks: useLicenses, useTaskCreation, useTemplateToProject, useTaskDeletion, useTaskUpdate, useTaskDates
// Uses useLocation
// Uses state: tasks [], loading true, error null, isFetching false
// Ref: initialFetchDoneRef
// Returns <TaskContext.Provider> with value {tasks, instanceTasks, templateTasks, loading, error, isFetching, fetchTasks, setTasks, createTask, updateTask, deleteTask, updateTaskDates, createProjectFromTemplate, updateTaskAfterDragDrop, updateTasksOptimistic, reorderTasksOptimistic, recalculateDatesOptimistic, syncTaskPositionToDatabase, batchSyncPositions, handleOptimisticDragDrop, ...creationHookResult, ...templateHookResult, ...deletionHookResult, ...updateHookResult, ...dateHookResult, ...licenseHookResult, updateTaskCompletion, determineTaskStartDate}

// Function: getProjectStartDate() (useCallback)
// RootTasks = filter !parent_task_id
// ProjectWithStart = find t.start_date
// Returns project.start_date or today ISO split T [0]
// Deps: tasks

// Computed: instanceTasks (useMemo)
// Filter tasks origin === 'instance'
// Deps: tasks

// Computed: templateTasks (useMemo)
// Filter tasks origin === 'template'
// Deps: tasks

// Function: fetchTasks(forceRefresh=false) (useCallback)
// If isFetching && !force: return {instanceTasks, templateTasks}
// If !user?.id: return
// Set isFetching true, loading true
// Promise.all fetchAllTasks(orgId, user.id, 'instance'), fetchAllTasks(orgId, null, 'template')
// AllTasks = [...instance.data || [], ...template.data || []]
// Set tasks allTasks, error null, initialRef true
// Return {instance.data || [], template.data || []}
// Catch: setError message, return {error, instanceTasks, templateTasks}
// Finally loading false, isFetching false
// Deps: orgId, user?.id, instanceTasks, templateTasks, isFetching

// Const: dateHookResult = useTaskDates(tasks, getProjectStartDate())

// Const: creation/template/deletion/update/license HookResult = use...()

// Computed: optimisticUpdateHelpers (useMemo)
// Function: updateTaskPositionsOptimistic(taskUpdates)
// SetTasks map prev, find update by id, {...task, ...update}

// Function: reorderTasksOptimistic(draggedId, newParentId, newPosition)
// SetTasks map prev, if id===dragged: {...task, parent_task_id new, position new}

// Function: recalculateDatesOptimistic(taskList)
// Updated = [...taskList]
// Milestones = filter !parent sort position
// For each milestone index: start = index===0 ? today ISO split : find prev id due_date
// MilestoneTasks = filter parent===milestone.id sort position
// For each task index: start = index===0 ? milestoneStart : find prev id due_date
// Duration = duration_days ||1
// Due = new Date(start) + duration days, ISO split
// Update in updated array by index
// Returns updatedTasks

// Function: syncTaskPositionToDatabase(taskId, newPosition, newParentId)
// Calls updateTaskPosition(taskId, newPosition, newParentId)
// Catch console error, revert? (not implemented)

// Function: batchSyncPositions(positionUpdates)
// Promises = map updates to updateTaskPosition(id, pos, parent)
// Promise.all, catch console

// Function: handleOptimisticDragDrop(draggedId, newParentId, newPosition, oldParentId)
// SetTasks map update dragged parent/pos
// UpdatedWithDates = recalculateDatesOptimistic(updated)
// SetTasks updatedWithDates

// Const: integrationCallbacks
// onTaskCreated(newTask): setTasks append, dateHook.updateTaskDates([new.id])
// onProjectCreated(newProject, createdTasks): setTasks append all, dateHook.recalculateAllDates
// onTaskUpdated(updated): setTasks map replace id, dateHook.updateTaskDates([updated.id])
// onTasksUpdated(updatedList): setTasks map replace many, dateHook.updateTaskDates(updated.map id)
// onTasksDeleted(deletedIds): setTasks filter !deletedIds includes id, dateHook.updateTaskDates(affected ids?)
// onRefreshNeeded(): fetchTasks(true)

// Function: createTask(taskData, licenseId=null) (useCallback)
// Calls creationHookResult.createTask(taskData, {licenseId, existingTasks: tasks, onTaskCreated})
// Deps: creation.createTask, tasks, integration.onTaskCreated

// Function: createProjectFromTemplate(templateId, projectData, licenseId=null) (useCallback)
// Calls templateHook.createProjectFromTemplate(templateId, projectData, {licenseId, templateTasks, onProjectCreated})
// Deps: template.create, templateTasks, integration.onProjectCreated

// Function: deleteTask(taskId, deleteChildren=true) (useCallback)
// Calls deletionHook.deleteTask(taskId, {deleteChildren, existingTasks: tasks, onTasksDeleted, onTasksUpdated})
// Deps: deletion.deleteTask, tasks, integration.deleted, updated

// Function: updateTask(taskId, updatedTaskData) (useCallback)
// Calls updateHook.updateTask(taskId, updatedTaskData, {existingTasks: tasks, onTaskUpdated, onTasksUpdated, onRefreshNeeded})
// Deps: update.updateTask, tasks, integration

// Function: updateTaskDates(taskId, dateData) (useCallback)
// Calls updateHook.updateTaskDates(taskId, dateData, {existingTasks: tasks, onTaskUpdated})
// Deps: update.updateTaskDates, tasks, integration.onTaskUpdated

// Function: updateTaskAfterDragDrop(taskId, newParentId, newPosition, oldParentId) (useCallback)
// Console log
// Calls optimistic.handleOptimisticDragDrop(taskId, newParent, newPos, oldParent)
// Returns {success true}
// Deps: optimisticUpdateHelpers

// Effect: if !userLoading && !orgLoading && !initialDone.current && user?.id: fetchTasks
// Deps: user?.id, organizationId, userLoading, orgLoading, fetchTasks

// Computed: contextValue (useMemo)
// {tasks, instanceTasks, templateTasks, loading, error, isFetching, fetchTasks, setTasks,
// createTask, updateTask, deleteTask, updateTaskDates, createProjectFromTemplate,
// updateTaskAfterDragDrop, updateTasksOptimistic=optimistic.updatePositions, reorder=optimistic.reorder, recalculate=optimistic.recalculate, sync=optimistic.sync, batchSync=optimistic.batch, handleOptimistic=optimistic.handle,
// ...creationHookResult, ...template, ...deletion, ...update, ...date, ...license,
// updateTaskCompletion (service),
// determineTaskStartDate: (task) => dateHook.getTaskStartDate(task.id)}
// Deps: tasks, instance, template, loading, error, fetching, fetchTasks, createTask, updateTask, deleteTask, updateDates, createProject, updateAfterDrag, optimistic, creationResult, templateResult, deletionResult, updateResult, dateResult, licenseResult