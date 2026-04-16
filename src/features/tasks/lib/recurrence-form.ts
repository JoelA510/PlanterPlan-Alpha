import type { RecurrenceRule, TaskFormData } from '@/shared/db/app.types';

/**
 * Normalise the flat `recurrence_*` form fields emitted by `TaskForm` into
 * the nested JSONB shape stored at `settings.recurrence`. Returns `null`
 * when the picker is set to "None" or the rule is incomplete — the caller
 * uses that signal to clear the key from `settings`.
 */
export function formDataToRecurrenceRule(data: TaskFormData): RecurrenceRule | null {
    const kind = data.recurrence_kind;
    const target = data.recurrence_target_project_id;
    if (!target) return null;
    if (kind === 'weekly' && typeof data.recurrence_weekday === 'number') {
        const w = data.recurrence_weekday;
        if (w < 0 || w > 6) return null;
        return { kind: 'weekly', weekday: w as 0 | 1 | 2 | 3 | 4 | 5 | 6, targetProjectId: target };
    }
    if (kind === 'monthly' && typeof data.recurrence_day_of_month === 'number') {
        const d = data.recurrence_day_of_month;
        if (d < 1 || d > 28) return null;
        return { kind: 'monthly', dayOfMonth: d, targetProjectId: target };
    }
    return null;
}
