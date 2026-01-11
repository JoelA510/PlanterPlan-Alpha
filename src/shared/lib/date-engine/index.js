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
 * @param {Array} tasks - List of all tasks (context)
 * @param {string} parentId - Direct parent ID
 * @param {number} daysOffset - Days to add/subtract from base date
 * @returns {Object} { start_date: ISOString, due_date: ISOString } or {}
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
        start_date: iso,
        due_date: iso,
    };
};

/**
 * Converts a date input to a YYYY-MM-DD string, ensuring UTC handling.
 * @param {string|Date} value 
 * @returns {string|null} YYYY-MM-DD
 */
export const toIsoDate = (value) => {
    if (!value) return null;

    const base = value.includes('T') ? value : `${value}T00:00:00.000Z`;
    const parsed = new Date(base);

    if (Number.isNaN(parsed.getTime())) return null;

    // Use UTC Midnight effectively
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed.toISOString().split('T')[0];
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
