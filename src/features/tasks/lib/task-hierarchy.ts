import type { TaskRow } from '@/shared/db/app.types';

export const MAX_TASK_HIERARCHY_DEPTH = 4;

/**
 * Return the zero-based hierarchy depth for a task in a flat task list.
 *
 * @param taskId - Task id to inspect.
 * @param tasks - Flat hierarchy rows that include the task and its ancestors.
 * @returns The task depth, or null when the chain cannot be resolved safely.
 */
export function getTaskDepth(taskId: string, tasks: Array<Pick<TaskRow, 'id' | 'parent_task_id'>>): number | null {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    let current = byId.get(taskId);
    if (!current) return null;

    const visited = new Set<string>([taskId]);
    let depth = 0;

    while (current.parent_task_id) {
        const parent = byId.get(current.parent_task_id);
        if (!parent || visited.has(parent.id)) return null;
        visited.add(parent.id);
        depth += 1;
        current = parent;
    }

    return depth;
}

/**
 * Return the maximum descendant height below a task.
 *
 * @param taskId - Root task id for the subtree.
 * @param tasks - Flat hierarchy rows that include descendants.
 * @returns The maximum child distance below the task; leaf tasks return 0.
 */
export function getTaskSubtreeHeight(taskId: string, tasks: Array<Pick<TaskRow, 'id' | 'parent_task_id'>>): number {
    const childrenByParent = new Map<string, Array<Pick<TaskRow, 'id' | 'parent_task_id'>>>();
    for (const task of tasks) {
        if (!task.parent_task_id || task.id === task.parent_task_id) continue;
        const existing = childrenByParent.get(task.parent_task_id) ?? [];
        existing.push(task);
        childrenByParent.set(task.parent_task_id, existing);
    }

    const walk = (id: string, visited: Set<string>): number => {
        const children = childrenByParent.get(id) ?? [];
        let height = 0;
        for (const child of children) {
            if (visited.has(child.id)) continue;
            const nextVisited = new Set(visited).add(child.id);
            height = Math.max(height, 1 + walk(child.id, nextVisited));
        }
        return height;
    };

    return walk(taskId, new Set([taskId]));
}

/**
 * Determine whether one task is below another in the task tree.
 *
 * @param ancestorTaskId - Candidate ancestor task id.
 * @param targetTaskId - Candidate descendant task id.
 * @param tasks - Flat hierarchy rows that include the relevant subtree.
 * @returns True when targetTaskId is a descendant of ancestorTaskId.
 */
export function isTaskDescendant(
    ancestorTaskId: string,
    targetTaskId: string,
    tasks: Array<Pick<TaskRow, 'id' | 'parent_task_id'>>,
): boolean {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    let current = byId.get(targetTaskId);
    const visited = new Set<string>();

    while (current?.parent_task_id) {
        if (current.parent_task_id === ancestorTaskId) return true;
        if (visited.has(current.parent_task_id)) return false;
        visited.add(current.parent_task_id);
        current = byId.get(current.parent_task_id);
    }

    return false;
}

/**
 * Determine whether reparenting a task would preserve the supported max depth.
 *
 * @param activeTaskId - Task being moved.
 * @param targetParentId - New parent id, or null for a root-level move.
 * @param tasks - Flat hierarchy rows that include the task, ancestors, and descendants.
 * @returns True when the reparent operation stays within the supported hierarchy.
 */
export function canReparentTask(
    activeTaskId: string,
    targetParentId: string | null,
    tasks: Array<Pick<TaskRow, 'id' | 'parent_task_id'>>,
): boolean {
    if (targetParentId === activeTaskId) return false;
    if (targetParentId && isTaskDescendant(activeTaskId, targetParentId, tasks)) return false;

    const activeDepth = getTaskDepth(activeTaskId, tasks);
    if (activeDepth === null) return false;

    const parentDepth = targetParentId ? getTaskDepth(targetParentId, tasks) : -1;
    if (parentDepth === null) return false;

    const newDepth = parentDepth + 1;
    const subtreeHeight = getTaskSubtreeHeight(activeTaskId, tasks);
    return newDepth + subtreeHeight <= MAX_TASK_HIERARCHY_DEPTH;
}

/**
 * Determine whether a task may receive child rows in the supported hierarchy.
 *
 * @param task - Task being considered as a parent.
 * @param tasks - Flat hierarchy rows that include the task and its ancestors when available.
 * @returns True when the task is not already the final subtask level.
 */
export function canTaskHaveChildren(task: Pick<TaskRow, 'id' | 'parent_task_id' | 'task_type'>, tasks: Array<Pick<TaskRow, 'id' | 'parent_task_id'>>): boolean {
    const depth = getTaskDepth(task.id, tasks);
    if (depth !== null) return depth < MAX_TASK_HIERARCHY_DEPTH;
    return task.task_type !== 'subtask';
}
