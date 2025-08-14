# Task Management System - CRUD Operations Analysis

## Overview
This analysis traces the complete data flow for CRUD operations in the task management system, from user interactions to database updates.

---

## 1. CREATE Operations

### 1.1 Create New Task/Project

**User Action:** Clicks "New Project" → "Blank Project" or "Add Child" button

**Data Flow:**

```
User Action → Component Handler → Hook → Service → Database
```

**Components & Handlers:**
- **src/components/TaskList/TaskList.js** - `handleCreateNewProject()`, `handleAddChildTask()`
- **src/components/TaskForm/NewProjectForm.js** - `handleSubmit()`
- **src/components/TaskForm/TaskForm.js** - `handleSubmit()`

**State Management:**
- **src/components/contexts/TaskContext.js** - `tasks` state, `loading` state
- Local form state in form components (managed by `useTaskForm` hook)

**Hooks:**
- **src/hooks/useTaskCreation.js** - Main creation logic
  - `createTask()` - Primary creation function
  - `calculateTaskDates()` - Date calculations
  - State: `isCreating`, `creationError`

**Key Functions:**
```javascript
// From src/hooks/useTaskCreation.js
const createTask = useCallback(async (taskData, options = {}) => {
  // Business logic, validation, positioning
  const result = await createTask(enhancedTaskData);
  if (onTaskCreated) await onTaskCreated(result.data);
}, []);
```

**API Calls:**
- **src/services/taskService.js** - `createTask(taskData)`
  - Direct Supabase insert: `supabase.from('tasks').insert([taskData])`

**Integration Callbacks:**
```javascript
// src/components/contexts/TaskContext.js
onTaskCreated: async (newTask) => {
  setTasks(prev => [...prev, newTask]);
  // Date recalculation trigger
}
```

### 1.2 Create Project from Template

**User Action:** Clicks "New Project" → "From Template"

**Components:**
- **src/components/TemplateProject/TemplateProjectCreator.js** - Template selection and project creation

**Hooks:**
- **src/hooks/useTemplateToProject.js** - Template conversion logic
  - `createProjectFromTemplate()` - Main conversion function
  - State: `isConverting`, `conversionProgress`

**Process:**
1. Select template → Create root project → Create child hierarchy → Calculate dates

---

## 2. READ Operations

### 2.1 Fetch All Tasks

**User Action:** Page load, refresh button, or navigation

**Components:**
- **src/components/TaskList/TaskList.js** - Main display component
- **src/components/TaskList/TaskItem.js** - Individual task rendering

**State Management:**
- **src/components/contexts/TaskContext.js** - Central state management
  - `tasks`, `instanceTasks`, `templateTasks`
  - `loading`, `error` states
  - `memberProjects`, `memberProjectTasks` (for shared projects)

**Hooks:**
- **src/components/contexts/TaskContext.js** - `fetchTasks()`, `fetchAllProjectsAndTasks()`
- **src/hooks/useTaskDates.js** - Date calculation and caching

**API Calls:**
- **src/services/taskService.js** - `fetchAllTasks(organizationId, userId, origin)`
  - Supabase query: `supabase.from('tasks').select('*')`
  - Includes recursive descendant fetching via `fetchAllDescendants()`
- **src/services/teamManagementService.js** - `getUserProjects(userId)` for member projects

**Data Flow:**
```javascript
// src/components/contexts/TaskContext.js
const fetchTasks = useCallback(async (forceRefresh = false) => {
  const [instanceResult, templateResult] = await Promise.all([
    fetchAllTasks(organizationId, user.id, 'instance'),
    fetchAllTasks(organizationId, null, 'template')
  ]);
  
  const allTasks = [...(instanceResult.data || []), ...(templateResult.data || [])];
  setTasks(allTasks);
}, []);
```

### 2.2 Task Details Display

**User Action:** Clicks on a task to view details

**Components:**
- **src/components/TaskList/TaskDetailsPanel.js** - Detailed task view
  - Shows schedule info, actions, resources, etc.
- **src/components/URLTextComponent.js** - For URL detection in resources

**State:**
- Selected task ID in **src/components/TaskList/TaskList.js**
- Task permissions and user roles from **src/components/contexts/TaskContext.js**

---

## 3. UPDATE Operations

### 3.1 Edit Task

**User Action:** Clicks "Edit" button in task details

**Components:**
- **src/components/TaskList/TaskDetailsPanel.js** - Edit button handler
- **src/components/TaskForm/TaskForm.js** - Edit form (when `isEditing = true`)
- **src/components/TaskForm/TemplateTaskForm.js** - For template tasks

**Handlers:**
```javascript
// src/components/TaskList/TaskDetailsPanel.js
const handleEditClick = () => {
  if (!userPermissions.canEdit) {
    alert('You do not have permission to edit this task.');
    return;
  }
  setIsEditing(true);
};

const handleTaskUpdate = (updatedTaskData) => {
  onEditTask(task.id, updatedTaskData);
  setIsEditing(false);
};
```

**Hooks:**
- **src/hooks/useTaskUpdate.js** - Update logic
  - `updateTask()` - Main update function
  - `updateTaskDates()` - Date-specific updates
  - State: `isUpdating`, `updateError`, `updateProgress`
- **src/components/TaskForm/useTaskForm.js** - Form state management

**API Calls:**
- **src/services/taskService.js** - `updateTaskComplete(taskId, updateData)`
  - Supabase update: `supabase.from('tasks').update(dataWithTimestamp).eq('id', taskId)`

**Business Logic:**
```javascript
// src/hooks/useTaskUpdate.js
const updateTask = useCallback(async (taskId, updatedTaskData, options = {}) => {
  const updateAnalysis = analyzeTaskUpdate(originalTask, updatedTaskData, existingTasks);
  
  if (updateAnalysis.isTemplateWithAncestorImpacts) {
    return await handleTemplateAncestorUpdate(taskId, updatedTaskData, updateAnalysis);
  } else if (updateAnalysis.isTemplateUpdate) {
    return await handleTemplateUpdate(taskId, updatedTaskData, updateAnalysis);
  } else {
    return await handleInstanceUpdate(taskId, updatedTaskData, updateAnalysis);
  }
}, []);
```

### 3.2 Task Completion Toggle

**User Action:** Clicks checkbox next to task

**Handler:**
```javascript
// src/components/TaskList/TaskItem.js
const handleToggleCompletion = async (e) => {
  e.stopPropagation();
  
  if (!canEdit) {
    alert('You do not have permission to modify this task.');
    return;
  }
  
  await toggleTaskCompletion(task.id, task.is_complete, e);
};
```

**API Call:**
- **src/services/taskService.js** - `updateTaskCompletion(taskId, currentStatus)`

### 3.3 Drag & Drop Reordering

**User Action:** Drags task to new position

**Components:**
- **src/components/TaskList/TaskItem.js** - Drag handlers
- **src/components/TaskList/HTML5DragDropZone.js** - Drop zones
- **src/components/TaskList/TaskList.js** - Drop logic coordination

**Drag Handlers:**
```javascript
// src/components/TaskList/TaskItem.js
const handleDragStart = (e) => {
  if (isTopLevel || !canEdit) {
    e.preventDefault();
    return;
  }
  
  e.dataTransfer.setData('text/plain', task.id);
  if (onDragStart) {
    const success = onDragStart(task);
    if (!success) e.preventDefault();
  }
};
```

**Position Calculation Utilities:**
- **src/utils/sparsePositioning.js** - `calculateHTML5DropPosition()`
- **src/utils/dragUtils.js** - Various drag utilities

**Optimistic Updates:**
```javascript
// src/components/contexts/TaskContext.js
handleOptimisticDragDrop: (draggedId, newParentId, newPosition, oldParentId) => {
  // 1. Update positions immediately
  const updateTasks = (prevTasks) => {
    const updatedTasks = prevTasks.map(task => 
      task.id === draggedId 
        ? { ...task, parent_task_id: newParentId, position: newPosition }
        : task
    );
    
    // 2. Recalculate dates immediately
    const tasksWithDates = optimisticUpdateHelpers.recalculateDatesOptimistic(updatedTasks);
    return tasksWithDates;
  };

  setTasks(updateTasks);
  
  // 3. Background sync
  setTimeout(() => {
    optimisticUpdateHelpers.syncTaskPositionToDatabase(draggedId, newParentId, newPosition);
  }, 100);
}
```

**API Call:**
- **src/services/taskService.js** - `updateTaskPosition(taskId, parentId, position)`

---

## 4. DELETE Operations

### 4.1 Delete Task

**User Action:** Clicks "Delete" button in task details

**Handler:**
```javascript
// src/components/TaskList/TaskDetailsPanel.js
const handleDeleteClick = () => {
  if (!userPermissions.canDelete) {
    alert('You do not have permission to delete this task.');
    return;
  }
  onDeleteTask(task.id);
};
```

**Main Delete Logic:**
```javascript
// src/components/TaskList/TaskList.js
const handleDeleteTask = async (taskId) => {
  const task = [...tasks, ...memberProjectTasks].find((t) => t.id === taskId);
  const permissions = getUserPermissions(task);
  
  if (!permissions.canDelete) {
    alert('You do not have permission to delete this task.');
    return;
  }
  
  // Confirmation dialog
  const hasChildrenToDelete = contextTasks.some((t) => t.parent_task_id === taskId);
  if (!window.confirm(confirmMessage)) return;

  const result = await deleteTask(taskId, true);
  // Handle result and update UI
};
```

**Hooks:**
- **src/hooks/useTaskDeletion.js** - Deletion logic
  - `deleteTask()` - Main deletion function
  - State: `isDeleting`, `deletionError`, `deletionProgress`

**Complex Deletion Process:**
```javascript
// src/hooks/useTaskDeletion.js
const deleteTask = useCallback(async (taskId, options = {}) => {
  // 1. Analyze what will be affected
  const deletionAnalysis = analyzeTaskDeletion(taskId, existingTasks, deleteChildren);
  
  // 2. Perform deletion
  const result = await performTaskDeletion(taskId, deleteChildren);
  
  // 3. Handle post-deletion updates (hierarchy, durations)
  const postDeletionResult = await handlePostDeletionUpdates(
    result, deletionAnalysis, existingTasks, onTasksUpdated
  );
  
  return {
    success: true,
    deletedIds: result.deletedIds || [taskId],
    hasChildren: deletionAnalysis.hasChildren
  };
}, []);
```

**API Call:**
- **src/services/taskService.js** - `deleteTask(taskId, deleteChildren)`
  - Recursive deletion: finds all descendants first, then deletes in reverse order

---

## 5. Supporting Systems

### 5.1 Date Management

**System:** 
- **src/utils/DateCacheEngine.js** - Centralized date calculation engine
- **src/hooks/useTaskDates.js** - Hook for date operations and caching
- **src/utils/dateUtils.js** - Date utility functions
- Optimistic date recalculation during drag operations

### 5.2 Permission System

**Components & Services:**
- User role checking in **src/components/TaskList/TaskDetailsPanel.js**, **src/components/TaskList/TaskItem.js**
- Permission-based UI hiding/showing
- **src/services/teamManagementService.js** - Role/permission API calls
- **src/components/contexts/TaskContext.js** - Permission helper functions (`getUserRole`, `canUserEdit`, `canUserManageTeam`)

### 5.3 Search Operations

**Components & Hooks:**
- **src/components/Search/SearchBar.js** - Search input component
- **src/components/Search/SearchResults.js** - Search results display
- **src/components/contexts/SearchContext.js** - Search state management
- **src/hooks/useSearch.js** - Search functionality hook

### 5.4 Master Library Operations

**API Functions & Hooks:**
- **src/services/taskService.js** - `addToMasterLibrary()`, `removeFromMasterLibrary()`, `searchMasterLibraryTasks()`
- **src/hooks/useMasterLibrary.js** - Library management hook
- **src/components/MasterLibrary/MasterLibrarySearchBar.js** - Library search component

### 5.5 Form Management

**Form Hooks & Components:**
- **src/components/TaskForm/useTaskForm.js** - General task form state management
- **src/components/TaskForm/useTemplateTaskForm.js** - Template-specific form logic
- **src/components/TaskForm/CreateNewTemplateForm.js** - Template creation form
- **src/components/TaskForm/TemplateTaskForm.js** - Template task editing form

### 5.6 Sequential Task Management

**Utilities:**
- **src/utils/sequentialTaskManager.js** - Functions for handling task hierarchies, duration calculations
  - `calculateParentDuration()`, `updateAncestorDurations()`, `calculateSequentialStartDates()`

---

## 6. Error Handling & Loading States

### Global Error Handling:
- Each hook maintains its own error state
- **src/components/contexts/TaskContext.js** aggregates loading states
- User feedback through alerts and UI indicators

### Loading States:
```javascript
// Various loading states across the system
- isCreating (src/hooks/useTaskCreation.js)
- isUpdating (src/hooks/useTaskUpdate.js)  
- isDeleting (src/hooks/useTaskDeletion.js)
- loading (src/components/contexts/TaskContext.js)
- memberProjectsLoading (src/components/contexts/TaskContext.js)
```

### Optimistic Updates:
- Immediate UI updates for drag & drop
- Background sync with error fallback
- Date recalculation with caching via **src/utils/DateCacheEngine.js**

---

## Summary

The system follows a clear pattern:
1. **User Action** → triggers component handler
2. **Component Handler** → calls appropriate hook
3. **Hook** → contains business logic and calls service
4. **Service** → makes API call to Supabase
5. **Integration Callback** → updates global state
6. **UI Re-render** → reflects changes

Key architectural decisions:
- Separation of concerns with dedicated hooks for each operation type
- Optimistic updates for better UX (especially drag & drop)
- Comprehensive error handling and loading states
- Permission-based access control
- Centralized state management through TaskContext


# Template CRUD Function Call Flow Analysis

## 1. CREATE Template Operations

### 1.1 Top-Level Template Creation Flow

```
User Click "New Template"
└── handleCreateNewTemplate() [TemplateList.js]
    └── setIsCreatingNewTemplate(true)

User Submits Form
└── handleSubmit() [CreateNewTemplateForm.js]
    ├── validateForm() [CreateNewTemplateForm.js]
    ├── prepareFormData() [CreateNewTemplateForm.js]
    └── onSubmit(cleanedData) → calls handleNewTemplateSubmit() [TemplateList.js]
        └── createTask() [TaskContext.js]
            └── createTask() [useTaskCreation.js]
                ├── validateProjectCreation() [useLicenses.js]
                ├── getNextAvailablePosition() [sparsePositioning.js]
                ├── calculateTaskDates() [useTaskCreation.js]
                │   ├── determineTaskStartDate() [dateUtils.js]
                │   ├── calculateDueDate() [dateUtils.js]
                │   └── calculateStartDate() [dateUtils.js]
                └── createTask() [taskService.js] ← API CALL
                    └── supabase.from('tasks').insert([taskData])
```

### 1.2 Child Template Creation Flow

```
User Click "Add Child Template"
└── handleAddTemplateTask() [TemplateList.js]
    └── setAddingChildToTemplateId(parentId)

User Submits Form
└── handleSubmit() [TemplateTaskForm.js]
    ├── validateForm() [TemplateTaskForm.js]
    ├── prepareFormData() [TemplateTaskForm.js]
    └── onSubmit(cleanedData) → calls handleTemplateTaskSubmit() [TemplateList.js]
        └── createTask() [TaskContext.js]
            └── createTask() [useTaskCreation.js]
                ├── getNextAvailablePosition() [sparsePositioning.js]
                ├── calculateTaskDates() [useTaskCreation.js]
                └── createTask() [taskService.js] ← API CALL
                    └── onTaskCreated() [TaskContext.js]
                        ├── setTasks(prev => [...prev, newTask])
                        └── updateTaskDates() [useTaskDates.js]
                            └── recalculateAllDates() [DateCacheEngine.js]
```

---

## 2. READ Template Operations

### 2.1 Template Fetching Flow

```
Component Mount [TemplateList.js]
└── useEffect() → fetchAllProjectsAndTasks() [TaskContext.js]
    └── fetchTasks() [TaskContext.js]
        ├── fetchAllTasks(organizationId, null, 'template') [taskService.js] ← API CALL
        │   └── supabase.from('tasks').select('*').eq('origin', 'template')
        └── setTasks(allTasks)

Template Display
├── renderTopLevelTemplates() [TemplateList.js]
│   └── TemplateItem.map() [TemplateItem.js]
│       ├── getTaskLevel() [taskUtils.js]
│       ├── getBackgroundColor() [taskUtils.js]
│       └── selectTask() [TemplateList.js]
│           └── setSelectedTaskId(taskId)
└── renderRightPanel() [TemplateList.js]
    └── TemplateDetailsPanel [TemplateDetailsPanel.js]
        ├── getTaskLevel() [taskUtils.js]
        ├── getBackgroundColor() [taskUtils.js]
        ├── formatDisplayDate() [taskUtils.js]
        └── checkLibraryStatus() [TemplateDetailsPanel.js]
            └── checkTaskLibraryStatus() [useMasterLibrary.js]
                └── checkIfInMasterLibrary() [taskService.js] ← API CALL
```

### 2.2 Master Library Status Check Flow

```
useEffect() [TemplateDetailsPanel.js]
└── checkLibraryStatus() [TemplateDetailsPanel.js]
    └── masterLibrary.checkTaskLibraryStatus() [useMasterLibrary.js]
        └── checkIfInMasterLibrary() [taskService.js] ← API CALL
            └── supabase.from('master_library_tasks').select('*').eq('task_id', taskId)
```

---

## 3. UPDATE Template Operations

### 3.1 Template Edit Flow

```
User Click "Edit Template"
└── handleEditClick() [TemplateDetailsPanel.js]
    └── setIsEditing(true)

User Submits Edit Form
└── handleSubmit() [TemplateTaskForm.js]
    ├── validateForm() [TemplateTaskForm.js]
    ├── prepareFormData() [TemplateTaskForm.js]
    └── onSubmit(cleanedData) → calls handleTemplateUpdate() [TemplateDetailsPanel.js]
        └── onEditTask() → calls handleEditTemplate() [TemplateList.js]
            └── updateTask() [TaskContext.js]
                └── updateTask() [useTaskUpdate.js]
                    ├── analyzeTaskUpdate() [useTaskUpdate.js]
                    ├── handleTemplateUpdate() [useTaskUpdate.js]
                    │   ├── updateTaskComplete() [taskService.js] ← API CALL
                    │   ├── updateAncestorDurations() [sequentialTaskManager.js]
                    │   │   ├── calculateParentDuration() [sequentialTaskManager.js]
                    │   │   └── calculateSequentialStartDates() [sequentialTaskManager.js]
                    │   └── getTasksRequiringUpdates() [sequentialTaskManager.js]
                    └── updateTasksInDatabase() [sequentialTaskManager.js]
                        └── updateTaskComplete() [taskService.js] ← API CALL
```

### 3.2 Duration Update with Ancestor Impact Flow

```
Duration Change in Form
└── handleChange() [TemplateTaskForm.js]
    └── useEffect() [useTemplateTaskForm.js]
        └── calculateAncestorImpacts() [useTemplateTaskForm.js]
            ├── calculateParentDuration() [sequentialTaskManager.js]
            └── setAffectedAncestors()

Form Submit with Ancestor Updates
└── handleTemplateAncestorUpdate() [useTaskUpdate.js]
    ├── updateTaskComplete() [taskService.js] ← API CALL (main task)
    ├── updateTaskComplete() [taskService.js] ← API CALL (each ancestor)
    └── onRefreshNeeded() [TaskContext.js]
        └── fetchAllProjectsAndTasks() [TaskContext.js]
```

---

## 4. DELETE Template Operations

### 4.1 Template Deletion Flow

```
User Click "Delete Template"
└── handleDeleteTemplate() [TemplateList.js]
    ├── window.confirm() ← User Confirmation
    └── deleteTask() [TaskContext.js]
        └── deleteTask() [useTaskDeletion.js]
            ├── analyzeTaskDeletion() [useTaskDeletion.js]
            │   └── findAllChildren() [local function]
            ├── performTaskDeletion() [useTaskDeletion.js]
            │   └── deleteTask() [taskService.js] ← API CALL
            │       ├── findAllDescendants() [taskService.js]
            │       └── supabase.from('tasks').delete().eq('id', taskId)
            └── handlePostDeletionUpdates() [useTaskDeletion.js]
                ├── updateAfterReordering() [sequentialTaskManager.js]
                ├── calculateParentDuration() [sequentialTaskManager.js]
                ├── updateAncestorDurations() [sequentialTaskManager.js]
                └── updateTasksInDatabase() [sequentialTaskManager.js]
```

### 4.2 Cascade Deletion with Error Handling Flow

```
Delete with Date Calculation Error
└── handleDeletionFallback() [useTaskDeletion.js]
    ├── filter tasks from UI
    ├── updateAfterReordering() [sequentialTaskManager.js]
    ├── calculateParentDuration() [sequentialTaskManager.js]
    ├── updateAncestorDurations() [sequentialTaskManager.js]
    └── onTasksUpdated() [TaskContext.js]
        └── setTasks(updatedTaskList)
```

---

## 5. MASTER LIBRARY Operations

### 5.1 Add/Remove from Master Library Flow

```
User Click Library Toggle
└── handleToggleMasterLibrary() [TemplateDetailsPanel.js]
    └── masterLibrary.toggleLibraryMembership() [useMasterLibrary.js]
        ├── onOptimisticUpdate() → setIsInLibrary(newStatus)
        ├── isInLibrary ? removeFromMasterLibrary() : addToMasterLibrary() [taskService.js] ← API CALL
        │   ├── addToMasterLibrary(): supabase.from('master_library_tasks').insert()
        │   └── removeFromMasterLibrary(): supabase.from('master_library_tasks').delete()
        ├── onSuccess() → console.log success
        └── onError() → revert optimistic update
            └── checkTaskLibraryStatus() [useMasterLibrary.js]
```

### 5.2 Master Library Search Flow

```
User Types in Search
└── handleSearch() [MasterLibrarySearchBar.js]
    ├── debounce search
    └── searchMasterLibraryTasks() [taskService.js] ← API CALL
        └── supabase.from('master_library_view').select().or(searchQuery)

User Selects Template to Copy
└── onCopyTask() [MasterLibrarySearchBar.js]
    └── handleCopyMasterLibraryTask() [TaskForm.js]
        ├── parseArrayField() [local function]
        ├── setFormData() [useTaskForm.js]
        └── setShowMasterLibraryPopup(false)
```

---

## 6. TEMPLATE COPYING Operations

### 6.1 Copy Template from Master Library Flow

```
User Click "Copy from Library"
└── setShowMasterLibraryPopup(true) [TaskForm.js]
    └── MasterLibraryPopup renders
        └── MasterLibrarySearchBar
            ├── searchMasterLibraryTasks() [taskService.js] ← API CALL
            └── onCopyTask() → handleCopyMasterLibraryTask() [TaskForm.js]
                ├── parseArrayField() [local function]
                ├── setFormData() [useTaskForm.js]
                │   └── updates form state with template data
                └── setShowMasterLibraryPopup(false)
```

### 6.2 Template Copy to Child Task Flow

```
User in "Add Child" Mode + Copy Template
└── handleCopyTemplateAsChild() [TemplateList.js]
    ├── console.log template data
    ├── setCopyingChildTemplate({ templateData, parentId })
    └── setAddingChildToTemplateId(null)

Render with Copied Data
└── renderRightPanel() [TemplateList.js]
    └── TemplateTaskForm with initialData={copyingChildTemplate.templateData}
        └── processInitialData() [TemplateTaskForm.js]
            ├── map default_duration to duration_days
            └── ensure arrays are properly formatted
```

---

## 7. PROJECT FROM TEMPLATE Operations

### 7.1 Template to Project Conversion Flow

```
User Select Template + Submit
└── handleSubmit() [TemplateProjectCreator.js]
    ├── validateProjectCreation() [useLicenses.js]
    ├── applyLicenseKey() [useLicenses.js] ← API CALL (if needed)
    └── createProjectFromTemplate() [useTemplateToProject.js]
        ├── getAllTemplateTasksInHierarchy() [useTemplateToProject.js]
        │   └── supabase.from('tasks').select('*').eq('origin', 'template') ← API CALL
        ├── createRootProjectFromTemplate() [useTemplateToProject.js]
        │   ├── calculateDueDate() [dateUtils.js]
        │   └── createTask() [useTaskCreation.js] → [taskService.js] ← API CALL
        ├── createChildTasksFromTemplate() [useTemplateToProject.js]
        │   ├── organizeTasksByLevel() [useTemplateToProject.js]
        │   └── createTask() [useTaskCreation.js] → [taskService.js] ← API CALL (for each child)
        ├── calculateAndApplyProjectDates() [useTemplateToProject.js]
        │   ├── calculateSequentialStartDates() [dateUtils.js]
        │   └── updateTaskDateFields() [taskService.js] ← API CALL (for each task)
        └── onProjectCreated() [TaskContext.js]
            ├── setTasks(prev => [...prev, ...createdTasks])
            └── fetchAllProjectsAndTasks() [TaskContext.js]
```

---

## 8. DRAG & DROP Operations (Templates)

### 8.1 Template Drag & Drop Flow

```
User Drags Template
└── handleDragStart() [TemplateItem.js]
    ├── e.dataTransfer.setData('text/plain', task.id)
    └── setDraggedTask(task)

User Drops Template
└── handleDrop() [TemplateItem.js]
    ├── e.dataTransfer.getData('text/plain') → get draggedId
    ├── calculateMovePosition() [sparsePositioning.js]
    ├── setTasks() → optimistic update
    └── updateTask() [TaskContext.js]
        └── updateTaskPosition() [taskService.js] ← API CALL
            └── supabase.from('tasks').update().eq('id', taskId)
```

---

## Key Function Dependency Patterns

### 1. Validation Chain:
```
Form Validation → Business Logic Validation → API Call → State Update
```

### 2. Hierarchy Calculation Chain:
```
Task Change → Calculate Parent Duration → Update Ancestors → Recalculate Dates → Update Database
```

### 3. Error Handling Chain:
```
API Error → Fallback Logic → UI Revert → User Notification
```

### 4. Optimistic Update Chain:
```
User Action → Immediate UI Update → API Call → Success/Error Handling → Final State
```

### 5. Date Calculation Chain:
```
Task Duration Change → Sequential Calculation → Date Cache Update → UI Refresh
```