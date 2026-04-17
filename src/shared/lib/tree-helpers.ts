import type { TaskRow } from '@/shared/db/app.types'
import type { TaskItemData as TaskNode } from '@/shared/types/tasks'

export type { TaskNode }

export function buildTree(tasks: TaskRow[], rootId: string | null = null): TaskNode[] {
    const taskMap = new Map<string, TaskNode>()

    // Initialize nodes
    tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [], isExpanded: false })
    })

    const roots: TaskNode[] = []

    // Build tree
    tasks.forEach(task => {
        const node = taskMap.get(task.id)!
        const parentId = task.parent_task_id

        if (parentId && taskMap.has(parentId)) {
            const parent = taskMap.get(parentId)!
            if (!parent.children) parent.children = []
            parent.children.push(node)
        } else if (!rootId || parentId === rootId || task.id === rootId) {
            roots.push(node)
        }
    })

    // Post-process: sort
    taskMap.forEach(node => {
        if (node.children && node.children.length > 1) {
            node.children.sort((a: TaskNode, b: TaskNode) => (a.position ?? 0) - (b.position ?? 0))
        }
    })

    // Calculate depth (BFS)
    const queue = roots.map(node => ({ node, depth: 0 }))
    while (queue.length > 0) {
        const { node, depth } = queue.shift()!
        // TaskNode doesn't have depth in TaskItemData? Let's check.
        // It doesn't, but we can add it as an extra property if needed by some UI.
        // For now, let's keep it simple.
        node.children?.forEach((child: TaskNode) => {
            queue.push({ node: child, depth: depth + 1 })
        })
    }

    roots.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    return roots
}

export interface SeparatedTasks {
    instanceTasks: TaskRow[];
    templateTasks: TaskRow[];
}

export function separateTasksByOrigin(tasks: TaskRow[] = []): SeparatedTasks {
    return {
        instanceTasks: tasks.filter(t => t.origin !== 'template'),
        templateTasks: tasks.filter(t => t.origin === 'template')
    };
}

export function updateTaskInTree(nodes: TaskNode[], taskId: string, updates: Partial<TaskNode>): TaskNode[] {
    return nodes.map(node => {
        if (node.id === taskId) {
            return { ...node, ...updates };
        }
        if (node.children && node.children.length > 0) {
            return { ...node, children: updateTaskInTree(node.children, taskId, updates) };
        }
        return node;
    });
}

export function mergeTaskUpdates(newRoots: TaskRow[]): TaskNode[] {
    return buildTree(newRoots);
}

export function updateTreeExpansion(nodes: TaskNode[], expandedIds: Set<string>): TaskNode[] {
    return nodes.map(node => ({
        ...node,
        isExpanded: expandedIds.has(node.id),
        children: node.children ? updateTreeExpansion(node.children, expandedIds) : []
    }));
}

export function mergeChildrenIntoTree(nodes: TaskNode[], parentId: string, children: TaskNode[]): TaskNode[] {
    return nodes.map(node => {
        if (node.id === parentId) {
            return { ...node, children };
        }
        if (node.children && node.children.length > 0) {
            return { ...node, children: mergeChildrenIntoTree(node.children, parentId, children) };
        }
        return node;
    });
}

/**
 * Walk a flat task list (typically a project hierarchy) and collect every
 * `settings.spawnedFromTemplate` string that's present. Used by Master
 * Library search callers to hide templates already cloned into the active
 * project. Tolerates loose JSONB: non-object `settings`, missing keys, and
 * non-string values are all skipped.
 * @param tasks - Flat array of tasks (may be undefined/empty).
 * @returns Array of template ids found on `settings.spawnedFromTemplate`.
 */
export function collectSpawnedTemplateIds(
    tasks: ReadonlyArray<Record<string, unknown> | null | undefined> | null | undefined,
): string[] {
    if (!tasks || tasks.length === 0) return [];
    const ids: string[] = [];
    for (const t of tasks) {
        if (!t) continue;
        const settings = (t as { settings?: unknown }).settings;
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) continue;
        const spawned = (settings as Record<string, unknown>).spawnedFromTemplate;
        if (typeof spawned === 'string') ids.push(spawned);
    }
    return ids;
}
