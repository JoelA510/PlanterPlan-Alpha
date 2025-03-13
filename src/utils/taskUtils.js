export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

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
