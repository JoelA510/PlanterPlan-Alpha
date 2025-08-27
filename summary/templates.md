# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`TemplateProjectCreator.js`, `UseTemplateForm.js`, `TemplateDetailsPanel.js`, `TemplateItem.js`, and `TemplateList.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## TemplateProjectCreator.js

### Component: TemplateProjectCreator({ onSuccess, onCancel, userHasProjects })
// Uses useTasks: templateTasks, createProjectFromTemplate, applyLicenseKey
// Uses useAuth: user
// Uses state: selectedTemplateId null, projectName '', startDate '', licenseKey '', licenseStatus '', isSubmitting false, status '', error null
// Filters topLevelTemplates = filter !parent_task_id
// Returns div padding bg white radius shadow minW400
// Form onSubmit handleSubmit
// H2 bold large "Create Project from Template"
// Div margin: label bold "Select Template *", select value=selected onChange handleTemplateSelect, options map topLevelTemplates title or untitled
// If userHasProjects: div margin: label "License Key *", input value=licenseKey onChange handleLicenseChange, border red if error includes license, small gray "Enter your license key"
// Div margin: label "Project Name *", input text value=projectName onChange setProjectName, border red if error name
// Div margin: label "Start Date *", input date value=startDate onChange setStartDate, border red if error date
// If error: div margin padding radius bg red light text red {error}
// If status: div margin padding radius bg based on status (error red, applied green, validating orange, else green) text color accordingly {status}
// Div flex end gap: button Cancel onClick onCancel padding radius border gray bg white cursor
// Button submit disabled isSubmitting or !topLevelTemplates, padding radius bg green white cursor not/pointer opacity 0.7/1, text Creating... or Create Project

// Effect: on mount: today = new Date(), formatted = ISO split T [0], setStartDate

// Function: handleTemplateSelect(templateId)
// Sets selectedTemplateId
// Finds template by id, if found setProjectName title

// Function: handleLicenseKeyChange(e)
// Sets licenseKey value, licenseStatus '', error null

// Function: handleSubmit(e)
// PreventDefault
// If !selected: error select template return
// If !projectName trim: error name required return
// If !startDate: error date required return
// If userHasProjects && !licenseKey trim: error license required return
// Sets isSubmitting true, error null
// Let licenseId null
// If userHasProjects: status validating, licenseResult = await applyLicenseKey(trim), if !success: set license 'error', throw error or invalid
// LicenseId = result.licenseId or id
// Set license 'success', status applied creating...
// Else: status creating...
// ProjectData = {name projectName, startDate}
// Result = await createProjectFromTemplate(selected, projectData, {licenseId, onProjectCreated?})
// If result.error: throw
// Status created!
// If onSuccess && result.data: onSuccess(data)
// Catch: console error, status '', error message
// Finally isSubmitting false

## UseTemplateForm.js

### Component: UseTemplateForm({ template, onSuccess, onCancel })
// Uses useTasks: createProjectFromTemplate, applyLicenseKey, userHasProjects, templateTasks
// Uses useAuth: user
// Uses state: projectName template.title or '', startDate '', licenseKey '', licenseStatus '', isSubmitting false, status '', error null
// Returns div padding bg white radius shadow minW400
// Form onSubmit handleSubmit
// H2 bold large "Create Project from Template: {template.title}"
// If userHasProjects: div margin: label "License Key *", input value=licenseKey onChange handleLicenseChange, border red if error includes license, small gray "Enter your license key"
// Div margin: label "Project Name *", input text value=projectName onChange setProjectName, border red if error name
// Div margin: label "Start Date *", input date value=startDate onChange setStartDate, border red if error date
// If error: div margin padding radius bg red light text red {error}
// If status: div margin padding radius bg based on status (error red, applied green, validating orange, else green) text color accordingly {status}
// Div flex end gap: button Cancel onClick onCancel padding radius border gray bg white cursor
// Button submit disabled isSubmitting, padding radius bg green white cursor not/pointer opacity 0.7/1, text Creating... or Create Project

// Effect: on mount: today = new Date(), formatted = ISO split T [0], setStartDate

// Function: handleLicenseKeyChange(e)
// Sets licenseKey value, licenseStatus '', error null

// Function: handleSubmit(e)
// PreventDefault
// If !projectName trim: error name required return
// If !startDate: error date required return
// If userHasProjects && !licenseKey trim: error license required return
// Sets isSubmitting true, error null
// Let licenseId null
// If userHasProjects: status validating, licenseResult = await applyLicenseKey(trim), if !success: set license 'error', throw error or invalid
// LicenseId = result.licenseId or id
// Set license 'success', status applied creating...
// Else: status creating...
// ProjectData = {name projectName, startDate}
// Result = await createProjectFromTemplate(template.id, projectData, licenseId)
// If result.error: throw
// Status created!
// If onSuccess && result.data: onSuccess(data)
// Catch: console error, status '', error message
// Finally isSubmitting false

## TemplateDetailsPanel.js

### Component: TemplateDetailsPanel({ task, tasks, onClose, onAddTask, onDeleteTask, onEditTask })
// Uses state: isEditing false, hasChildren false
// Returns if !task: null
// Level = getTaskLevel(task, tasks), backgroundColor = getBackgroundColor(level)
// ParentTask = find by parent_task_id
// Children = filter parent===task.id sort position
// If isEditing: returns TemplateTaskForm initialData=task, parentTaskId=parent, onSubmit handleTemplateUpdate, onCancel handleCancelEdit, backgroundColor, isEditing true, tasks
// Else: div bg light radius border height100 overflow auto
// Header bg backgroundColor white text padding radius top pos relative
// Flex between align: h3 bold large {title or untitled}, button close bg white opacity border white padding small radius cursor × onClick onClose
// Content padding
// Detail row: h4 bold margin "Parent Template:", p {parent.title or No parent}
// Detail row: h4 bold margin "Level:", p {level}
// Detail row: h4 bold margin "Days from Start:", p {days_from_start or 0}
// Detail row: h4 bold margin "Duration (days):", p {duration_days or 1}
// Detail row: h4 bold margin "Default Duration (days):", p {default_duration or 1}
// Detail row: h4 bold margin "Start Date:", p formatDisplayDate(start_date)
// Detail row: h4 bold margin "Due Date:", p formatDisplayDate(due_date)
// Detail row: h4 bold margin "Purpose:", p {purpose or No purpose}
// Detail row: h4 bold margin "Description:", p {description or No description}
// Detail row: h4 bold margin "Actions:", ul padding margin map actions to li or li No actions
// Detail row: h4 bold margin "Resources:", ul padding margin map resources to li or li No resources
// Action buttons row margin flex gap: button Edit Template bg blue white padding radius cursor flex center ✎ onClick handleEditClick
// Button Add Child Template bg green white padding radius cursor flex center + onClick onAddTask(task.id)
// Delete row margin: button Delete Template bg red white padding radius cursor width100 flex center onClick onDeleteTask(task.id)

// Effect: on task, tasks change: if task.id && array tasks: children = filter parent===id, setHasChildren >0

// Function: handleEditClick()
// Sets isEditing true

// Function: handleCancelEdit()
// Sets isEditing false

// Function: handleTemplateUpdate(updatedTaskData)
// Calls onEditTask(task.id, updated), sets isEditing false

// Function: formatDisplayDate(dateString)
// If !dateString: 'Not set'
// Try: new Date toLocaleDateString en-US short weekday/year/month/day
// Catch: 'Invalid date'

## TemplateItem.js

### Component: TemplateItem({ task, tasks, expandedTasks, toggleExpandTask, selectedTaskId, selectTask, setTasks, dragAndDrop, onAddTask, parentTasks=[] })
// Uses state: isHovering false
// Extracts dragAndDrop handlers: draggedTask, dropTarget, dropPosition, handleDragStart, handleDragOver, handleDragLeave, handleDragEnd, handleDrop
// IsExpanded = expandedTasks[task.id]
// IsSelected = selectedTaskId === task.id
// HasChildren = some t.parent_task_id === task.id
// Children = filter parent===task.id sort position
// Level = getTaskLevel(task, tasks)
// IsTopLevel = !parent_task_id
// BackgroundColor = getBackgroundColor(level)
// IsDropTarget = dropTarget && dropTarget.id === task.id
// IsBeingDragged = draggedTask && draggedTask.id === task.id
// ChildrenContent: if expanded && hasChildren: div padding left top0, map children to TemplateItem key id with props, parentTasks [...parentTasks, task]
// Returns div id=template-{id} class task-container being-dragged if, margin selected 0 4 else 0, marginBottom 4, transition margin
// Header class task-header drop-target-into if drop 'into', selected-template if selected, draggable !topLevel, onDragStart handle(e, task) if, onDragOver handle(e, task) if, onDragLeave handle if, onDragEnd handle if, onDrop handle(e, task) if, onClick selectTask(id), onMouseEnter setHover true, Leave false, style bg backgroundColor white text padding radius cursor pointer/move if !topLevel, opacity 0.5 if beingDragged, boxShadow hover, transition all
// Flex between align: flex align center gap
// If hasChildren: button bg none border none white cursor padding font large {expanded ▼ else ►} onClick toggleExpandTask(id) stopProp
// Title h4 bold flex1 margin0 truncate {title or Untitled Template}
// If !topLevel && hover: button Add Child bg white opacity border white radius cursor flex center margin left small bold + onClick onAddTask(task.id) stopProp opacity hover 1/0 transition
// Div flex align: div small margin right opacity 0.8 {duration_days or default_duration or 1} day/s
// Button view details bg white opacity border white radius white cursor padding small flex align margin right small {selected 'Selected' : 'Details'} ⓘ onClick selectTask(id) stopProp title view
// If hasChildren: button toggle bg none border none white cursor padding large {expanded ▼ : ►} onClick toggleExpandTask(id) stopProp title show/hide
// If isDropTarget && drop 'into': div abs top100 left24 right8 height2 bg green radius z5 shadow green
// {childrenContent}

// Function: handleDragStart(e, task)
// If !parent: preventDefault return
// ... (other drag logic if provided)

## TemplateList.js

### Component: TemplateList()
// Uses useTasks: templateTasks as tasks, loading, initialLoading, error, fetchTasks, setTasks, createTask, deleteTask, updateTask
// Ref: isMountedRef true
// Uses state: expandedTasks {}, selectedTaskId null, isRefreshing false
// Uses state: isCreatingNewTemplate false, addingChildToTemplateId null
// Uses state: draggedTask null, dropTarget null, dropPosition null
// Returns div flex height calc100vh-100
// Left flex1 60% margin right24 overflow auto
// Div flex between align margin bottom: h1 1.5 bold Templates, div gap: button New Template bg green white padding radius cursor onClick handleCreateNewTemplate
// Button Refresh bg blue white padding radius cursor not/pointer opacity 0.7/1 disabled loading or refreshing, text Refreshing... or Refresh onClick handleRefresh
// If initialLoading: div center padding: spinner div width40 height40 border gray top blue radius50 anim spin, p margin gray Loading...
// If error: div bg red light border red text red padding radius margin {error}
// Else: div renderTopLevelTemplates()
// Right flex1 40% minW300 maxW500 renderRightPanel()

// Effect: cleanup isMountedRef false

// Function: handleRefresh()
// Sets isRefreshing true
// Await fetchTasks(true)
// Catch console
// Finally isRefreshing false

// Function: handleCreateNewTemplate()
// Sets addingChild null, isCreatingNew true

// Function: handleAddTemplateTask(parentId)
// Sets isCreatingNew false, addingChild parentId

// Function: cancelTemplateCreation()
// Sets isCreatingNew false, addingChild null

// Function: toggleExpandTask(taskId, e)
// Prevent stopProp
// Sets expanded {...prev, [id]: !prev[id]}

// Function: selectTask(taskId, e)
// If e prevent stopProp
// Sets selected prev===id ? null : id

// Computed: selectedTask = find by selectedTaskId

// Const: simpleDragAndDrop = {draggedTask, dropTarget, dropPosition, handleDragStart: (e,task) if !parent prevent else setDragged task, dataTransfer effect move, ... other handlers}

// Function: handleCreateTemplate(newTemplateData)
// Await createTask({ ...newTemplateData, origin: 'template', parent_task_id: addingChildToTemplateId })
// If mounted: setTasks append newTask, cancelCreation

// Function: handleEditTemplate(taskId, updatedTaskData)
// Await updateTask(taskId, { ...updatedTaskData, origin: 'template' })
// If mounted: setTasks map replace id with updated

// Function: handleDeleteTemplate(taskId)
// If confirm: await deleteTask(taskId)
// If mounted: setTasks filter !id, setSelected null

// Function: renderTopLevelTemplates()
// TopLevel = filter !parent sort position
// If !length: div padding center gray: large 📄, h3 bold No templates, p small Create your first
// Else: map topLevel to TemplateItem key id with props tasks, expandedTasks, toggleExpand, selectedTaskId, selectTask, setTasks, dragAndDrop=simpleDragAndDrop, onAddTask=handleAddTemplateTask

// Function: renderRightPanel()
// If isCreatingNewTemplate: CreateNewTemplateForm onSubmit handleCreateTemplate, onCancel cancelCreation
// Else if addingChildToTemplateId: TemplateTaskForm parentTaskId=addingChild, onSubmit handleCreateTemplate, onCancel cancelCreation, backgroundColor getBackgroundColor(getTaskLevel(find by id, tasks) +1)
// Else if selectedTask: TemplateDetailsPanel task=selected, tasks, onClose setSelected null, onAddTask handleAddTemplateTask, onDeleteTask handleDeleteTemplate, onEditTask handleEditTemplate
// Else: div padding center gray: large 🔍, h3 bold Select a template, p small Click template to view details