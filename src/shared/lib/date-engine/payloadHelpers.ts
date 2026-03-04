import { calculateScheduleFromOffset, toIsoDate, nowUtcIso } from './index';
import type { ScheduleDates } from './index';
import { POSITION_STEP } from '@/shared/constants';

// ---------------------------------------------------------------------------
// Form Data & Context Types
// ---------------------------------------------------------------------------

/** Shape of task form data as received from the UI. */
export interface TaskFormData {
 title: string;
 description?: string | null;
 notes?: string | null;
 purpose?: string | null;
 actions?: string | null;
 days_from_start?: string | number | null;
 start_date?: string | Date | null;
 due_date?: string | Date | null;
}

/** Current task being updated (subset needed by the payload builder). */
export interface CurrentTask {
 id: string;
 start_date?: string | null;
 due_date?: string | null;
}

/** Context needed for update operations. */
export interface UpdateContext {
 origin: string;
 parentId: string | null;
 rootId?: string | null;
 contextTasks?: Array<{ id: string; parent_task_id?: string | null; start_date?: string | null; due_date?: string | null }>;
}

/** Context needed for create operations. */
export interface CreateContext extends UpdateContext {
 userId: string;
 maxPosition: number | null;
}

/** Shape of a task update payload sent to the database. */
export interface UpdatePayload {
 title: string;
 description: string | null;
 notes: string | null;
 purpose: string | null;
 actions: string | null;
 days_from_start: number | null;
 updated_at: string;
 start_date?: string | null;
 due_date?: string | null;
}

/** Shape of a task insert payload sent to the database. */
export interface InsertPayload {
 title: string;
 description: string | null;
 notes: string | null;
 purpose: string | null;
 actions: string | null;
 days_from_start: number | null;
 origin: string;
 creator: string;
 parent_task_id: string | null;
 position: number;
 is_complete: boolean;
 root_id?: string | null;
 start_date?: string | null;
 due_date?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalizes the raw `days_from_start` form value to a number or null. */
const parseDays = (value: string | number | null | undefined): number | null => {
 if (value === '' || value === null || value === undefined) return null;
 return Number(value);
};

// ---------------------------------------------------------------------------
// Payload Constructors
// ---------------------------------------------------------------------------

/**
 * Constructs the payload for updating an existing task.
 * Centralizes logic for 'Instance' vs 'Template' and date inputs.
 */
export const constructUpdatePayload = (
 formData: TaskFormData,
 _currentTask: CurrentTask,
 context: UpdateContext,
): UpdatePayload => {
 const { origin, parentId, contextTasks } = context;

 const parsedDays = parseDays(formData.days_from_start);

 const manualStartDate = toIsoDate(formData.start_date);
 const manualDueDate = toIsoDate(formData.due_date);
 const hasManualDates = Boolean(manualStartDate || manualDueDate);

 let scheduleUpdates: ScheduleDates = {};

 // Logic from useTaskMutations: Instance-specific date math
 if (origin === 'instance') {
 if (parsedDays !== null) {
 scheduleUpdates = calculateScheduleFromOffset(
 contextTasks ?? [],
 parentId,
 parsedDays,
 );
 }

 // Manual overrides take precedence or fallback to calculated
 if (hasManualDates) {
 scheduleUpdates = {
 start_date: manualStartDate ?? undefined,
 due_date: manualDueDate ?? manualStartDate ?? scheduleUpdates.due_date ?? undefined,
 };
 }

 // Clear dates if clearing days_from_start and no manual dates
 if (!hasManualDates && parsedDays === null) {
 scheduleUpdates = {};
 }
 }

 return {
 title: formData.title,
 description: formData.description ?? null,
 notes: formData.notes ?? null,
 purpose: formData.purpose ?? null,
 actions: formData.actions ?? null,
 days_from_start: parsedDays,
 updated_at: nowUtcIso(),
 ...scheduleUpdates,
 };
};

/**
 * Constructs the payload for creating a new task.
 */
export const constructCreatePayload = (
 formData: TaskFormData,
 context: CreateContext,
): InsertPayload => {
 const { origin, parentId, rootId, contextTasks, userId, maxPosition } = context;

 const parsedDays = parseDays(formData.days_from_start);

 const manualStartDate = toIsoDate(formData.start_date);
 const manualDueDate = toIsoDate(formData.due_date);
 const hasManualDates = Boolean(manualStartDate || manualDueDate);

 const insertPayload: InsertPayload = {
 title: formData.title,
 description: formData.description ?? null,
 notes: formData.notes ?? null,
 purpose: formData.purpose ?? null,
 actions: formData.actions ?? null,
 days_from_start: parsedDays,
 origin,
 creator: userId,
 parent_task_id: parentId,
 position: (maxPosition ?? 0) + POSITION_STEP,
 is_complete: false,
 root_id: rootId,
 };

 if (origin === 'instance') {
 if (parsedDays !== null) {
 const scheduleDates = calculateScheduleFromOffset(contextTasks ?? [], parentId, parsedDays);
 if (scheduleDates?.start_date) insertPayload.start_date = scheduleDates.start_date;
 if (scheduleDates?.due_date) insertPayload.due_date = scheduleDates.due_date;
 }
 if (hasManualDates) {
 insertPayload.start_date = manualStartDate;
 insertPayload.due_date = manualDueDate ?? manualStartDate ?? insertPayload.due_date ?? null;
 }
 }

 return insertPayload;
};
