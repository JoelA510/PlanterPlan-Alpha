// src/utils/taskUtils.js

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return 'No date';
  
  try {
    // For date-only values from PostgreSQL, ensure we parse without timezone shifting
    // Split by T to handle both date-only strings and ISO strings
    const datePart = dateString.split('T')[0];
    
    // Create parts for year, month, day
    const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
    
    // Create a date using the UTC values to avoid timezone adjustment
    // month is 0-indexed in JavaScript, so subtract 1
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
};

// export const formatDate = (dateString) => {
//   if (!dateString) return 'Not set';
  
//   try {
//     // Parse the date and adjust for timezone
//     const date = new Date(dateString);
//     // Create a new date object with only the date part in local time
//     const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
//     return localDate.toLocaleDateString('en-US', {
//       weekday: 'short',
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   } catch (e) {
//     return 'Invalid date';
//   }
// };
// Get background color based on nesting level
export const getBackgroundColor = (level) => {
  const colors = [
    "#6b7280", // Gray for top level (level 0)
    "#1e40af", // Dark blue (level 1)
    "#2563eb", // Medium blue (level 2)
    "#3b82f6", // Blue (level 3)
    "#60a5fa", // Light blue (level 4)
    "#93c5fd", // Lighter blue (level 5+)
  ];

  if (level === 0) return colors[0];
  return level < colors.length ? colors[level] : colors[colors.length - 1];
};

// Determine the nesting level of a task
export const getTaskLevel = (task, tasks) => {
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

// Checks if a task is a descendant of another task
export const isDescendantOf = (potentialChild, potentialParentId, tasks) => {
  let current = potentialChild;

  while (current && current.parent_task_id) {
    if (current.parent_task_id === potentialParentId) {
      return true;
    }
    current = tasks.find((t) => t.id === current.parent_task_id);
  }

  return false;
};

// Add to taskUtils.js or create a new dateUtils.js file
export const calculateDueDate = (startDate, durationDays) => {
  if (!startDate || !durationDays) return null;
  
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + durationDays);
  return dueDate;
};

export const calculateStartDate = (parentStartDate, position, siblingTasks) => {
  // If no parent start date, this is a top-level task
  if (!parentStartDate) return new Date();
  
  // Sort siblings by position
  const sortedSiblings = [...siblingTasks].sort((a, b) => a.position - b.position);
  
  let startDate = new Date(parentStartDate);
  
  // Calculate start date based on position and previous siblings' durations
  for (let i = 0; i < position; i++) {
    if (i < sortedSiblings.length) {
      const siblingDuration = sortedSiblings[i].default_duration || 1;
      startDate.setDate(startDate.getDate() + siblingDuration);
    }
  }
  
  return startDate;
};



export const updateChildDates = (tasks, parentId, parentStartDate) => {
  // Get direct children of this parent
  const children = tasks
    .filter(task => task.parent_task_id === parentId)
    .sort((a, b) => a.position - b.position);
  
  // No children, nothing to update
  if (children.length === 0) return tasks;
  
  let updatedTasks = [...tasks];
  let currentDate = new Date(parentStartDate);
  
  // Update each child's dates
  children.forEach(child => {
    const startDate = new Date(currentDate);
    const duration = child.default_duration || 1;
    const dueDate = calculateDueDate(startDate, duration);
    
    // Update this child
    updatedTasks = updatedTasks.map(task => 
      task.id === child.id 
        ? { ...task, start_date: startDate, due_date: dueDate } 
        : task
    );
    
    // Move date forward for next sibling
    currentDate.setDate(currentDate.getDate() + duration);
    
    // Recursively update this child's children
    updatedTasks = updateChildDates(updatedTasks, child.id, startDate);
  });
  
  return updatedTasks;
};