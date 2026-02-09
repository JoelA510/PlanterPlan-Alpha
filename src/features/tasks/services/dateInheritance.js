import { addDays, differenceInCalendarDays, parseISO, isValid, format } from 'date-fns';

/**
 * Returns a flat list of all descendant tasks for a given root task ID.
 * @param {Array} allTasks - Flat list of all tasks.
 * @param {string} rootId - ID of the task to find descendants for.
 * @returns {Array} List of descendant task objects.
 */
export const getDescendants = (allTasks, rootId) => {
    const childrenMap = new Map();
    // Index by parent_task_id
    for (const t of allTasks) {
        const pid = t.parent_task_id;
        if (pid) {
            if (!childrenMap.has(pid)) childrenMap.set(pid, []);
            childrenMap.get(pid).push(t);
        }
    }

    const result = [];
    const queue = [rootId];

    while (queue.length) {
        const currentId = queue.shift();
        const kids = childrenMap.get(currentId) || [];
        for (const kid of kids) {
            result.push(kid);
            queue.push(kid.id);
        }
    }

    return result;
};

/**
 * Calculates the new start_date for all descendants based on the parent's date shift.
 * @param {Array} allTasks - Flat list of all tasks context.
 * @param {string} rootId - The parent task ID that changed.
 * @param {string|Date} oldDate - The original start_date of the parent.
 * @param {string|Date} newDate - The new start_date of the parent.
 * @returns {Array} List of updates: [{ id, start_date }]
 */
export const calculateDateDeltas = (allTasks, rootId, oldDate, newDate) => {
    if (!oldDate || !newDate) return [];

    const oldD = typeof oldDate === 'string' ? parseISO(oldDate) : oldDate;
    const newD = typeof newDate === 'string' ? parseISO(newDate) : newDate;

    if (!isValid(oldD) || !isValid(newD)) return [];

    const diffDays = differenceInCalendarDays(newD, oldD);
    if (diffDays === 0) return [];

    const descendants = getDescendants(allTasks, rootId);
    const updates = [];

    for (const task of descendants) {
        if (task.start_date) {
            const currentTaskDate = typeof task.start_date === 'string' ? parseISO(task.start_date) : task.start_date;
            if (isValid(currentTaskDate)) {
                const newDescendantDate = addDays(currentTaskDate, diffDays);
                updates.push({
                    id: task.id,
                    start_date: format(newDescendantDate, 'yyyy-MM-dd')
                });
            }
        }
    }

    return updates;
};
