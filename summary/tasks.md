# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`HTML5DragDropZone.js`, `TaskList.js`, `TaskList.css`, `TaskDetailsPanel.js`, `TaskItem.js`, `TaskUIComponents.js`, `TaskForm.js`, `TemplateTaskForm.js`, `NewProjectForm.js`, `useTemplateTaskForm.js`, `useTaskForm.js`, and `CreateNewTemplateForm.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details. Note that `TaskList.css` is a stylesheet; its summary focuses on key style rules affecting UI behavior, particularly drag-and-drop interactions.

## HTML5DragDropZone.js

### Component: HTML5DragDropZone({ type 'between' or 'into', parentId, position, level=0, onDropBetween, onDropInto, isDragActive=false, className='', style={}, children=null, showWhenInactive=false, customColors=null, debugMode=false })
// Uses state: isHovering false, dragEnterCount 0
// Returns if !isDragActive && !showWhenInactive: div onDragEnter/Over/Leave/Drop handlers, height 2px margin 1px 0, style, className
// Gets colors = customColors or default {between: active blue, inactive blue light, hover dark blue, shadow blue; into: active green, inactive green light, hover dark green, shadow green}
// If type 'between': div class html5-drop-zone-between hovering if, onDragEnter/Over/Leave/Drop handlers, style height 12/6px if hovering, margin 2px 0 left 16+level*24, bg active/inactive if hovering, border solid/dashed hover/inactive if, flex center, font small bold, color white/hover, opacity 1/0.7, shadow if hovering, cursor copy/default, transform scaleY 1.5/1 if hovering, animation pulse if hovering, data attrs type/parent/position/level
// If hovering: span margin right 4 ⬇️, span Drop here, span margin left 4 ⬇️
// If debugMode: div abs top -20 left 0 small bg black 0.7 white padding radius nowrap between:{parentId}/{position}
// {children}
// If type 'into': div class html5-drop-zone-into hovering if, onDragEnter/Over/Leave/Drop handlers, style minHeight 32/20px if hovering, margin 4px 0 left 32+level*24 right 8, border dashed active/inactive if hovering, bg active15/inactive10, flex center, font 12/10px, color hover/inactive, font bold/normal if hovering, transition all, shadow if hovering, cursor copy/default, transform scale 1.02/1 if hovering, filter drop-shadow if hovering, data attrs type/parent/position/level
// If hovering: div flex center gap 6 animation pulse: span 📂, span Drop to add as child
// Else: div opacity 0.6 font 11 italic Child task area
// If debugMode: div abs top -20 left 0 small bg black 0.7 white padding radius nowrap into:{parentId}
// {children}
// Fallback unknown: div onDragEnter/Over/Leave/Drop handlers, class html5-drop-zone-unknown, style padding 8 border dashed red radius bg red light color dark red font 12 center, ⚠️ Unknown drop zone type: {type} {children}

// Function: handleDragEnter(e)
// PreventDefault stopProp
// Set dragEnterCount +1, isHovering true
// If debug: console DropZone dragEnter type at parent/position

// Function: handleDragOver(e)
// PreventDefault stopProp
// DataTransfer dropEffect move
// If !isHovering set true

// Function: handleDragLeave(e)
// PreventDefault stopProp
// Set dragEnterCount prev-1, if <=0 set isHovering false return 0 else return newCount
// If debug && dragEnterCount <=1: console DropZone dragLeave type at parent/position

// Function: handleDrop(e)
// PreventDefault stopProp
// DraggedId = dataTransfer text/plain
// If debug: console DropZone drop type at parent/position {draggedId}
// Set isHovering false, dragEnterCount 0
// If type between && onDropBetween: onDropBetween(draggedId, parentId, position)
// Else if type into && onDropInto: onDropInto(draggedId, parentId)

### Component: DropZoneGroup({ children, beforeZone=null, afterZone=null, intoZone=null, spacing='4px' })
// Returns div class drop-zone-group, style pos relative margin spacing
// {beforeZone}
// Div pos relative: {children} {intoZone}
// {afterZone}

### Component: SmartDropZone({ type, parentTask, insertIndex, allTasks, onDrop, isDragActive, debugMode=false })
// Level = parentTask.level+1 or 0
// Siblings = filter allTasks parent===parent.id
// Position = insertIndex
// Function: handleDrop(draggedId, parentId, pos)
// If onDrop: onDrop {draggedId, parentId, position pos, insertIndex, type, parentTask, siblings}
// Returns HTML5DragDropZone type, parentId=parent.id or null, position, level, onDropBetween=handleDrop if between, onDropInto=handleDrop if into, isDragActive, debugMode

## TaskList.js

### Component: TaskList()
// Uses refs: isMountedRef true, initialFetchDoneRef false
// Uses useTasks: instanceTasks as tasks, loading, initialLoading, error, fetchTasks, setTasks, createTask, selectedLicenseId, userHasProjects, updateTaskDates, getTaskStartDate, getTaskDueDate, handleOptimisticDragDrop, updateTasksOptimistic, recalculateDatesOptimistic, syncTaskPositionToDatabase, restContext
// Uses useSearch: isSearchActive, filteredTasks
// Uses state: expandedTasks {}, selectedTaskId null, addingChildToTaskId null, isCreatingProject false, projectLicenseId null, isRefreshing false, isCreatingFromTemplate false, showProjectMenu false, showInvitationTest false, showSearchResults false, draggedTask null, dragHoverTarget null
// Returns div padding 20 maxW1200 margin auto
// If draggedTask && dev: div fixed top10 right10 bg orange white padding radius small z1000 shadow: Dragging {title}, From {parent or root}, Target {hover title or none}
// Div flex height calc100vh-100
// Left flex1 60% margin right24 overflow auto: SearchBar onToggleResults=toggleSearchResults
// Header flex between align margin bottom24: h1 1.5 bold Projects, div gap: button Invitations bg purple white padding radius cursor onClick toggle showInvitationTest 🧪
// Dropdown pos relative: button New Project bg green white padding radius cursor flex center ▼ onClick toggle showProjectMenu
// If showProjectMenu: div abs top100 left0 z10 bg white border gray radius shadow width200 margin top4: div padding cursor onClick handleCreateNewProject setMenu false Blank Project, divider, div padding cursor onClick handleCreateFromTemplate setMenu false From Template
// Button Refresh bg blue white padding radius cursor/disabled opacity 0.7/1 disabled loading/refreshing, text Refreshing... or Refresh onClick handleRefresh
// Search banner if isSearchActive && !showResults: div padding bg blue light border blue radius margin bottom flex between align: span small blue {filtered length} task/s match, button none border none blue cursor underline View Results onClick setShow true
// If initialLoading: div center padding: spinner div 40 border gray top blue radius anim spin, p margin gray Loading...
// Else if error: div bg red light border red text red padding radius margin {error}
// Else if visibleTasks length===0: div center padding gray: p No projects, button Create First bg green white padding radius cursor margin top onClick handleCreateNewProject
// Else: div renderTasksWithHTML5DropZones()
// Right flex1 40% minW300 maxW500 renderRightPanel()
// If showSearchResults: SearchResults onTaskSelect=handleTaskSelectFromSearch onClose setShow false

// Effect: if !initialFetchDone: set true
// Return: set isMounted false
// Effect: if selectedLicenseId: set projectLicenseId

// Computed: getVisibleTasks memo tasks expandedTasks
// Result = [], addTaskAndChildren(task, level=0): push {task level}, if expanded: children filter parent===id sort position, forEach child addTaskAndChildren child level+1
// TopLevel = filter !parent sort position, forEach top addTaskAndChildren
// Return result

// Function: hasChildren(task)
// Return some tasks parent===id

// Function: handleDragStart(task)
// If !parent: console Cannot drag top-level, return false
// If locked or archived: console Cannot drag, return false
// Set draggedTask, dragHoverTarget null
// Console Drag started
// Return true

// Function: handleDragEnd()
// Set dragged null, hover null
// Console Drag ended

// Function: handleDragOver(task, event)
// If !dragged or task.id===dragged.id: set hover null return
// If event enter or over: if task: draggedIndex findIndex id===dragged, targetIndex findIndex id===task, set hover {task, position: draggedIndex<targetIndex below else above}
// Else if leave: set hover null

// Function: handleDropOnTask(draggedId, targetId)
// Find draggedObj, targetTask by id, if !: return
// Console Task dropped onto: {dragged title, target title, sameParent}
// DropInfo = {type onto, targetTaskId, draggedId}
// PositionResult = calculateHTML5DropPosition(dropInfo, tasks)
// If !success: console Invalid drop reason return
// HandleOptimisticDragDrop draggedId, newParentId, newPosition, dragged parent
// Set hover null

// Function: handleDropBetween(draggedId, parentId, position)
// Find draggedObj by id, if !: return
// Console Dropped between position
// DropInfo = {type between, parentId, position, draggedId}
// PositionResult = calculateHTML5DropPosition(dropInfo, tasks)
// If !success: console Invalid drop reason return
// HandleOptimisticDragDrop draggedId, newParentId, newPosition, dragged parent
// Set hover null

// Function: handleDropInto(draggedId, parentId)
// Find draggedObj by id, if !: return
// Console Dropped into parent
// DropInfo = {type into, parentId, draggedId}
// PositionResult = calculateHTML5DropPosition(dropInfo, tasks)
// If !success: console Invalid drop reason return
// HandleOptimisticDragDrop draggedId, newParentId, newPosition, dragged parent
// Set hover null

// Function: handleRefresh()
// Try setRefreshing true, await fetchTasks true
// Catch console
// Finally setRefreshing false

// Function: toggleExpandTask(taskId, e)
// e? prevent stopProp
// Set expanded {prev, [id]: !prev[id]}

// Function: selectTask(taskId, e)
// e? prevent stopProp
// Set selected prev===id ? null : id

// Function: handleTaskSelectFromSearch(task)
// Set selected id, showResults false

// Function: toggleSearchResults()
// Set show prev !prev

// Function: renderTasksWithHTML5DropZones() (truncated in code, but implies rendering tasks with drop zones between/into using HTML5DragDropZone, levels, etc.)
// For each visibleTask: TaskItem with props task, level, expanded, toggle, selected, select, onAddChild=handleAddChildTask, hasChildren=hasChildren(task), toggleCompletion, isDragging=dragged?.id===task.id, dragHoverTarget, onDragStart=handleDragStart, onDragEnd, onDragOver=handleDragOver, onDrop=handleDropOnTask
// Insert HTML5DragDropZone type between/into where appropriate for positions

// Function: renderRightPanel() (includes logic for creating project, from template, details, etc.)
// If isCreatingProject: NewProjectForm onSubmit handleCreateProjectSubmit, onCancel handleCancelCreateProject, licenseId=projectLicenseId
// Else if isCreatingFromTemplate: TemplateProjectCreator onSuccess handleTemplateSuccess, onCancel handleCancelFromTemplate, userHasProjects
// Else if addingChildToTaskId: find task by id, if found: TaskForm initialData null, parentTaskId=addingChild, onSubmit handleAddChildTaskSubmit, onCancel handleCancelAddTask, bg getBackgroundColor getTaskLevel(task, tasks), originType instance
// Else if selectedTaskId: find task by id, if found: TaskDetailsPanel key id-complete, task, tasks, toggleTaskCompletion, onClose setSelected null, onAddChildTask handleAddChildTask, onDeleteTask handleDeleteTask, onEditTask handleEditTask
// Else: EmptyPanel message Select a project to view details, icon 🔍

// Additional functions: handleCreateNewProject, handleCreateFromTemplate, handleAddChildTask, handleCancelAddTask, handleDeleteTask (with confirm), handleEditTask, etc. (truncated, but include CRUD ops with optimistic updates, date recalcs, sync to DB)

## TaskList.css

// CSS file summarizing key style rules, especially for drag-drop
// .task-item[data-is-dragging=true]: opacity 0.4, transform scale 1.02 rotate 1deg, z1000, shadow, cursor grabbing, transition none
// .task-item[data-is-drop-target=true]: transform scale 1.01, z5, shadow purple, bg purple, transition all
// .task-item .drag-handle: opacity 0.6, cursor grab, transition opacity color, user-select none, touch-action none
// Hover: opacity 0.9
// Dragging: opacity 1, cursor grabbing, color white, shadow text
// Draggable true: cursor grab, active grabbing
// .html5-drop-zone-between: transition all, pos relative overflow hidden
// Hovering: anim pulse-blue, transform scaleY 1.5
// ::before bg linear blue, opacity 0/1 hovering, anim shimmer
// .html5-drop-zone-into: transition all, pos relative overflow hidden
// Hovering: anim pulse-green, transform scale 1.02, filter shadow green
// ::before bg linear green, opacity 0/1 hovering, anim shimmer-green
// .insert-line: abs left right, height 4 bg linear blue, radius, z10, anim insert-line-pulse, shadow blue
// ::before abs top50 left right height2 bg white opacity 0.8 transform translateY -50
// Keyframes for pulse-blue/green, insert-line-pulse, shimmer/green, task-reorder, shake, sync-progress, glow-rotate
// Media hover none pointer coarse: larger drag-handle, minHeight zones
// Prefers-contrast high: borders black, bg yellow/white
// Prefers-reduced-motion: no anim/transition, no transform
// Focus-within: outline blue
// GPU accel: transform translateZ0, backface hidden, perspective
// Will-change for drag ops
// .task-item[data-is-drop-target=true]::after abs glow linear purple, opacity 0.3 anim glow-rotate
// .task-item.drag-success: anim task-reorder
// .task-item.syncing::before abs sync anim linear white
// .task-item.drag-error: anim shake, border red
// Browser fixes for FF/Safari user-select etc.

## TaskDetailsPanel.js

### Component: TaskDetailsPanel({ task, tasks, onClose, onAddTask, onDeleteTask, onEditTask })
// Uses state: isEditing false, isLoading true, projectMembers [], membersLoading false, membersError null
// Uses useTasks: loading contextLoading, getTaskStartDate, getTaskDueDate, getTaskDuration, isTaskOverdue, isTaskDueToday, taskDates, datesCalculating
// Returns if !task: null
// If isLoading: div bg gray light radius border height100 flex center: div center: spinner div border gray/right blue/bottom left gray radius anim spin, p Loading...
// Level = getTaskLevel, bg = getBackgroundColor
// IsTopLevel = !parent
// HasChildren = some parent===id
// ParentTask = find parent===task.parent
// Children = filter parent===id sort position
// CalculatedDuration = getEffectiveDuration() try getTaskDuration(id) catch duration_days or 1
// ActualDueDate = getCalculatedDueDate() try getTaskDueDate(id) toISO or due_date catch due_date
// ActualStartDate = getCalculatedStartDate() try getTaskStartDate(id) toISO or start_date catch start_date
// TaskIsOverdue = isTaskOverdue(id)
// TaskIsDueToday = isTaskDueToday(id)
// Actions = parseArrayField(task.actions) if array return, else if string try JSON.parse array or [field], else []
// Resources = if array return else []
// StoredDuration = duration_days or 1
// If isEditing: TaskForm initialData=task, parentTaskId=parent.id, onSubmit handleTaskUpdate, onCancel handleCancelEdit, bg, isEditing true, tasks
// Else: div class task-details-panel bg gray light radius border height100 overflow auto
// Header bg bgColor text white padding radius top pos relative: flex justify between? (truncated, but includes title, close button)
// Content details: parent name, level, days from start, duration (with calc if children), default duration, start/due dates with status overdue/today, purpose, description, actions/resources as lists
// If topLevel: Project Members section, if loading: spinner, if error: message, else table or list with name, email, role badge, status badge
// If children: Children Tasks section with list of children titles, dates, durations with calc badge
// If dev && taskDates[id]: details summary Date Calculation Details: cached start/due/duration/version
// Created/Modified dates
// Action buttons: Edit, Add Child, Delete

// Effect: if !contextLoading && task: setLoading false
// Effect: if !loading && task && !parent: fetchProjectMembers async setLoading true error null, try result=await getProjectMembers(id), if error setError setMembers[], else setMembers data or [], catch setError setMembers[], finally setLoading false

// Function: getEffectiveDuration()
// Try return getTaskDuration(id) catch console warn return duration_days or 1

// Function: getCalculatedDueDate() / getCalculatedStartDate() similar try getTaskDueDate/StartDate toISO or stored, catch stored

// Function: getTaskProperties(targetTask)
// HasChildren = some parent===id
// Try calculatedDuration = if hasChildren getTaskDuration else duration_days or 1, catch duration_days or 1
// Return {hasChildren, calculatedDuration, effectiveDuration=calculated, isCalculated=hasChildren}

// Function: parseArrayField(field)
// If array return, if !field [] , if string trim==='' [] , try JSON.parse if array return else [], catch console warn return [field], else []

// Function: getRoleDisplay(role) / getStatusDisplay(status)
// Return {label, color, bgColor} maps for owner/full/limited/coach etc.

// Function: handleEditClick()
// Set isEditing true

// Function: handleCancelEdit()
// Set isEditing false

// Function: handleTaskUpdate(updated)
// OnEditTask(id, updated), setEditing false

## TaskItem.js

### Component: TaskItem({ task, tasks, level=0, expandedTasks, toggleExpandTask, selectedTaskId, selectTask, onAddChildTask, hasChildren=false, toggleTaskCompletion, isDragging=false, dragHoverTarget=null, onDragStart, onDragEnd, onDragOver, onDrop })
// Uses useTasks: getTaskStartDate, getTaskDueDate, getTaskDuration, isTaskOverdue, isTaskDueToday
// Uses state: isHovering false
// Bg = getBackgroundColor(level)
// IsExpanded = expanded[task.id]
// IsSelected = selected===id
// IsTopLevel = level===0
// IsDropTarget = hover?.id===id && !isDragging
// ShouldShowInsertLine = isDropTarget && hover?.position
// IsDragHandle = !isTopLevel
// CalculatedDuration = getTaskDuration(id)
// CalculatedDueDate = getTaskDueDate(id)
// TaskIsOverdue = isTaskOverdue(id)
// TaskIsDueToday = isTaskDueToday(id)
// Returns div pos relative onMouseEnter/Leave setHover
// If shouldShowInsertLine==='above': div abs top -2 left 12+level*24 right0 height4 bg blue radius z10 shadow blue anim pulse
// Task header div draggable=isDragHandle, onDragStart/End/Enter/Over/Leave/Drop handlers, onClick selectTask, style getTaskStyle() bg, padding left indent, radius, cursor grab/grabbing/pointer, flex between align bold, shadow if selected, transition, margin if selected, pos relative marginBottom2, opacity 1/0.4 if dragging, transform scale/rotate if dragging/drop, zIndex if dragging/drop
// Class task-item data-task-id data-is-dragging data-is-drop-target
// Left div flex center flex1: if !topLevel: span margin right8 cursor grab/grabbing opacity hover/dragging, font14 transition, color white/drop, shadow text if dragging, title Dragging... or Drag to reorder ⋮⋮
// Input checkbox checked complete, onChange toggleCompletion stopProp, margin right12 cursor pointer
// Span textDec line-through if complete, opacity 0.7/1 if complete, flex1 margin right12, font bold/normal if dragging, shadow text if dragging: {title} if dragging (moving...) if dropTarget ⬅️
// Button onClick handleAddChildClick stopProp, title Add sub-task, margin left/right8, opacity hover&&!dragging 1 else 0 transition, bg white.25 none border radius50 width height24 color white cursor bold font14 flex center +
// Right div flex center gap8: div flex center small: span {calculatedDuration} day/s, if hasChildren span small opacity0.7 margin left4 (calc)
// If calculatedDueDate: span small color red light/yellow light/white.9 nowrap Due: {formatDisplayDate} if overdue ⚠️ if dueToday 📅
// If hasChildren: button onClick handleExpandClick stopProp, title Collapse/Expand subtasks, none border color white cursor font16 padding4 flex center radius transition bg hover white0.1/transparent opacity dragging 0.5/1 ▼/►
// If shouldShowInsertLine==='below': div abs bottom -2 left 12+level*24 right0 height4 bg blue radius z10 shadow blue anim pulse

// Function: getTaskStyle()
// Base style bg color white padding12 left12+level*24 radius4 cursor grab/grabbing/pointer if handle/dragging, flex between align bold, shadow selected white then bgColor, transition all except dragging none, margin selected 0 4 else 0, pos relative marginBottom2, opacity dragging 0.4 else 1, transform dragging scale1.02 rotate1deg else dropTarget scale1.01 else1, z dragging1000 drop5 else1
// If dropTarget: bg level0 green else purple, shadow purple
// If dragging: shadow black, bg blue
// Return baseStyle

// Function: handleDragStart(e)
// If topLevel: prevent return
// Console TaskItem drag start title
// DataTransfer text/plain id, effectAllowed move
// If onDragStart: success=onDragStart(task), if ! prevent
// Function: handleDragEnd(e)
// Console TaskItem drag end title
// If onDragEnd: onDragEnd()
// Function: handleDragEnter(e)
// Prevent, if onDragOver: onDragOver(task, 'enter')
// Function: handleDragOver(e)
// Prevent, dropEffect move, if onDragOver: onDragOver(task, 'over')
// Function: handleDragLeave(e)
// If !currentTarget contains relatedTarget: if onDragOver: onDragOver(null, 'leave')
// Function: handleDrop(e)
// Prevent, draggedId=dataTransfer text/plain
// Console TaskItem drop {draggedId, targetId}
// If onDrop && dragged!==target: onDrop(draggedId, target.id)

// Function: handleToggleCompletion(e)
// StopProp, await toggleTaskCompletion(id, complete, e)

// Function: handleTaskClick(e)
// SelectTask(id, e)

// Function: handleExpandClick(e)
// StopProp, toggleExpandTask(id, e)

// Function: handleAddChildClick(e)
// StopProp, onAddChildTask?(id)

## TaskUIComponents.js

### Component: EmptyPanel({ message, icon })
// Returns div flex col center justify height100 text gray bg gray50 radius border dashed gray p6
// {icon or svg path polyline lines for document icon}
// P margin top4 center {message}

### Component: DeleteConfirmation({ onConfirm, onCancel, message, title='Confirm Deletion' })
// Returns div fixed inset0 bg black 0.5 flex center z50
// Div bg white radius p6 w96 shadow: h3 margin0 text red text xl bold margin bottom4 {title}
// P margin bottom6 gray {message}
// Div flex end gap3: button onCancel py2 px4 radius border gray bg white hover gray50 cursor transition Cancel
// Button onConfirm py2 px4 radius none bg red hover red600 white cursor transition Delete

### Component: ProjectForm({ formData, onFieldChange, onArrayChange, onAddArrayItem, onRemoveArrayItem, onSubmit, onCancel, backgroundColor='#3b82f6', formTitle='Create New Project' })
// Function: handleSubmit(e)
// Prevent, onSubmit()
// Returns div bg gray50 radius border gray height100 overflow auto
// Div text white p4 radius top md bg {backgroundColor}: flex between center: h3 text lg bold margin0 {formTitle}, button onCancel bg white0.2 radius full w h6 flex center small border none hover white0.3 transition ✕
// Form onSubmit handleSubmit p4
// Div margin bottom4: label block bold margin bottom1 Project Title *, input id title text value=title onChange fieldChange title, w full p2 radius border gray focus outline none ring blue border transparent required
// Div margin bottom4: label Purpose, textarea id purpose value=purpose onChange fieldChange purpose rows2 w full p2 radius border gray focus ring blue resize vertical
// Div margin bottom4: label Description, textarea id description value=description onChange fieldChange description rows3 w full p2 radius border gray focus ring blue resize vertical
// Div margin bottom4: div flex gap4: div flex1 label Start Date, input date value=start_date or '' onChange fieldChange start_date w full p2 radius border gray focus ring blue
// Div flex1 label Due Date, input date value=due_date or '' onChange fieldChange due_date w full p2 radius border gray focus ring blue
// Div margin bottom4: label Actions, map actions to div flex margin bottom2 center: input text value=action onChange arrayChange actions index, flex1 p2 radius border gray focus ring blue placeholder Enter action
// Button type button onClick removeArrayItem actions index, margin left2 p2 radius none bg gray100 hover200 cursor transition ✕
// Button type button onClick addArrayItem actions, py1 px2 radius border gray bg white hover gray50 cursor flex small transition Add Action mr1 +
// Div margin bottom6: label Resources, map resources similar to actions with input, remove button
// Button addArrayItem resources similar Add Resource
// Div flex end gap3: button type button onCancel py2 px4 radius border gray bg white hover gray50 cursor transition Cancel
// Button submit py2 px4 radius none bg green hover green600 white cursor transition Create Project

### Component: TemplateSelector({ templates, selectedTemplateId, onTemplateSelect, onCancel, onContinue })
// Returns div bg gray50 radius border gray height100 overflow auto
// Div bg blue text white p4 radius top md: flex between center: h3 lg bold margin0 Select a Template, button onCancel bg white0.2 radius full w h6 flex center small none hover white0.3 transition ✕
// Div p4: p margin bottom4 Choose template for new project
// If !templates length: div gray center py6 No templates available...
// Else: div flex col gap3 map templates: div key id onClick select id, bg getBackgroundColor0 text white p3 radius cursor bold border2 transition shadow if selected white shadow lg else transparent hover shadow {title}
// If selectedId: div margin top6 right: button onContinue bg green hover600 white py2 px4 radius none transition Continue

## TaskForm.js

### Component: TaskForm({ parentTaskId, parentStartDate, onSubmit, onCancel, backgroundColor, originType='instance', initialData=null, isEditing=false })
// Uses useTaskForm: formData, errors, dateMode, handleDateModeChange, handleChange, handleDateChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData (initialData, parentStartDate)
// SafeActions = array formData.actions else [], safeResources = array formData.resources else []
// Returns div bg gray light radius border height100 overflow auto
// Header bg backgroundColor white text padding radius top flex between center: h3 bold margin0 {getHeaderText() Edit Task or Add Template/Project/Subtask based on editing/initial/parent/origin}, button onCancel bg white0.2 none radius50 white cursor w h24 flex center small ✕
// Form onSubmit handleSubmit padding16
// Div margin bottom16: label block bold margin bottom4 Title *, input id title text value=title or '' onChange handleChange w100 padding8 radius border errors.title red else gray outline none
// If errors.title: p red small margin top4 {errors.title}
// Div margin bottom16 padding12 bg gray light radius: label block bold margin bottom4 Schedule
// Div margin bottom12: label block bold margin bottom4 Date Mode, select value=dateMode onChange handleDateModeChange w100 padding8 radius border gray outline none: option Calculate End Date, option Calculate Duration
// Div margin bottom12: label block bold margin bottom4 Start Date, input date value=start_date or '' onChange handleDateChange w100 padding8 radius border errors.start_date red else gray outline none, small gray italic Parent start: {formatDisplayDate(parentStartDate) or N/A}
// If errors.start_date: p red small margin top4 {errors.start_date}
// If dateMode calculateEndDate: div margin bottom12: label block bold margin bottom4 Duration (days), input number value=duration_days or 1 onChange handleChange min1 w100 padding8 radius border errors.duration_days red else gray outline none
// If errors.duration_days: p red small margin top4 {errors.duration_days}
// Div: label block bold margin bottom4 Due Date, input date value=due_date or '' onChange handleDateChange disabled, w100 padding8 radius border gray outline none opacity 0.7 cursor not-allowed
// Else if calculateDuration: div margin bottom12: label block bold margin bottom4 Due Date, input date value=due_date or '' onChange handleDateChange w100 padding8 radius border errors.due_date red else gray outline none
// If errors.due_date: p red small margin top4 {errors.due_date}
// Div: label block bold margin bottom4 Duration (days), input number value=days_from_start_until_due or 0 onChange handleChange min0 w100 padding8 radius border errors.days_from_start_until_due red else gray outline none opacity 0.7 cursor not-allowed
// If errors.date_range: p red small margin top4 {errors.date_range}
// Div margin bottom16: label block bold margin bottom4 Purpose, textarea id purpose value=purpose or '' onChange handleChange rows3 w100 padding8 radius border errors.purpose red else gray outline none resize vertical
// If errors.purpose: p red small margin top4 {errors.purpose}
// Div margin bottom16: label block bold margin bottom4 Description, textarea id description value=description or '' onChange handleChange rows5 w100 padding8 radius border errors.description red else gray outline none resize vertical
// If errors.description: p red small margin top4 {errors.description}
// Div margin bottom24: label block bold margin bottom4 Actions, map safeActions to div flex margin bottom8 center: input text value=action or '' onChange arrayChange actions index flex1 padding8 radius border gray outline none placeholder Enter action
// Button type button onClick removeArrayItem actions index margin left8 padding8 radius none bg gray light cursor ✕
// Button type button onClick addArrayItem actions padding4 px8 radius border gray bg white cursor flex center small Add Action mr4 +
// Div margin bottom24: label block bold margin bottom4 Resources, map safeResources similar to actions with input, remove button
// Button addArrayItem resources similar Add Resource
// Div flex end gap12: button type button onCancel padding8 px16 radius border gray bg white cursor Cancel
// Button submit padding8 px16 radius none bg green white cursor {editing or initial Update Task else Add Task}

// Function: handleSubmit(e)
// PreventDefault
// If validateForm(): cleaned=prepareFormData(), onSubmit {...cleaned, parent_task_id, origin:originType, is_complete=formData.is_complete or false}

## TemplateTaskForm.js

### Component: TemplateTaskForm({ parentTaskId, onSubmit, onCancel, backgroundColor, initialData=null, isEditing=false, tasks=[] })
// Uses state: formData {title '', purpose '', description '', actions [''], resources [''], duration_days 1, days_from_start_until_due 0, ...initialData}, errors {}, hasChildren false, minRequiredDuration 1
// SafeActions = array formData.actions else [], safeResources = array formData.resources else []
// Returns div bg gray light radius border height100 overflow auto
// Header bg backgroundColor white text padding radius top flex between center: h3 bold margin0 {isEditing Edit Template else Add Child Template}, button onCancel bg white0.2 none radius50 white cursor w h24 flex center small ✕
// Form onSubmit handleSubmit padding16
// Div margin bottom16: label block bold margin bottom4 Title *, input id title text value=title onChange handleChange w100 padding8 radius border errors.title red else gray outline none
// If errors.title: p red small margin top4 {errors.title}
// Div margin bottom16: label block bold margin bottom4 Duration (days) *, input id duration_days number value=duration_days onChange handleChange min minRequiredDuration w100 padding8 radius border errors.duration_days red else gray outline none
// If hasChildren: p small gray italic Calculated minimum: {minRequiredDuration} days based on child templates
// If errors.duration_days: p red small margin top4 {errors.duration_days}
// Div margin bottom16: label block bold margin bottom4 Days from Start until Due, input id days_from_start_until_due number value=days_from_start_until_due or 0 onChange handleChange min0 w100 padding8 radius border errors.days_from_start_until_due red else gray outline none
// If errors.days_from_start_until_due: p red small margin top4 {errors.days_from_start_until_due}
// Div margin bottom16: label block bold margin bottom4 Purpose, textarea id purpose value=purpose onChange handleChange rows3 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom16: label block bold margin bottom4 Description, textarea id description value=description onChange handleChange rows5 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom24: label block bold margin bottom4 Actions, map safeActions to div flex margin bottom8 center: input text value=action or '' onChange arrayChange actions index flex1 padding8 radius border gray outline none placeholder Enter action
// Button type button onClick removeArrayItem actions index margin left8 padding8 radius none bg gray light cursor ✕
// Button type button onClick addArrayItem actions padding4 px8 radius border gray bg white cursor flex center small Add Action mr4 +
// Div margin bottom24: label block bold margin bottom4 Resources, map safeResources similar to actions with input, remove button
// Button addArrayItem resources similar Add Resource
// Div flex end gap12: button type button onCancel padding8 px16 radius border gray bg white cursor Cancel
// Button submit padding8 px16 radius none bg green white cursor {isEditing Update Template else Add Child Template}

// Effect: if isEditing && initialData.id && array tasks: childExists=some parent===id, setHasChildren, if childExists: calculated=calculateParentDuration(id, tasks), setMinRequiredDuration

// Function: handleChange(e)
// Name value = target, setFormData prev {...prev, [name]:value}, if errors[name] delete error
// Function: handleArrayChange(type, index, value)
// SetFormData prev currentArray=array prev[type] else [''], newArray=[...], newArray[index]=value, {...prev, [type]:newArray}
// Function: addArrayItem(type)
// SetFormData prev currentArray=array prev[type] else [''], {...prev, [type]:[...currentArray, '']}
// Function: removeArrayItem(type, index)
// SetFormData prev currentArray=array prev[type] else [''], newArray=[...], splice index1, {...prev, [type]:length===0 ? [''] : newArray}
// Function: validateForm()
// NewErrors {}, if !title trim title required, if !duration_days or <1 duration at least1, setErrors, return keys length===0
// Function: prepareFormData()
// Return {...formData, actions:array actions filter trim!=='' else [], resources similar, duration_days parseInt, days_from_start_until_due parseInt or0, parent_task_id, origin template, is_complete or false}
// Function: handleSubmit(e)
// Prevent, if validateForm(): cleaned=prepareFormData(), if hasChildren && duration<minRequired alert min required but stored display calculated, onSubmit cleaned

## NewProjectForm.js

### Component: NewProjectForm({ onSuccess, onCancel, userHasProjects })
// Uses useAuth: user
// Uses useTasks: createTask, applyLicenseKey
// Uses useTaskForm: formData, errors, setErrors, handleChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData
// Uses state: licenseKey '', licenseStatus '', isSubmitting false, status ''
// Returns div bg gray light radius border height100 overflow auto
// Header bg blue white text padding radius top flex between center: h3 bold margin0 Create New Project, button onCancel bg white0.2 none radius50 white cursor w h24 flex center small ✕
// Form onSubmit handleSubmit padding16
// If userHasProjects: div margin bottom16: label block bold margin bottom4 License Key *, input id licenseKey text value=licenseKey onChange handleLicenseKeyChange w100 padding8 radius border errors.licenseKey red else gray outline none, small gray Enter your license key
// If errors.licenseKey: p red small margin top4 {errors.licenseKey}
// Div margin bottom16: label block bold margin bottom4 Project Title *, input id title text value=title onChange handleChange w100 padding8 radius border errors.title red else gray outline none
// If errors.title: p red small margin top4 {errors.title}
// Div margin bottom16: label block bold margin bottom4 Start Date *, input date value=start_date onChange handleChange w100 padding8 radius border errors.start_date red else gray outline none
// If errors.start_date: p red small margin top4 {errors.start_date}
// Div margin bottom16: label block bold margin bottom4 Duration (days) *, input number value=duration_days onChange handleChange min1 w100 padding8 radius border errors.duration_days red else gray outline none
// If errors.duration_days: p red small margin top4 {errors.duration_days}
// Div margin bottom16: label block bold margin bottom4 Due Date, input date value=due_date onChange handleChange disabled w100 padding8 radius border gray outline none opacity0.7 cursor not-allowed
// Div margin bottom16: label block bold margin bottom4 Purpose, textarea purpose value=purpose onChange handleChange rows3 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom16: label block bold margin bottom4 Description, textarea description value=description onChange handleChange rows5 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom24: label block bold margin bottom4 Actions, map actions to div flex margin bottom8 center: input text value=action onChange arrayChange actions index flex1 padding8 radius border gray outline none placeholder Enter action
// Button type button onClick removeArrayItem actions index margin left8 padding8 radius none bg gray light cursor ✕
// Button type button onClick addArrayItem actions padding4 px8 radius border gray bg white cursor flex center small Add Action mr4 +
// Div margin bottom24: label block bold margin bottom4 Resources, map resources similar
// Button addArrayItem resources similar Add Resource
// If status: div margin bottom16 padding8 radius bg error red light/applied green/validating orange else green, color accordingly {status}
// Div flex end gap12: button type button onCancel padding8 px16 radius border gray bg white cursor Cancel
// Button submit disabled isSubmitting padding8 px16 radius none bg green white cursor not/pointer opacity 0.7/1 Creating... or Create Project

// Function: handleLicenseKeyChange(e)
// SetLicenseKey value, if errors.licenseKey delete, setLicenseStatus ''
// Function: validateProjectForm(formData)
// AdditionalErrors {}, if userHasProjects && !licenseKey trim license required, return additionalErrors
// Function: handleSubmit(e) async
// Prevent, if !validateForm(validateProjectForm) return
// SetSubmitting true
// Try let licenseId null
// If userHasProjects: setStatus validating, licenseResult=await applyLicenseKey trim, console result, if !success setLicenseStatus error throw error or invalid
// LicenseId = result.licenseId or id, console using id, setLicenseStatus success, setStatus applied creating...
// Else setStatus creating...
// Cleaned=prepareFormData()
// TaskData = {...cleaned, origin instance, is_complete false, creator user.id, position0, parent null}
// Result = await createTask(taskData, licenseId)
// If result.error throw
// SetStatus created!
// If onSuccess && result.data onSuccess data
// Catch console error creating, setStatus Error: message
// Finally setSubmitting false

## useTemplateTaskForm.js

### Hook: useTemplateTaskForm(initialData={}, allTasks=[])
// Function: ensureArray(value)
// If array return length>0 value else [''], if undef/null [''], if string try JSON.parse if array length>0 parsed else [''], else [value] else [value]
// ProcessedInitialData = {...initialData}, if initialData try processed.actions=ensureArray(actions), resources similar catch console set [''] [''] else set [''] ['']
// Uses state: formData {title '', purpose '', description '', actions [''], resources [''], default_duration1, duration_days1, ...processed}, errors {}
// Uses state: affectedAncestors [], calculatedDuration=formData.default_duration or1
// Returns {formData, errors, affectedAncestors, calculatedDuration, handleChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData}

// Effect: force actions/resources array if not, setFormData if needsUpdate
// Effect: calculateAncestorImpacts() on formData.default_duration change

// Function: calculateParentDuration(parentId, tasks) callback
// If !parentId or !array tasks or length0 return1
// ChildTasks=filter parent===parentId, if length0 return1
// Sorted=[...] sort position
// TotalDuration=reduce sum, forEach child: hasChildren=some parent===child.id, if hasChildren calculated=recursive(child.id, tasks) else childDuration=child.default_duration or duration_days or1, sum + duration
// Return max1 total

// Function: calculateAncestorImpacts() callback
// If !initialData.parent_task_id or !array allTasks or length0 setAffected [] return
// ParentTask=find id===parent, if ! set [] return
// SimulatedTasks = [...allTasks], currentTaskIndex=findIndex id===initialData.id
// If currentTaskIndex>=0 simulated[currentTaskIndex].default_duration=formData.default_duration
// Impacts = [], currentParentId=parent_task_id
// While currentParentId: currentParent=find id===currentParentId, if ! break
// NewDuration=calculateParentDuration(currentParentId, simulatedTasks)
// If newDuration !== currentParent.duration_days: impacts push {id:currentParentId, oldDuration:currentParent.duration_days, newDuration}
// CurrentParentId=currentParent.parent_task_id
// SetAffectedAncestors impacts

// Function: handleChange(e)
// Name value=target, setFormData prev updated={...prev, [name]:value}, if name default_duration numValue=max1 parseInt or1, updated.default_duration=numValue, hasChildren=some parent===initialData.id, if !hasChildren updated.duration_days=numValue
// If errors[name] delete error

// Function: handleArrayChange/addArrayItem/removeArrayItem similar to TemplateTaskForm.js

// Function: validateForm(additional=()=>{})
// NewErrors {}, if !title trim title required, if !default_duration or <1 duration at least1, additionalErrors=additional(formData), all={...new, ...additional}, setErrors, return keys length===0

// Function: prepareFormData()
// Cleaned={...formData, actions:array actions filter trim!=='' else [], resources similar}
// If cleaned.default_duration parseInt
// If !initialData.id cleaned.duration_days=default_duration
// Return cleaned

## useTaskForm.js

### Hook: useTaskForm(initialData={}, parentStartDate=null)
// Function: ensureArray(value) similar to useTemplateTaskForm.js
// ProcessedInitialData={...initialData}, if initialData try actions=ensureArray, resources=ensureArray catch console set [''] ['']
// Uses state: formData {title '', purpose '', description '', actions [''], resources [''], start_date '', days_from_start_until_due0, duration_days1, due_date '', ...processed}
// Uses state: isManualUpdate false, dateMode 'calculateEndDate', errors {}
// Returns {formData, setFormData, errors, setErrors, dateMode, handleDateModeChange, handleChange, handleDateChange, handleArrayChange, addArrayItem, removeArrayItem, validateForm, prepareFormData}

// Effect: force actions/resources array if not, setFormData if needsUpdate
// Effect: log form data changes on start_date/duration_days/due_date/dateMode/isManualUpdate
// Effect: if isManualUpdate set false return, else if dateMode calculateEndDate && start_date && duration_days: dueDate=calculateDueDate(start_date, parseInt duration), if dueDate setFormData prev {...prev, due_date:dueDate ISO splitT[0], days_from_start_until_due:parseInt duration -1 or0}
// Else if dateMode calculateDuration && start_date && due_date: daysFromStart=calculateDaysFromStart(start_date, due_date), if daysFromStart>=0 setFormData prev {...prev, days_from_start_until_due:daysFromStart, duration_days:daysFromStart+1}
// ValidateDateRange on mode change, clear date_range error on calculateEndDate

// Function: handleDateModeChange(e)
// SetDateMode value

// Function: handleChange(e)
// Name value=target, setIsManualUpdate true, setFormData prev {...prev, [name]:value}, if name duration_days numValue=max1 parseInt or1, setFormData {...prev, [name]:numValue}, if errors[name] delete

// Function: handleDateChange(e)
// Name value=target, setIsManualUpdate true, console handleDateChange {name value}, setFormData prev {...prev, [name]:value}
// If dateMode calculateDuration && (name start/due): start=name===start?value:formData.start, due=name===due?value:formData.due, if start&&due && !isValidDateRange setErrors date_range start before due else delete date_range

// Function: handleArrayChange/addArrayItem/removeArrayItem similar to useTemplateTaskForm.js

// Function: validateForm(additional=()=>{})
// NewErrors {}, if !title trim title required, if dateMode calculateDuration && start_date && due_date && !isValidDateRange date_range start before due, additionalErrors=additional(formData), all={...new, ...additional}, setErrors, return keys length===0

// Function: prepareFormData()
// Cleaned={...formData, actions:array actions filter trim!=='' else [], resources similar}
// If cleaned.duration_days parseInt, if days_from_start_until_due parseInt
// Return cleaned

## CreateNewTemplateForm.js

### Component: CreateNewTemplateForm({ onSubmit, onCancel, backgroundColor='#3b82f6' })
// Uses state: formData {title '', purpose '', description '', actions [''], resources [''], duration_days1}, errors {}
// Returns div bg gray light radius border height100 overflow auto
// Header bg backgroundColor white text padding radius top flex between center: h3 bold margin0 Create New Template, button onCancel bg white0.2 none radius50 white cursor w h24 flex center small ✕
// Form onSubmit handleSubmit padding16
// Div margin bottom16: label block bold margin bottom4 Template Title *, input id title text value=title onChange handleChange w100 padding8 radius border errors.title red else gray outline none
// If errors.title: p red small margin top4 {errors.title}
// Div margin bottom16: label block bold margin bottom4 Duration (days) *, input id duration_days number value=duration_days onChange handleChange min1 w100 padding8 radius border errors.duration_days red else gray outline none
// If errors.duration_days: p red small margin top4 {errors.duration_days}
// Div margin bottom16: label block bold margin bottom4 Purpose, textarea id purpose value=purpose onChange handleChange rows3 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom16: label block bold margin bottom4 Description, textarea id description value=description onChange handleChange rows5 w100 padding8 radius border gray outline none resize vertical
// Div margin bottom24: label block bold margin bottom4 Actions, map actions to div flex margin bottom8 center: input text value=action onChange arrayChange actions index flex1 padding8 radius border gray outline none placeholder Enter action
// Button type button onClick removeArrayItem actions index margin left8 padding8 radius none bg gray light cursor ✕
// Button type button onClick addArrayItem actions padding4 px8 radius border gray bg white cursor flex center small Add Action mr4 +
// Div margin bottom24: label block bold margin bottom4 Resources, map resources similar
// Button addArrayItem resources similar Add Resource
// Div flex end gap12: button type button onCancel padding8 px16 radius border gray bg white cursor Cancel
// Button submit padding8 px16 radius none bg green white cursor Create Template

// Function: handleChange/handleArrayChange/addArrayItem/removeArrayItem/validateForm/prepareFormData/handleSubmit similar to TemplateTaskForm.js, but with origin template, parent null, is_complete false