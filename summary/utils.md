# Consolidated Pseudo-Code Summary of JavaScript Utilities

This document consolidates the pseudo-code summaries from the provided JavaScript files (`taskUtils.js`, `sequentialTaskManager.js`, `dateUtils.js`, `DateCacheEngine.js`, `dragUtils.js`, `sparsePositioning.js`, and `supabaseClient.js`) into a single reference. Each file's functions/classes are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## taskUtils.js

### Function: toDate(value)
```
// Converts various input formats to a valid Date object or null
if value is null or empty: return null
if value is Date and valid: return value
if value is number (timestamp): create Date from it, return if valid else null
if value is string:
  try Date.parse(value), return new Date if valid
  else split by - or /, parse as YYYY-MM-DD, return if valid else null
return null
```

### Function: formatDisplayDate(input, locale='en-US')
```
// Formats date for display like "Fri, Jul 18, 2025" or "Invalid date"
date = toDate(input)
if not date: return 'Invalid date'
return date.toLocaleDateString with options for short weekday, month, numeric day, numeric year
```

### Function: formatDate(input)
```
// Simple local date string or 'N/A'
date = toDate(input)
return date.toLocaleDateString() if date else 'N/A'
```

### Function: getBackgroundColor(level)
```
// Returns color from array based on nesting level, cycles at level >=5
colors = ['#6b7280', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']
if level == 0: return colors[0]
return colors[min(level, colors.length-1)]
```

### Function: getTaskLevel(task, tasks)
```
// Calculates nesting level by traversing parents
if no parent: return 0
level = 1
parentId = task.parent_task_id
while parentId exists:
  level +=1
  find parent, set parentId to its parent
return level
```

### Function: isDescendantOf(potentialChild, potentialParentId, tasks)
```
// Checks if child is descendant by traversing parents
current = potentialChild
while current has parent:
  if parent == potentialParentId: return true
  current = find parent
return false
```

### Function: calculateDueDate(startDate, durationDays)
```
// Adds duration to start date
if no start or duration: return null
due = new Date(startDate)
due.setDate(due.getDate() + durationDays)
return due
```

### Function: calculateStartDate(parentStartDate, position, siblingTasks)
```
// Calculates start based on parent start and previous siblings' durations
if no parentStart: return new Date()
sort siblings by position
start = new Date(parentStartDate)
for i from 0 to position-1:
  dur = sibling[i].default_duration or 1
  start.setDate(start.getDate() + dur)
return start
```

### Function: updateChildDates(tasks, parentId, parentStartDate)
```
// Recursively updates children's start/due dates sequentially
find children sorted by position
if no children: return tasks
updated = copy tasks
cursor = new Date(parentStartDate)
for each child:
  start = cursor
  duration = child.default_duration or 1
  due = calculateDueDate(start, duration)
  update child's start and due in updated
  cursor.setDate(cursor.getDate() + duration)
  recurse: updated = updateChildDates(updated, child.id, start)
return updated
```

## sequentialTaskManager.js

### Function: calculateSequentialStartDates(parentId, parentStartDate, tasks)
```
// Depth-first traversal to set sequential start/due dates
if invalid inputs: return tasks
parentStart = new Date(parentStartDate), check valid
children = filter and sort by position
if no children: return tasks
updatedTasks = copy tasks

// Inner: processTaskDepthFirst(taskId, taskStartDate)
find task index
update task start_date to taskStartDate ISO
find task children sorted
if has children:
  childStartDate = taskStartDate
  for each child:
    childEndDate = recurse processTaskDepthFirst(child.id, childStartDate)
    childStartDate = childEndDate
  set task due_date to lastChildEndDate ISO
  calculate duration_days from span, min 1
else:
  duration = task.duration_days or default_duration or 1
  currentEndDate = taskStartDate + duration days
  set task due_date to currentEndDate ISO
if not root: calculate days_from_start_until_due from parentStart
return currentEndDate

// Process direct children
currentStartDate = parentStart
for each child: childEndDate = processTaskDepthFirst(child.id, currentStartDate), currentStartDate = childEndDate

// Update parent due_date and duration_days to match last child
find parent, set due_date to last child's due_date, calculate duration_days
return updatedTasks on error return original
```

### Function: calculateParentDuration(parentId, tasks)
```
// Recursively sums children's durations sequentially
children = filter by parent, sort by position
if no children: return 1
total = sum over children:
  if child has children: recurse calculateParentDuration(child.id)
  else: child.default_duration or duration_days or 1
return max(1, total)
```

### Function: updateAncestorDurations(taskId, tasks)
```
// Recursively updates parents' duration_days up the chain
updatedTasks = copy tasks
parentId = task.parent_task_id
if no parent: return updatedTasks
processed = set to avoid loops

// Inner: updateParentDuration(currentParentId)
if processed: return
add to processed
newDuration = calculateParentDuration(currentParentId, updatedTasks)
find parent index
if duration_days != newDuration:
  update duration_days
  if parentStart: recalculate sequential dates for children
grandparent = parent.parent_task_id
if grandparent: recurse updateParentDuration(grandparent)

recurse updateParentDuration(parentId)
return updatedTasks on error original
```

### Function: updateAfterReordering(parentId, tasks)
```
// Normalizes positions after reorder, recalculates dates if parent has start
find parent
children = filter and sort by position
normalizedTasks = copy tasks
for i in children: update position to i if different
if parent.start_date: return calculateSequentialStartDates(parentId, parent.start_date, normalizedTasks)
return normalizedTasks on error original
```

### Function: getTasksRequiringUpdates(originalTasks, updatedTasks)
```
// Compares arrays, returns tasks with changed fields (duration_days, start_date, due_date, days_from_start_until_due, position)
tasksToUpdate = []
for updatedTask in updatedTasks:
  original = find match
  if exists and any field differs: add {id, changedFields}
return tasksToUpdate
```

### Function: updateTasksInDatabase(tasksToUpdate, updateTaskFunc)
```
// Async updates each task in DB using func
for task in tasksToUpdate: await updateTaskFunc(task.id, task)
return true on success, false on error
```

## dateUtils.js

### Function: calculateDueDate(startDate, durationDays)
```
// Adds duration to start, returns Date or null
parse startDate if string, check valid
result = new Date(startDate) + parseInt(durationDays) days
return result or null on error
```

### Function: calculateStartDate(parentStartDate, daysFromStartUntil)
```
// Adds days to parent start, returns Date or null
parse parentStartDate if string, check valid
result = new Date(parentStartDate) + parseInt(daysFromStartUntil) days
return result or null on error
```

### Function: calculateTaskEndDate(startDate, durationDays)
```
// Alias for calculateDueDate
```

### Function: determineTaskStartDate(task, allTasks)
```
// Determines start based on parent and siblings
if no parent: return task.start_date or null
find parent, if no start: null
siblings = filter same parent exclude self, sort by position
if position 0 or no siblings: return parent.start_date
find previous sibling by max position < task.position
use previous.due_date if exists, else calculate from previous.start_date + duration
fallback to parent.start_date
```

### Function: calculateSequentialStartDates(rootTaskId, projectStartDate, tasks)
```
// Level-by-level recursive date calculation
updatedTasks = copy tasks
build childrenByParent map, sort each by position

// Inner: processTaskAndChildren(taskId, taskStartDate)
find task, set start_date ISO
duration = duration_days or default_duration or 1
taskEndDate = calculateDueDate(taskStartDate, duration)
set due_date ISO
children = childrenByParent[taskId] or []
currentDate = taskStartDate
for child: processTaskAndChildren(child.id, currentDate), currentDate = child.due_date or after duration

process root with projectStartDate
return updatedTasks
```

### Function: updateTaskDatesInHierarchy(rootTaskId, newStartDate, tasks)
```
// Sets root start_date, then calls calculateSequentialStartDates
update root start_date ISO
return calculateSequentialStartDates(rootTaskId, newStartDate, updatedTasks)
```

### Function: formatDate(date, formatStr='MMM d, yyyy')
```
// Returns formatted string like "Jul 27, 2025" or 'No date'/'Invalid date'
parse date if string, check valid
return manual format with toLocaleString month, getDate, getFullYear
```

### Function: isValidDateRange(startDate, dueDate)
```
// Checks start <= due, true if missing/invalid
parse both, return start <= due or false if invalid
```

### Helper: safeToISOString(date)
```
// Parse if string, return ISO or null if invalid
```

### Function: recalculateTaskDates(task, allTasks)
```
// Updates child's start/due based on parent start + days_from_start_until_due
if parent and days_from_start_until_due:
  find parent start
  newStart = parentStart + days
  set start_date ISO
  if duration_days: set due_date = newStart + duration ISO
return updatedTask
```

### Function: updateDependentTaskDates(parentTaskId, tasks)
```
// Recursively updates all descendants' dates
updatedTasks = copy tasks
children = filter by parent
processed = set

// Inner: updateTaskAndDescendants(taskId)
if processed: return
add processed
update task dates with recalculateTaskDates
find children, recurse on each
for each direct child: updateTaskAndDescendants
return updatedTasks on error original
```

## DateCacheEngine.js

### Class: DateCacheEngine
```
// Initializes cache maps, versions, hashes, flags
```

#### Method: generateCacheKey(tasks, projectStartDate)
```
// Builds key from sorted task structures (id:parent:position:duration), start date, timestamp
```

#### Method: hasTaskStructureChanged(tasks)
```
// Computes structure hash (parents, positions, durations), compares to last, updates last
return true if changed
```

#### Method: generateTaskStructureHash(tasks)
```
// Sorts task strings (id:parent:position:duration), hashes string
```

#### Method: hashString(str)
```
// Simple 32-bit hash loop
```

#### Method: buildDependencyMap(tasks)
```
// Creates map taskId -> {affects: set children/next siblings, affectedBy: set parents/prev siblings}
// Builds from parents and sorted siblings
```

#### Method: calculateTaskDates(task, tasks, projectStartDate, existingDates)
```
// Computes start/due for single task
duration = duration_days or 1
if no parent: start = projectStartDate or now
else:
  find parent start from existing or task
  siblings sorted, find index
  if index >0: start = prev due from existing or estimate from parent + prev durations sum
  else: start = parent start
  override if days_from_start_until_due: start = parentStart + days
due = start + duration
return {start_date ISO, due_date ISO, duration_days, version}
```

#### Method: calculateAllDates(tasks, projectStartDate)
```
// Guards against concurrent calc
forceRecalc if structure changed
newVersion = generateCacheKey
if not force and same version and cache exists: return cache
buildDependencyMap
newCache = map
processed = set

// Inner: process(id)
if processed: return
recurse on affectedBy deps
find task, calc dates using existing newCache
set in newCache, add processed

process all tasks
set cache = newCache
return cache on error existing
```

#### Method: updateTaskDatesIncremental(changedIds, tasks, projectStartDate)
```
// Logs incremental, but forces full calculateAllDates for now
```

#### Method: getTaskLevel(task, tasks)
```
// Traverses parents to count level, max 20
```

#### Method: invalidateCache()
```
// Clears all maps, versions, hashes
```

#### Method: getTaskDates(id)
```
// Returns cache.get(id) or null
```

#### Method: getAllDates()
```
// Returns object from cache
```

#### Method: clearCache()
```
// Calls invalidateCache
```

#### Method: getCacheStats()
```
// Returns sizes, version, flags, hash
```

#### Method: debugCacheState(label)
```
// Logs cache stats and samples if debugMode
```

## dragUtils.js

### Constants
```
DATA_TRANSFER_KEY='text/plain', DROP_EFFECT='move', POSITION_MULTIPLIER=1000, etc.
```

### Function: createDragData(taskId, additionalData)
```
// Returns {taskId, timestamp, ...additionalData}
```

### Function: extractDragData(dataTransfer)
```
// Gets DATA_TRANSFER_KEY, returns {taskId} or null on error
```

### Function: calculateSparsePosition(siblings, insertIndex)
```
// Calculates position for insert: beginning half first or INCREMENT, end last+INCREMENT, between midpoint or +1
```

### Function: calculateDropPosition(draggedTask, targetTask, allTasks, dropType='onto')
```
// Returns {parentId, position, type} based on dropType (onto/into/between)
// onto: same parent reorder insert, different move after
// into: append to children with max+INCREMENT
// between: target position * MULTIPLIER
```

### Function: canTaskBeDragged(task)
```
// False if no parent (top-level), else true (even completed)
```

### Function: canDropOnTarget(draggedTask, targetTask, dropType)
```
// False if same id or descendant cycle
// onto/between: true
// into: true (customizable)
```

### Function: isDescendantOf(potentialDescendant, potentialAncestorId, allTasks)
```
// Traverses parents with visited set, checks match
```

### Function: isTouchDevice()
```
// Checks ontouchstart or maxTouchPoints >0
```

### Function: addTouchSupport(element, handlers)
```
// Adds touchstart/move/end listeners
// start: record pos/time
// move: if distance > ACTIVATION: start drag, call onDragStart/move with deltas
// end: call onDragEnd if dragging
return cleanup removeListeners
```

### Function: addKeyboardDragSupport(element, handlers)
```
// Adds keydown listener
// Space/Enter: toggle grab/drop, call onDragStart/End, aria-grabbed, announce
// Escape: cancel if grabbed, call onDragCancel
// Arrows: if grabbed, call onKeyMove with key
return cleanup
```

### Helper: announceToScreenReader(message)
```
// Creates hidden aria-live div, append/remove after 1s
```

### Functions: add/removeDragClass, add/removeDropTargetClass
```
// Adds/removes class and data attr
```

### Function: debounce(func, wait), throttle(func, limit)
```
// Standard implementations
```

### Function: handleDragError(error, context)
```
// Logs, returns {success false, error msg, context, timestamp}
```

### Function: getBrowserDragSupport()
```
// Checks features: draggable, DataTransfer, ondragstart, touch, pointer
// Returns support obj with isSupported
```

### Function: makeDraggable(element, options)
```
// If !canDrag: null
// Set draggable=true, cursor=grab
// Add dragstart: cursor=grabbing, add class, set dataTransfer, call onDragStart
// dragend: cursor=grab, remove class, call onDragEnd
// dragover: call onDragOver
// Optional: addTouchSupport, addKeyboardDragSupport
return cleanup: remove listeners/attrs/classes
```

## sparsePositioning.js

### Constants
```
POSITION_INCREMENT=1000, MIN_POSITION_GAP=10
```

### Function: calculateInsertPosition(siblings, newPosition)
```
// Beginning: half first or INCREMENT, end: last+INCREMENT, between: midpoint or +1
```

### Function: getNextAvailablePosition(tasks, parentId)
```
// Siblings sorted, return last+INCREMENT or INCREMENT
```

### Function: generateSparsePositions(count, startingPosition=INCREMENT)
```
// Returns array starting + i*INCREMENT
```

### Function: checkIfRenormalizationNeeded(tasks, parentId)
```
// Siblings sorted, true if first < GAP or any gap < GAP
```

### Function: generateNormalizedPositions(siblings, startPosition=INCREMENT)
```
// Sort siblings, return [{id, position: start + i*INCREMENT}]
```

### Function: calculatePositionForInsert(tasks, parentId, insertIndex)
```
// Siblings sorted, call calculateInsertPosition
```

### Function: extractDropPositionFromEvent(event, tasks)
```
// Gets text/plain as draggedId
// Finds closest [data-task-id] or [data-drop-type]
// If drop-type: return {type, parentId, position, level, draggedId}
// If task-id: return {type:'onto', targetTaskId, draggedId}
// Null on error
```

### Function: calculateMovePosition(tasks, taskId, newParentId, newIndex)
```
// Siblings = filter newParent exclude taskId, sorted
// If index 0: before first
// Else if index >= len: after last
// Else between
// Position = calculateInsertPosition(siblings, newIndex)
// Needs renorm = checkIfRenormalizationNeeded after hypothetical insert
// Return {newPosition, needsRenormalization}
```

### Function: handleHTML5DropPosition(dropInfo, tasks)
```
// DraggedTask = find by dropInfo.draggedId
// If dropType 'into': parentTaskId = dropInfo.targetTaskId, childPosition = max children + INCREMENT or INCREMENT
//   Return {success, type:'nest', newParentId, newPosition, oldParentId, needsRenormalization false}
// If 'onto': targetTask = find, if same parent: siblings exclude dragged, targetIndex, insertIndex based on drag direction, position=calculateInsertPosition, type='reorder', needsRenorm check
//   Else different: type='move', position=target.position+500, needs false
// Return {success false} on errors
```

### Function: createHTML5DragData(taskId, additionalData)
```
// Returns {'text/plain': taskId, 'application/json': stringify({taskId, timestamp, ...})}
```

### Function: extractHTML5DragData(dataTransfer)
```
// Gets text/plain as taskId, optional json parse for additional
// Returns {taskId, ...} or {taskId null} on error
```

### Function: getChildPositions(tasks, parentId)
```
// Filter, map positions sorted
```

### Function: debugPositions(tasks, parentId, context, eventInfo)
```
// Logs parent, count, positions with titles, gaps, needs renorm, optional eventInfo
```

### Function: validatePositionIntegrity(tasks)
```
// Groups by parent, for each:
//   Check duplicate positions
//   Check gaps < GAP
//   Check <=0 positions
// Returns {isValid, issues array with types/details, recommendations}
```

## supabaseClient.js

### Main
```
// Imports createClient from supabase-js
// Gets env vars for url and anon key
// Exports supabase = createClient(url, anonKey)
```