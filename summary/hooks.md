# Consolidated Pseudo-Code Summary of JavaScript Hooks

This document consolidates the pseudo-code summaries from the provided JavaScript files (`useTaskDeletion.js`, `useTaskCreation.js`, `useLicenses.js`, `useInvitations.js`, `useTaskUpdate.js`, `useTemplateToProject.js`, and `useTaskDates.js`) into a single reference. Each file's functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## useTaskDeletion.js

### Hook: useTaskDeletion()
```
// Uses state: isDeleting, deletionError, deletionProgress
// Returns {deleteTask, isDeleting, deletionError, deletionProgress, canDelete, getDeletionConfirmationMessage, clearDeletionError, resetProgress}

// Function: deleteTask(taskId, options)
// Sets isDeleting true, clears error, sets progress
// Finds task, analyzes deletion (descendants, hasChildren, totalToDelete)
// Performs deletion: recursive delete children, then task
// Updates local task list remove deleted
// If template: reorders siblings, updates ancestor durations, gets updates, updates DB
// Calls onTasksDeleted/onTasksUpdated
// Returns {success, deletedIds, hasChildren} or {error}
// Finally sets isDeleting false, resets progress

// Function: analyzeTaskDeletion(taskId, existingTasks, deleteChildren)
// Finds task, gets descendants recursively
// Returns {taskToDelete, descendants, hasChildren, totalTasksToDelete}

// Function: performTaskDeletion(taskId, existingTasks, deleteChildren)
// Recursively deletes children if deleteChildren
// Deletes task via service
// Returns {deletedIds array}

// Function: updateHierarchyAfterDeletion(taskId, updatedTaskList, existingTasks)
// Finds parentId, siblings sorted exclude deleted
// Reorders positions if needed via updateAfterReordering
// If template and parent: calculates new duration, updates ancestors, gets updates, updates DB
// Returns updated tasks

// Function: getDeletionConfirmationMessage(taskId, existingTasks)
// Analyzes deletion, returns confirmation string with title and child count if hasChildren

// Function: clearDeletionError()
// Sets deletionError null

// Function: resetProgress()
// Sets deletionProgress to initial

// Computed: canDelete = !isDeleting
```

## useTaskCreation.js

### Hook: useTaskCreation()
```
// Uses auth, organization, licenses, state: isCreating, creationError
// Returns {createTask, isCreating, creationError, canCreate, clearCreationError}

// Function: createTask(taskData, options)
// Sets isCreating true, clears error
// Checks user id, top-level project: validates license/creation ability
// Prepares enhanced data: creator, org, position via getNextAvailablePosition
// Enhances dates: determines start/due based on parent/siblings/duration/days_from_start
// Creates via service
// If top-level and license: marks as used
// Calls onTaskCreated
// Returns {data} or {error}
// Finally sets isCreating false

// Function: enhanceTaskDataWithDates(taskData, existingTasks, isTopLevelProject)
// If parent: determines start via determineTaskStartDate or calculateStartDate
// Calculates due via calculateDueDate
// If top-level no start: sets current date, calculates due
// Returns enhanced data

// Function: clearCreationError()
// Sets creationError null

// Computed: canCreate = !isCreating
```

## useLicenses.js

### Hook: useLicenses()
```
// Uses auth, state: canCreateProject, userHasProjects, projectLimitReason, userLicenses, selectedLicenseId, isCheckingLicense
// Returns {canCreateProject, userHasProjects, projectLimitReason, userLicenses, selectedLicenseId, isCheckingLicense, checkForExistingProjects, fetchUserLicenses, applyLicenseKey, selectLicense, clearSelectedLicense, checkProjectCreationAbility, validateProjectCreation, getSelectedLicense, availableLicenses, usedLicenses}

// Function: checkForExistingProjects()
// If no user: false
// Calls checkUserExistingProjects, sets userHasProjects, returns hasProjects or false

// Function: fetchUserLicenses()
// If user: selects 'licenses' by user_id desc created_at, sets userLicenses

// Function: applyLicenseKey(licenseKey)
// If no user: error
// Validates license via validateLicense
// If success: updates 'licenses' set user_id, is_used true
// Refetches licenses
// Returns {success, licenseId} or {error}

// Function: selectLicense(licenseId)
// Finds license, if !used: sets selectedLicenseId

// Function: clearSelectedLicense()
// Sets selectedLicenseId null

// Function: checkProjectCreationAbility()
// Sets isChecking true
// Checks existing projects
// Fetches licenses
// Calls canUserCreateProject, sets canCreateProject, projectLimitReason
// Sets isChecking false

// Function: validateProjectCreation(licenseId)
// If !userHasProjects: canCreate true, no license needed
// Else if no license: false, reason provide key
// Finds license by id, checks !used
// Returns {canCreate, reason, licenseId} or false

// Function: getSelectedLicense()
// Finds by selectedLicenseId in userLicenses

// Computed: availableLicenses = filter !is_used, usedLicenses = filter is_used

// Effect: on user.id: checkProjectCreationAbility
// Effect: on userHasProjects, userLicenses: updates canCreateProject, projectLimitReason if hasProjects and available licenses
```

## useInvitations.js

### Hook: useInvitations()
```
// Uses auth, state: projectInvitations, userPendingInvitations, invitationLoading
// Returns {projectInvitations, userPendingInvitations, invitationLoading, sendProjectInvitation, fetchProjectInvitations, fetchUserPendingInvitations, acceptProjectInvitation, declineProjectInvitation, revokeProjectInvitation}

// Function: sendProjectInvitation(projectId, email, role)
// Sets loading true
// Checks user id
// Calls createInvitation, on error returns
// Refreshes fetchProjectInvitations
// Returns {success, data} or {error}
// Finally loading false

// Function: fetchProjectInvitations(projectId)
// Calls getProjectInvitations, sets projectInvitations
// Returns {success, data} or {error}

// Function: fetchUserPendingInvitations()
// If user.email: calls getPendingInvitationsForUser, sets userPendingInvitations
// Returns {success, data} or {error}

// Function: acceptProjectInvitation(invitationId)
// Sets loading true
// Calls acceptInvitation, on error returns
// Refreshes fetchUserPendingInvitations
// Returns {success, data} or {error}
// Finally loading false

// Function: declineProjectInvitation(invitationId)
// Sets loading true
// Calls declineInvitation, on error returns
// Refreshes fetchUserPendingInvitations
// Returns {success, data} or {error}
// Finally loading false

// Function: revokeProjectInvitation(invitationId, projectId)
// Sets loading true
// Checks user id
// Calls revokeInvitation, on error returns
// If projectId: refreshes fetchProjectInvitations
// Returns {success, data} or {error}
// Finally loading false

// Effect: on user.email: fetchUserPendingInvitations
```

## useTaskUpdate.js

### Hook: useTaskUpdate()
```
// Uses state: isUpdating, updateError, updateProgress
// Returns {updateTask, updateTaskDates, isUpdating, updateError, updateProgress, canUpdate, getUpdateStatus, clearUpdateError, resetProgress}

// Function: updateTask(taskId, updatedTaskData, options)
// Sets isUpdating true, clears error, sets progress
// Finds original, analyzes update (isTemplateWithAncestorImpacts, isDateUpdate, isDurationUpdate, isPositionUpdate)
// Handles different: template ancestor, date, duration, position via specific handlers
// Or general updateTaskComplete
// Calls onTaskUpdated/onTasksUpdated/onRefreshNeeded
// Returns {success, data} or {error}
// Finally isUpdating false, resets progress

// Function: updateTaskDates(taskId, newStartDate, newDuration)
// Updates start_date, calculates due_date
// Calls updateTaskDateFields
// Returns {success, updatedTask}

// Function: analyzeTaskUpdate(originalTask, updatedTaskData, existingTasks)
// Checks origin template, if duration/position/dates changed, has impacts on ancestors/siblings/descendants
// Returns analysis object with flags

// Function: handleTemplateAncestorUpdate(taskId, updatedTaskData, analysis, existingTasks, callbacks)
// Updates task, updates ancestors durations, gets updates, updates DB

// Function: handleDateUpdate(taskId, updatedTaskData, analysis, existingTasks, callbacks)
// Updates dates, gets affected tasks (descendants, siblings), recalculates sequential dates

// Function: handleDurationUpdate(taskId, updatedTaskData, analysis, existingTasks, callbacks)
// Updates duration, updates ancestors if template, recalculates dates for descendants

// Function: handlePositionUpdate(taskId, updatedTaskData, analysis, existingTasks, callbacks)
// Updates position, reorders siblings, recalculates dates if start/due affected

// Function: getAffectedTasksForDateUpdate(taskId, existingTasks)
// Gets descendants recursive, siblings
// Returns unique affected ids array

// Function: clearUpdateError()
// Sets updateError null

// Function: resetProgress()
// Sets updateProgress to initial

// Function: getUpdateStatus(taskId)
// Returns {isUpdating for task, currentStep, hasError}

// Computed: canUpdate = !isUpdating
```

## useTemplateToProject.js

### Hook: useTemplateToProject()
```
// Uses auth, organization, licenses, taskCreation, state: isConverting, conversionError, conversionProgress
// Returns {createProjectFromTemplate, isConverting, conversionError, conversionProgress, canConvert, clearConversionError, resetProgress, getAllTemplateTasksInHierarchy}

// Function: createProjectFromTemplate(templateId, projectData, options)
// Sets isConverting true, clears error, sets progress
// Checks user, templateId, name
// Validates creation/license
// Gets template tasks hierarchy via getAllTemplateTasksInHierarchy or fetch
// Builds template tree by level
// Creates root project: enhances data, creates via createTask
// Marks license used if provided
// Recursively creates children levels, sets progress
// Calculates sequential dates for root
// Calls onProjectCreated
// Returns {data rootProject} or {error}
// Finally isConverting false

// Function: createProjectChildren(projectId, templateTasksByLevel, currentLevel, templateToProjectMap, templateTasksTree)
// If no more levels: return
// For each task in level: finds projectParentId via map, enhances data with parent/position/dates
// Creates child, adds to map
// Recurses next level

// Function: buildTemplateTasksByLevel(templateTasksTree)
// Traverses parents to calculate level, groups by level

// Function: getAllTemplateTasksInHierarchy(rootTemplateId, templateTasks)
// If no tasks: fetches templates from DB
// Recursively collects children, includes root

// Function: clearConversionError()
// Sets conversionError null

// Function: resetProgress()
// Sets conversionProgress to initial

// Computed: canConvert = !isConverting
```

## useTaskDates.js

### Hook: useTaskDates(tasks, projectStartDate)
```
// Uses ref DateCacheEngine, state: taskDates, isCalculating, lastUpdate
// Returns {taskDates, isCalculating, recalculateAllDates, updateTaskDates, getTaskDates, getTaskStartDate, getTaskDueDate, getTaskDuration, isTaskOverdue, isTaskDueToday, getCacheStats, clearCache}

// Function: recalculateAllDates()
// If no tasks: sets empty
// Sets calculating true
// Timeout: engine.calculateAllDates, sets taskDates object, calculating false, forceUpdate

// Function: updateTaskDates(changedTaskIds)
// If no tasks: empty
// Sets calculating true
// Timeout: engine.updateTaskDatesIncremental, sets taskDates, calculating false, forceUpdate

// Function: getTaskDates(taskId)
// Returns taskDates[taskId] or {start_date null, due_date null}

// Function: getTaskStartDate(taskId)
// Parses getTaskDates.start_date or null

// Function: getTaskDueDate(taskId)
// Parses getTaskDates.due_date or null

// Function: getTaskDuration(taskId)
// Finds task, if children: sums recursive durations sorted by position
// Else: duration_days or 1

// Function: isTaskOverdue(taskId)
// If complete: false
// Compares dueDate < today (normalized)

// Function: isTaskDueToday(taskId)
// Compares dueDate.toDateString() === today

// Function: getCacheStats()
// Returns engine.getCacheStats()

// Function: clearCache()
// Engine.clearCache, sets taskDates empty, forceUpdate

// Function: forceUpdate()
// Sets lastUpdate now

// Effect: on tasks/projectStartDate change: recalculateAllDates
```