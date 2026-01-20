/**
 * Date Engine - Single Source of Truth for PlanterPlan Date Logic
 */

/**
 * Find a task by ID in a flat list
 * @param {Array} tasks
 * @param {string} id
 * @returns {Object|null}
 */
const findTaskById = (tasks, id) => {
  if (id === null || id === undefined) return null;
  return tasks.find((task) => task.id === id) || null;
};

/**
 * Calculates start/due dates based on a parent's date and an offset.
 * Handles extensive ancestor traversal to find the root project start date.
 *
 * @param {Array<Object>} tasks - List of all tasks (context)
 * @param {string} parentId - Direct parent ID
 * @param {number} daysOffset - Days to add/subtract from base date
 * @returns {{start_date?: string, due_date?: string}} Object with ISOString dates or empty
 */
export const calculateScheduleFromOffset = (tasks, parentId, daysOffset) => {
  if (parentId === null || parentId === undefined) return {};
  if (daysOffset === null || daysOffset === undefined) return {};

  const parentTask = findTaskById(tasks, parentId);
  if (!parentTask) return {};

  // Traverse up to find the root task (Project Root)
  let rootTask = parentTask;
  const visited = new Set();

  while (rootTask?.parent_task_id && !visited.has(rootTask.parent_task_id)) {
    visited.add(rootTask.parent_task_id);
    const ancestor = findTaskById(tasks, rootTask.parent_task_id);
    if (!ancestor) break;
    rootTask = ancestor;
  }

  // Use root's start date (Launch Date) or parent's start date as fallback
  const projectStartDate = rootTask?.start_date || parentTask.start_date;
  if (!projectStartDate) return {};

  const baseDate = projectStartDate.includes('T')
    ? projectStartDate
    : `${projectStartDate}T00:00:00.000Z`;

  const start = new Date(baseDate);

  if (Number.isNaN(start.getTime())) return {};

  // Normalize to UTC Midnight
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + daysOffset);

  const iso = start.toISOString();

  return {
    start_date: iso.split('T')[0],
    due_date: iso.split('T')[0],
  };
};

/**
 * Converts a date input to a YYYY-MM-DD string, ensuring UTC handling.
 * @param {string|Date} value
 * @returns {string|null} YYYY-MM-DD
 */
export const toIsoDate = (value) => {
  if (!value) return null;

  // Handle Date objects directly
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Handle strings
  if (typeof value === 'string') {
    // If it's already YYYY-MM-DD, return it
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;

    const base = value.includes('T') ? value : `${value}T00:00:00.000Z`;
    const parsed = new Date(base);
    if (Number.isNaN(parsed.getTime())) return null;

    parsed.setUTCHours(0, 0, 0, 0);
    return parsed.toISOString().split('T')[0];
  }

  return null;
};

/**
 * Formats a date string for display.
 * Handles ISO timestamps (Local Time) AND YYYY-MM-DD (UTC).
 *
 * @param {string} dateStr
 * @returns {string} Formatted date or 'Not set' / 'Invalid Date'
 */
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'Not set';

  let date;
  // If it contains a 'T', it's an ISO timestamp (e.g. created_at) -> Parse as Local
  // If it's short (YYYY-MM-DD), it's a manual date -> Parse as UTC to prevent "yesterday" bugs
  if (dateStr.includes('T')) {
    date = new Date(dateStr);
  } else {
    const [year, month, day] = dateStr.split('-');
    date = new Date(Date.UTC(year, month - 1, day));
  }

  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: dateStr.includes('T') ? undefined : 'UTC',
  });
};
/**
 * Calculates the bounding box (Min Start, Max Due) for a list of tasks.
 * Used for bottom-up date inheritance.
 *
 * @param {Array} children - List of child tasks
 * @returns {Object} { start_date: string|null, due_date: string|null } (YYYY-MM-DD)
 */
export const calculateMinMaxDates = (children) => {
  if (!children || children.length === 0) {
    return { start_date: null, due_date: null };
  }

  let minStart = null;
  let maxDue = null;

  children.forEach((child) => {
    // Handle Start Date
    if (child.start_date) {
      const childStart = toIsoDate(child.start_date); // Normalizes
      if (childStart) {
        if (!minStart || childStart < minStart) {
          minStart = childStart;
        }
      }
    }

    // Handle Due Date
    if (child.due_date) {
      const childDue = toIsoDate(child.due_date);
      if (childDue) {
        if (!maxDue || childDue > maxDue) {
          maxDue = childDue;
        }
      }
    }
  });

  return {
    start_date: minStart,
    due_date: maxDue,
  };
};

/**
 * Recalculates start/due dates for a project's tasks when the project start date changes.
 * Only affects incomplete tasks.
 *
 * @param {Array} projectTasks - Listing of all tasks in the project
 * @param {string} newStartDateStr - New Project Start Date (YYYY-MM-DD or ISO)
 * @param {string} oldStartDateStr - Old Project Start Date (YYYY-MM-DD or ISO)
 * @returns {Array} List of update objects { id, start_date, due_date }
 */
export const recalculateProjectDates = (projectTasks, newStartDateStr, oldStartDateStr) => {
  if (!projectTasks || !newStartDateStr || !oldStartDateStr) return [];

  const oldStart = new Date(toIsoDate(oldStartDateStr));
  const newStart = new Date(toIsoDate(newStartDateStr));

  if (isNaN(oldStart.getTime()) || isNaN(newStart.getTime())) return [];

  // Calculate delta in milliseconds
  const diffTime = newStart.getTime() - oldStart.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return [];

  const updates = [];

  projectTasks.forEach((task) => {
    // Skip if task is completed (preserve history)
    if (task.is_complete) return;

    // Skip if task has no dates
    if (!task.start_date) return;

    const taskStart = new Date(toIsoDate(task.start_date));
    let taskDue = task.due_date ? new Date(toIsoDate(task.due_date)) : null;

    if (isNaN(taskStart.getTime())) return;

    // Shift Start Date
    taskStart.setUTCDate(taskStart.getUTCDate() + diffDays);
    const newStartISO = taskStart.toISOString();

    // Shift Due Date (if exists)
    let newDueISO = null;
    if (taskDue && !isNaN(taskDue.getTime())) {
      taskDue.setUTCDate(taskDue.getUTCDate() + diffDays);
      newDueISO = taskDue.toISOString();
    }

    updates.push({
      id: task.id,
      start_date: newStartISO,
      due_date: newDueISO || newStartISO, // Fallback to start if due matches/missing logic
      updated_at: new Date().toISOString(),
    });
  });

  return updates;
};
