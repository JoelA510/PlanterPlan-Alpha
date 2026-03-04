import {
    format,
    addDays,
    differenceInCalendarDays,
    parseISO,
    isValid,
    isPast,
    isToday,
    endOfDay,
    isBefore
} from 'date-fns';

/**
 * Date Engine - Single Source of Truth for PlanterPlan Date Logic
 */

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

/** Flexible date input accepted by all date-engine helpers. */
export type DateInput = string | Date;

/** Minimal shape of a task needed by date-engine functions. */
export interface DateEngineTask {
    id: string;
    parent_task_id?: string | null;
    start_date?: string | null;
    due_date?: string | null;
    is_complete?: boolean | null;
}

/** Return shape for schedule calculation. */
export interface ScheduleDates {
    start_date?: string;
    due_date?: string;
}

/** Return shape for min/max date calculation. */
export interface MinMaxDates {
    start_date: string | null;
    due_date: string | null;
}

/** Return shape for project date recalculation. */
export interface DateUpdateRecord {
    id: string;
    start_date: string;
    due_date: string | null;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// Wrapper Functions  (New — centralize date-fns access)
// ---------------------------------------------------------------------------

/** Returns the current UTC time as an ISO string. */
export const nowUtcIso = (): string => new Date().toISOString();

/**
 * Safely resolves a {@link DateInput} to a `Date` object using `parseISO`
 * for strings. Returns `null` if the input is falsy or invalid.
 */
const resolve = (input: DateInput | null | undefined): Date | null => {
    if (!input) return null;
    const d = typeof input === 'string' ? parseISO(input) : input;
    return isValid(d) ? d : null;
};

/** Formats a date using the given `date-fns` format string. */
export const formatDate = (date: DateInput | null | undefined, formatStr: string): string => {
    const d = resolve(date);
    if (!d) return '';
    return format(d, formatStr);
};

/** Returns `true` if the date is strictly in the past (not today). */
export const isPastDate = (date: DateInput | null | undefined): boolean => {
    const d = resolve(date);
    if (!d) return false;
    return isPast(d) && !isToday(d);
};

/** Returns `true` if the date is today. */
export const isTodayDate = (date: DateInput | null | undefined): boolean => {
    const d = resolve(date);
    if (!d) return false;
    return isToday(d);
};

/** Adds `amount` calendar days to a date. Returns `null` on invalid input. */
export const addDaysToDate = (date: DateInput | null | undefined, amount: number): Date | null => {
    const d = resolve(date);
    if (!d) return null;
    return addDays(d, amount);
};

/** Calendar-day difference (`dateLeft − dateRight`). */
export const getDaysDifference = (
    dateLeft: DateInput | null | undefined,
    dateRight: DateInput | null | undefined,
): number | null => {
    const dl = resolve(dateLeft);
    const dr = resolve(dateRight);
    if (!dl || !dr) return null;
    return differenceInCalendarDays(dl, dr);
};

/** Validates a date input. */
export const isDateValid = (date: DateInput | null | undefined): boolean => {
    return resolve(date) !== null;
};

/** Safe `parseISO` wrapper — returns `null` instead of an invalid `Date`. */
export const parseIsoDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
};

/** Returns the end of the day for a given date. */
export const endOfDayDate = (date: DateInput | null | undefined): Date | null => {
    const d = resolve(date);
    if (!d) return null;
    return endOfDay(d);
};

/** Returns true if dateLeft is strictly before dateRight. */
export const isBeforeDate = (
    dateLeft: DateInput | null | undefined,
    dateRight: DateInput | null | undefined
): boolean => {
    const dl = resolve(dateLeft);
    const dr = resolve(dateRight);
    if (!dl || !dr) return false;
    return isBefore(dl, dr);
};

/** Compares two dates ascending (for sorting). Nulls map to 0 or end of list depending on logic, but we push nulls to end. */
export const compareDateAsc = (
    dateLeft: DateInput | null | undefined,
    dateRight: DateInput | null | undefined
): number => {
    const dl = resolve(dateLeft);
    const dr = resolve(dateRight);
    if (!dl && !dr) return 0;
    if (!dl) return 1; // nulls last
    if (!dr) return -1;
    return dl.getTime() - dr.getTime();
};

/** Compares two dates descending (for sorting). */
export const compareDateDesc = (
    dateLeft: DateInput | null | undefined,
    dateRight: DateInput | null | undefined
): number => {
    const dl = resolve(dateLeft);
    const dr = resolve(dateRight);
    if (!dl && !dr) return 0;
    if (!dl) return 1; // nulls last
    if (!dr) return -1;
    return dr.getTime() - dl.getTime(); // reverse of asc
};

// ---------------------------------------------------------------------------
// Core Domain Functions  (existing logic, now typed)
// ---------------------------------------------------------------------------

/** Find a task by ID in a flat list. */
export const findTaskById = <T extends DateEngineTask>(
    tasks: T[],
    id: string | null | undefined,
): T | null => {
    if (id === null || id === undefined) return null;
    return tasks.find((task) => task.id === id) ?? null;
};

/**
 * Calculates start/due dates based on a parent's date and an offset.
 * Traverses ancestors to find the root project start date.
 */
export const calculateScheduleFromOffset = (
    tasks: DateEngineTask[],
    parentId: string | null | undefined,
    daysOffset: number | null | undefined,
): ScheduleDates => {
    if (parentId === null || parentId === undefined) return {};
    if (daysOffset === null || daysOffset === undefined) return {};

    const parentTask = findTaskById(tasks, parentId);
    if (!parentTask) return {};

    // Traverse up to find the root task (Project Root)
    let rootTask = parentTask;
    const visited = new Set<string>();

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
    const dateOnly = iso.split('T')[0];

    return {
        start_date: dateOnly,
        due_date: dateOnly,
    };
};

/**
 * Converts a date input to a `YYYY-MM-DD` string, ensuring UTC handling.
 */
export const toIsoDate = (value: DateInput | null | undefined): string | null => {
    if (!value) return null;

    // Handle Date objects directly
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    // Handle strings
    if (typeof value === 'string') {
        // If it's already YYYY-MM-DD, return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

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
 */
export const formatDisplayDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not set';

    let date: Date;
    // If it contains a 'T', it's an ISO timestamp (e.g. created_at) -> Parse as Local
    // If it's short (YYYY-MM-DD), it's a manual date -> Parse as UTC to prevent "yesterday" bugs
    if (dateStr.includes('T')) {
        date = new Date(dateStr);
    } else {
        const [yearStr, monthStr, dayStr] = dateStr.split('-');
        date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
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
 */
export const calculateMinMaxDates = (children: DateEngineTask[] | null | undefined): MinMaxDates => {
    if (!children || children.length === 0) {
        return { start_date: null, due_date: null };
    }

    let minStart: string | null = null;
    let maxDue: string | null = null;

    children.forEach((child) => {
        // Handle Start Date
        if (child.start_date) {
            const childStart = toIsoDate(child.start_date);
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
 */
export const recalculateProjectDates = (
    projectTasks: DateEngineTask[] | null | undefined,
    newStartDateStr: string | null | undefined,
    oldStartDateStr: string | null | undefined,
): DateUpdateRecord[] => {
    if (!projectTasks || !newStartDateStr || !oldStartDateStr) return [];

    const oldIso = toIsoDate(oldStartDateStr);
    const newIso = toIsoDate(newStartDateStr);
    if (!oldIso || !newIso) return [];

    const oldStart = new Date(oldIso);
    const newStart = new Date(newIso);

    if (isNaN(oldStart.getTime()) || isNaN(newStart.getTime())) return [];

    // Calculate delta in milliseconds
    const diffTime = newStart.getTime() - oldStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return [];

    const updates: DateUpdateRecord[] = [];

    projectTasks.forEach((task) => {
        // Skip if task is completed (preserve history)
        if (task.is_complete) return;

        // Skip if task has no dates
        if (!task.start_date) return;

        const taskStartIso = toIsoDate(task.start_date);
        if (!taskStartIso) return;

        const taskStart = new Date(taskStartIso);
        if (isNaN(taskStart.getTime())) return;

        // Shift Start Date
        taskStart.setUTCDate(taskStart.getUTCDate() + diffDays);
        const newStartISO = taskStart.toISOString();

        // Shift Due Date (if exists)
        let newDueISO: string | null = null;
        if (task.due_date) {
            const taskDueIso = toIsoDate(task.due_date);
            if (taskDueIso) {
                const taskDue = new Date(taskDueIso);
                if (!isNaN(taskDue.getTime())) {
                    taskDue.setUTCDate(taskDue.getUTCDate() + diffDays);
                    newDueISO = taskDue.toISOString();
                }
            }
        }

        updates.push({
            id: task.id,
            start_date: newStartISO,
            due_date: newDueISO || null,
            updated_at: nowUtcIso(),
        });
    });

    return updates;
};
