PlanterPlan

Database Schema (Mermaid code):

```
erDiagram
    tasks {
        uuid id PK
        text title
        text description
        text purpose
        text actions
        _text resources
        task_hierarchy type
        task_origin origin
        bool published
        uuid license_id
        uuid creator FK
        timestamptz created_at
        timestamptz last_modified
        int4 default_duration
        int4 days_from_start_until
        uuid parent_task_id FK
        int4 position
        bool is_complete
        bool marked_na
        date start_date
        date due_date
        uuid task_lead FK
        uuid modified_by FK
        uuid white_label_id FK
    }
    
    white_label_orgs {
        uuid id PK
        text organization_name
        text subdomain
        text status
        timestamptz created_at
        timestamptz updated_at
        text primary_color
        text secondary_color
        text logo
        uuid admin_user_id FK
    }
    
    users {
        uuid id PK
        text email
        text first_name
        text last_name
        timestamptz created_at
    }
    
    tasks ||--o{ tasks : "parent_task_id"
    tasks }o--|| users : "creator"
    tasks }o--|| users : "modified_by"
    tasks }o--|| users : "task_lead"
    tasks }o--|| white_label_orgs : "white_label_id"
    white_label_orgs }o--|| users : "admin_user_id"
```

# PlanterPlan - Component Architecture and Logic

This documentation covers the main components and logic of the PlanterPlan application, focusing on how tasks, templates, and their relationships are managed through the codebase.

## Component Architecture

### Core Components

| Component | Purpose | Key Functions |
|-----------|---------|---------------|
| `TaskList` | Displays and manages projects/tasks | Task creation, selection, hierarchical display |
| `TaskItem` | Represents a single task | Displays task, handles drag events, toggles expansion |
| `TemplateList` | Manages templates | Template creation, listing, and management |
| `TemplateItem` | Represents a single template | Displays template, handles drag events |
| `TaskForm` | Task/template creation/editing form | Handles form data for tasks/templates |
| `TaskDropZone` | Drop target between tasks | Handles drop positioning for drag and drop |
| `OrganizationProvider` | Manages organization context | Provides organization data and branding |

### Component Relationships

```
App
├── OrganizationProvider
│   └── OrganizationLayout
│       ├── TaskList
│       │   ├── TaskItem (recursive)
│       │   │   └── TaskDropZone
│       │   └── TaskForm
│       └── TemplateList
│           ├── TemplateItem (recursive)
│           │   └── TaskDropZone
│           └── TaskForm
```

## Task and Template Data Model

### Task Data Structure

```javascript
{
  id: "uuid",
  title: "Task Title",
  description: "Task Description",
  purpose: "Task Purpose",
  actions: ["Action 1", "Action 2"],
  resources: ["Resource 1", "Resource 2"],
  parent_task_id: "parent-uuid", // null for top-level tasks
  position: 0, // position among siblings
  is_complete: false,
  origin: "instance" | "template", // determines if it's a task or template
  due_date: "2023-01-01",
  // other fields...
}
```

### Hierarchical Structure

Tasks and templates are stored in a flat structure but displayed hierarchically:
- **Top-level tasks/templates**: `parent_task_id === null`
- **Children**: filtered by matching `parent_task_id`
- **Ordering**: determined by `position` field

## Key Logic Components

### 1. Task Hierarchy and Display Logic

```javascript
// getTaskLevel - Determines the nesting level of a task
const getTaskLevel = (task, tasks) => {
  if (!task.parent_task_id) return 0;
  let level = 1;
  let parentId = task.parent_task_id;
  while (parentId) {
    level++;
    const parent = tasks.find((t) => t.id === parentId);
    parentId = parent?.parent_task_id;
  }
  return level;
};

// Display colors based on hierarchy level
const getBackgroundColor = (level) => {
  const colors = [
    "#6b7280", // Gray for top level (level 0)
    "#1e40af", // Dark blue (level 1)
    "#2563eb", // Medium blue (level 2)
    // ...more colors
  ];
  if (level === 0) return colors[0];
  return level < colors.length ? colors[level] : colors[colors.length - 1];
};
```

### 2. Drag and Drop System

The drag and drop system uses a custom hook (`useTaskDragAndDrop`) that manages:

```javascript
// Key drag and drop state
const [draggedTask, setDraggedTask] = useState(null);
const [dropTarget, setDropTarget] = useState(null);
const [dropPosition, setDropPosition] = useState(null); // 'into', 'between-before', 'between-after'
const [activeDropZone, setActiveDropZone] = useState(null);

// Main handlers
const handleDragStart = (e, task) => { /* ... */ };
const handleDragOver = (e, targetTask) => { /* ... */ };
const handleDrop = async (e, targetTask) => { /* ... */ };
const handleDropZoneDragOver = (e, parentId, position, prevTask, nextTask) => { /* ... */ };
const handleDropZoneDrop = async (e, parentId, position) => { /* ... */ };
```

#### Drop Positions:

- **Into**: Drop a task to make it a child of the target
- **Between Before**: Drop before another task (same level)
- **Between After**: Drop after another task (same level)

The drop operation updates:
1. Frontend state (optimistic update)
2. Database state (API call)

### 3. Task/Template Expansion Logic

```javascript
// Tracks which tasks are expanded
const [expandedTasks, setExpandedTasks] = useState({});

// Toggle expansion
const toggleExpandTask = (taskId, e) => {
  e.preventDefault();
  e.stopPropagation();
  setExpandedTasks(prev => ({
    ...prev,
    [taskId]: !prev[taskId]
  }));
};
```

### 4. Task Form Logic

```javascript
// Form data structure
const [formData, setFormData] = useState({
  title: '',
  purpose: '',
  description: '',
  actions: [''],
  resources: ['']
});

// Form submission
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (validateForm()) {
    // Filter out empty array items
    const cleanedData = {
      ...formData,
      actions: formData.actions.filter(item => item.trim() !== ''),
      resources: formData.resources.filter(item => item.trim() !== '')
    };
    
    onSubmit({
      ...cleanedData,
      parent_task_id: parentTaskId,
      origin: originType, // 'template' or 'instance'
      is_complete: false
    });
  }
};
```

## Task Service API

The task service provides API functions for:

```javascript
// Fetch all tasks
const fetchAllTasks = async (organizationId = null) => { /* ... */ };

// Create a new task
const createTask = async (taskData, organizationId = null) => { /* ... */ };

// Update task completion status
const updateTaskCompletion = async (taskId, currentStatus, organizationId = null) => { /* ... */ };

// Update task position (drag and drop)
const updateTaskPosition = async (taskId, newParentId, newPosition, organizationId = null) => { /* ... */ };

// Update sibling positions
const updateSiblingPositions = async (tasks, organizationId = null) => { /* ... */ };

// Delete a task
const deleteTask = async (taskId, organizationId = null) => { /* ... */ };
```

## State Management Flow

1. **Task Selection**:
   ```javascript
   const [selectedTaskId, setSelectedTaskId] = useState(null);
   const selectedTask = tasks.find(task => task.id === selectedTaskId);
   ```

2. **Adding Child Tasks**:
   ```javascript
   // Toggle form display
   const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
   
   // Handle adding a child task
   const handleAddChildTask = (parentTaskId) => {
     setSelectedTaskId(parentTaskId);
     setAddingChildToTaskId(parentTaskId);
     setExpandedTasks(prev => ({
       ...prev,
       [parentTaskId]: true
     }));
   };
   ```

3. **Creating New Tasks/Templates from Form**:
   ```javascript
   const handleAddChildTaskSubmit = async (taskData) => {
     // Determine position for new task
     const siblingTasks = tasks.filter(t => t.parent_task_id === taskData.parent_task_id);
     const position = siblingTasks.length > 0 
       ? Math.max(...siblingTasks.map(t => t.position)) + 1 
       : 0;
     
     // Create task in database
     const result = await createTask({...taskData, position});
     
     // Update local state
     if (result.data) {
       setTasks(prev => [...prev, result.data]);
     }
   };
   ```

## Project Templates System

The template system allows creating reusable project structures:

1. **Creating Templates**: Same process as tasks but with `origin: "template"`
2. **Using Templates**: When creating a new project, user can select a template
3. **Template Conversion**: Creates a project by:
   - Creating a top-level project from the template 
   - Recursively creating child tasks for all template children

```javascript
// Create child tasks from a template
const createChildTasksFromTemplate = async (templateId, newProjectId) => {
  // Find the template and its children
  const templateTask = templates.find(t => t.id === templateId);
  if (!templateTask) return;
  
  // Get direct children of the template
  const childTemplates = templates.filter(t => t.parent_task_id === templateId);
  
  // Create each child task
  for (let i = 0; i < childTemplates.length; i++) {
    const childTemplate = childTemplates[i];
    
    // Create the child task
    const childTaskData = {
      title: childTemplate.title,
      purpose: childTemplate.purpose,
      description: childTemplate.description,
      actions: childTemplate.actions,
      resources: childTemplate.resources,
      parent_task_id: newProjectId,
      position: i,
      origin: 'instance',
      is_complete: false,
      due_date: null
    };
    
    const result = await createTask(childTaskData);
    
    // Recursively create grandchildren
    if (result.data) {
      const grandchildTemplates = templates.filter(t => t.parent_task_id === childTemplate.id);
      if (grandchildTemplates.length > 0) {
        await createChildTasksFromTemplate(childTemplate.id, result.data.id);
      }
    }
  }
};
```

## Organization White-labeling

The `OrganizationProvider` enables white-labeling through:

1. **Route-based organization selection**: `/org/:orgSlug/*`
2. **Organization context**:
   ```javascript
   // Fetch organization data
   const { data } = await supabase
     .from('white_label_orgs')
     .select('*')
     .eq('subdomain', orgSlug)
     .single();
     
   // Apply branding
   document.documentElement.style.setProperty('--primary-color', data.primary_color);
   document.documentElement.style.setProperty('--secondary-color', data.secondary_color);
   document.title = `${data.name} - Task Manager`;
   ```

3. **Filtered data access**: All API calls filter by organization ID for data isolation

This architecture enables PlanterPlan to support multiple organizations with customized interfaces while maintaining clean separation of data and functionality.
