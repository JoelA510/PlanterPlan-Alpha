import type { TaskRow } from '@/shared/db/app.types';

export type ProjectKind = 'date' | 'checkpoint';

/**
 * Reads the project kind from a root task's `settings` JSONB. Defaults to
 * `'date'` when the key is absent, null, or any non-recognised value, so
 * every pre-Wave-29 project keeps its original behaviour.
 *
 * @param rootTask - Root task (or undefined/null) whose settings carry the kind.
 * @returns The project kind — either 'date' (default) or 'checkpoint'.
 */
export function extractProjectKind(
    rootTask: Pick<TaskRow, 'settings'> | null | undefined,
): ProjectKind {
    const settings = rootTask?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'date';
    const raw = (settings as Record<string, unknown>).project_kind;
    return raw === 'checkpoint' ? 'checkpoint' : 'date';
}

/**
 * Normalises a form's `project_kind` field into the settings shape.
 * Returns `null` when the form did not include the field (no change).
 *
 * @param data - Form data (arbitrary shape) that may contain a `project_kind`.
 * @returns The normalised kind, or `null` to leave settings untouched.
 */
export function formDataToProjectKind(data: { project_kind?: ProjectKind }): ProjectKind | null {
    if (data.project_kind === 'checkpoint' || data.project_kind === 'date') return data.project_kind;
    return null;
}

/**
 * Merges a project kind into the existing settings JSONB, preserving all other
 * keys. Pass `null` to leave settings untouched.
 *
 * @param currentSettings - Existing settings JSONB on the root task.
 * @param kind - Normalised project kind (see `formDataToProjectKind`), or null.
 * @returns The merged settings patch, or the original settings when `kind === null`.
 */
export function applyProjectKind(
    currentSettings: Record<string, unknown> | null | undefined,
    kind: ProjectKind | null,
): Record<string, unknown> | undefined {
    const base =
        currentSettings && typeof currentSettings === 'object' && !Array.isArray(currentSettings)
            ? { ...currentSettings }
            : {};
    if (kind === null) {
        return Object.keys(base).length > 0 ? base : undefined;
    }
    return { ...base, project_kind: kind };
}
