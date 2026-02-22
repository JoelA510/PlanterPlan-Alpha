import { calculateScheduleFromOffset, toIsoDate } from './index';
import { POSITION_STEP } from '@/app/constants/index';

/**
 * Constructs the payload for updating an existing task.
 * Centralizes logic for 'Instance' vs 'Template' and date inputs.
 * 
 * @param {Object} formData - Raw form data from UI
 * @param {Object} currentTask - The task being updated (for fallback values)
 * @param {Object} context - { origin, parentId, rootId, contextTasks }
 * @returns {Object} Update payload for DB
 */
export const constructUpdatePayload = (formData, currentTask, context) => {
    const { origin, parentId, contextTasks } = context;

    const daysVal = formData.days_from_start;
    const parsedDays =
        daysVal === '' || daysVal === null || daysVal === undefined ? null : Number(daysVal);

    const manualStartDate = toIsoDate(formData.start_date);
    const manualDueDate = toIsoDate(formData.due_date);
    const hasManualDates = Boolean(manualStartDate || manualDueDate);

    let scheduleUpdates = {};

    // Logic from useTaskMutations: Instance-specific date math
    if (origin === 'instance') {
        if (parsedDays !== null) {
            scheduleUpdates = calculateScheduleFromOffset(
                contextTasks || [],
                parentId,
                parsedDays
            );
        }

        // Manual overrides take precedence or fallback to calculated
        if (hasManualDates) {
            scheduleUpdates = {
                start_date: manualStartDate,
                due_date: manualDueDate || manualStartDate || scheduleUpdates.due_date || null,
            };
        }

        // Clear dates if clearing days_from_start and no manual dates
        if (!hasManualDates && parsedDays === null) {
            // Intentionally leaving this empty to imply "no date changes" or should it nullify?
            // Original code: if (!hasManualDates && parsedDays === null) scheduleUpdates = {};
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
        updated_at: new Date().toISOString(),
        ...scheduleUpdates,
    };
};

/**
 * Constructs the payload for creating a new task.
 * 
 * @param {Object} formData - Raw form data
 * @param {Object} context - { origin, parentId, rootId, contextTasks, userId, maxPosition }
 * @returns {Object} Insert payload for DB
 */
export const constructCreatePayload = (formData, context) => {
    const { origin, parentId, rootId, contextTasks, userId, maxPosition } = context;

    const daysVal = formData.days_from_start;
    const parsedDays =
        daysVal === '' || daysVal === null || daysVal === undefined ? null : Number(daysVal);

    const manualStartDate = toIsoDate(formData.start_date);
    const manualDueDate = toIsoDate(formData.due_date);
    const hasManualDates = Boolean(manualStartDate || manualDueDate);

    const insertPayload = {
        title: formData.title,
        description: formData.description ?? null,
        notes: formData.notes ?? null,
        purpose: formData.purpose ?? null,
        actions: formData.actions ?? null,
        days_from_start: parsedDays,
        origin,
        creator: userId,
        parent_task_id: parentId,
        position: (maxPosition || 0) + POSITION_STEP,
        is_complete: false,
        root_id: rootId,
    };

    if (origin === 'instance') {
        if (parsedDays !== null) {
            Object.assign(
                insertPayload,
                calculateScheduleFromOffset(contextTasks || [], parentId, parsedDays)
            );
        }
        if (hasManualDates) {
            insertPayload.start_date = manualStartDate;
            insertPayload.due_date = manualDueDate || manualStartDate || insertPayload.due_date || null;
        }
    }

    return insertPayload;
};
