# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`SearchBar.js` and `SearchResults.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## SearchBar.js

### Component: SearchBar({ onToggleResults })
// Uses useSearch: searchFilters, updateTextSearch, updateFilter, activeFilterCount, activeFilters, removeFilter, clearAllFilters, applyQuickFilter, isSearchActive, filteredTasks
// Uses state: isExpanded (false), showSuggestions (false)
// Uses ref: searchInputRef
// Constants: quickFilters array [{id, label, icon} for my_overdue, due_today, my_incomplete, templates_only]
// Returns div search-container margin bottom
// Inner div ref=searchInputRef class expanded if isExpanded, style border/blue if expanded, radius, bg white, transition, shadow
// Padding flex align gap: search icon gray, input text placeholder "Search tasks...", value=searchFilters.text, onChange handleTextChange, onFocus handleFocus, style no border/outline flex1 size16 transparent
// If text or activeCount >0: button clearAllFilters bg none border none gray cursor padding radius, title clear, content ✕
// If isExpanded: div border top gray, padding bg light
// Status filters: small bold gray label "Status" margin bottom
// Flex gap wrap: buttons for all/incomplete/complete/overdue/due_today, onClick updateFilter('status', value), style small border gray radius, bg blue/white text white/gray if selected, cursor transition
// Scope filters: small bold gray label "Scope" margin bottom
// Flex gap wrap: buttons for all/my_tasks/created_by_me, onClick updateFilter('taskType', value), similar styles
// Quick filters: small bold gray label "Quick Filters" margin bottom
// Flex gap wrap: buttons for each quickFilter, onClick applyQuickFilter(id), style small border gray radius bg white gray text, cursor transition flex align gap icon+label
// If activeFilters.length >0: div padding bg blue light, border top gray, flex align gap wrap
// Small gray "Active filters:", map activeFilters to spans flex align gap padding bg blue white text radius small
// Inner button onClick removeFilter(type), bg white opacity border none white text circle small cursor flex center ×
// If isSearchActive: div padding bg blue lighter, border top gray, flex between align
// Small blue "Found N task/s", if onToggleResults: button bg none border none blue cursor small underline "View Results" or "Close" onClick onToggleResults
// Style jsx: expanded z10 relative pos, button hover bg gray, blue bg hover darker

// Function: handleTextChange(e)
// Value = e.target.value
// Calls updateTextSearch(value)
// Sets showSuggestions value.length >0

// Function: handleFocus()
// Sets isExpanded true, showSuggestions true

// Function: handleClickOutside(e)
// If ref current and !contains e.target: sets showSuggestions false
// If !text and activeCount ===0: sets isExpanded false

// Effect: on mount: addEventListener mousedown handleClickOutside
// Cleanup: removeEventListener
// Deps: searchFilters.text, activeFilterCount

## SearchResults.js

### Component: SearchResults({ onTaskSelect, onClose })
// Uses useSearch: filteredTasks, searchFilters, isSearchActive, activeFilterCount
// If !isSearchActive: returns null
// Returns div fixed top0 left0 right0 bottom0 bg black opacity z50 flex align start justify center padding top 10vh
// Inner div bg white radius shadow maxW800 w90 maxH70vh overflow hidden flex column
// Header: padding border bottom gray flex between align
// Div: h2 18 bold gray "Search Results", p small gray "Found N task/s with M active filter/s"
// Button bg none border none large gray cursor padding radius × onClick onClose
// Results: flex1 overflow auto padding0
// If filteredTasks.length ===0: div padding center gray: large 🔍, h3 small bold "No tasks found", p small "Try adjusting..."
// Else: div map tasksByProject to div key projectId
// If >1 project: padding bg light border bottom gray small bold gray uppercase letter spacing projectName highlightText(text), span margin left gray normal (tasks.length)
// Map project.tasks to div key task.id onClick onTaskSelect if provided, padding border bottom none/last gray/light, cursor pointer if onSelect, transition bg hover light
// On enter/leave: bg hover light if onSelect
// Inner flex align start gap: status icon 16 margin top shrink0 via getTaskStatusIcon
// Content flex1 minW0: title 15 bold gray line1.4 margin bottom highlightText(title or untitled, text)
// If description and text and includes lower: small gray line1.4 margin bottom overflow ellipsis line clamp2 highlightText(description, text)
// If actions array >0 and text and some includes lower: small green margin bottom "Actions: " filter matching map with comma, highlightText(action, text)
// Metadata small light gray flex align gap wrap: getTaskMetadata join •, if parent: span bg indigo light text indigo padding radius tiny bold "Subtask"
// Completion shrink0 flex align: if complete small green bold "Complete" else small red bold "Overdue" or "Pending" if due < now
// If filteredTasks >0: footer padding border top gray bg light flex between align
// Small gray "Click any task to view details", button padding blue bg white text radius small bold cursor "Close" onClick onClose

// Function: highlightText(text, searchTerm)
// If !term or !text: returns text
// Regex escape term gi
// Splits text by regex
// Maps parts: if test(part) mark bg yellow padding radius bold, else part

// Computed: tasksByProject (useMemo)
// Grouped object
// For each task: rootTask = task, taskMap by id
// While parent and in map: root = map[parent]
// ProjectKey = root.id, name = root.title or untitled
// If !grouped[key]: init {projectName, projectId, tasks []}
// Push task to grouped[key].tasks
// Returns Object.values(grouped)
// Deps: filteredTasks

// Function: getTaskStatusIcon(task)
// If complete: ✅
// If due_date: due = new Date(due), today = new Date() hours0
// If due < today: 🔴
// If same date: 🟡
// Else: ⭕

// Function: getTaskMetadata(task)
// Metadata array
// If due: push "Due: " formatDisplayDate(due)
// If duration: push N day/s
// If origin template: push "Template"
// Returns join •