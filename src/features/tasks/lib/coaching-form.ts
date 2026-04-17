import type { TaskFormData } from '@/shared/db/app.types';

/**
 * Normalise the flat `is_coaching_task` form field emitted by TaskForm into
 * a patch for the outgoing `settings` JSONB. Mirrors the one-place-to-merge
 * pattern from `recurrence-form.ts`.
 *
 * Return semantics:
 *   - `true`  → caller should set `settings.is_coaching_task = true`
 *   - `false` → caller should delete `settings.is_coaching_task` (clears flag)
 *   - `null`  → caller should leave `settings` untouched (e.g., the UI gate
 *               hid the checkbox for the current user's role, so the field
 *               never rendered and submission didn't emit a value)
 */
export function formDataToCoachingFlag(data: TaskFormData): boolean | null {
    if (data.is_coaching_task === undefined) return null;
    return Boolean(data.is_coaching_task);
}

/**
 * Apply the normalised coaching flag to an existing `settings` JSONB object,
 * preserving every other key. Returns `undefined` when there is nothing to
 * persist (`flag === null` AND no existing settings), so the caller can
 * skip including `settings` in the outgoing payload entirely.
 */
export function applyCoachingFlag(
    currentSettings: Record<string, unknown> | null | undefined,
    flag: boolean | null,
): Record<string, unknown> | undefined {
    const base =
        currentSettings && typeof currentSettings === 'object' && !Array.isArray(currentSettings)
            ? { ...currentSettings }
            : {};
    if (flag === null) {
        // No intent to change — only emit a patch if we already have settings.
        return Object.keys(base).length > 0 ? base : undefined;
    }
    if (flag === true) {
        return { ...base, is_coaching_task: true };
    }
    // flag === false → clear the key.
    const next = { ...base };
    delete next.is_coaching_task;
    return next;
}
