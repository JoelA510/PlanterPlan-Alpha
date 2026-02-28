import { addDaysToDate, getDaysDifference, formatDate, parseIsoDate } from '@/shared/lib/date-engine';

/** Minimal task shape needed for date inheritance calculations. */
export interface DateInheritanceTask {
    id: string;
    parent_task_id?: string | null;
    start_date?: string | null;
}

/** An update record produced by date cascade logic. */
export interface DateDeltaUpdate {
    id: string;
    start_date: string;
}

/**
 * Returns a flat list of all descendant tasks for a given root task ID.
 */
export const getDescendants = (allTasks: DateInheritanceTask[], rootId: string): DateInheritanceTask[] => {
    const childrenMap = new Map<string, DateInheritanceTask[]>();
    for (const t of allTasks) {
        const pid = t.parent_task_id;
        if (pid) {
            if (!childrenMap.has(pid)) childrenMap.set(pid, []);
            childrenMap.get(pid)!.push(t);
        }
    }

    const result: DateInheritanceTask[] = [];
    const queue: string[] = [rootId];

    while (queue.length) {
        const currentId = queue.shift()!;
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
 */
export const calculateDateDeltas = (
    allTasks: DateInheritanceTask[],
    rootId: string,
    oldDate: string | Date | null | undefined,
    newDate: string | Date | null | undefined
): DateDeltaUpdate[] => {
    if (!oldDate || !newDate) return [];

    const oldD = typeof oldDate === 'string' ? parseIsoDate(oldDate) : oldDate;
    const newD = typeof newDate === 'string' ? parseIsoDate(newDate) : newDate;

    if (!oldD || !newD) return [];

    const diffDays = getDaysDifference(newD, oldD);
    if (diffDays === 0) return [];

    const descendants = getDescendants(allTasks, rootId);
    const updates: DateDeltaUpdate[] = [];

    for (const task of descendants) {
        if (task.start_date) {
            const currentTaskDate = typeof task.start_date === 'string' ? parseIsoDate(task.start_date) : task.start_date;
            if (currentTaskDate) {
                const newDescendantDate = addDaysToDate(currentTaskDate as Date, diffDays);
                updates.push({
                    id: task.id,
                    start_date: formatDate(newDescendantDate, 'yyyy-MM-dd'),
                });
            }
        }
    }

    return updates;
};
