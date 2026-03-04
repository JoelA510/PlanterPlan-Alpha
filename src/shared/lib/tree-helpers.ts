import type { TaskRow as Task } from '@/shared/db/app.types'

export type TaskNode = Task & {
    children: TaskNode[]
    depth: number
}

export function buildTree(tasks: Task[]): TaskNode[] {
    // Map for O(1) access
    const taskMap = new Map<string, TaskNode>()

    // Initialize nodes
    tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [], depth: 0 })
    })

    const roots: TaskNode[] = []

    // Build tree
    tasks.forEach(task => {
        const node = taskMap.get(task.id)!

        if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
            const parent = taskMap.get(task.parent_task_id)!
            parent.children.push(node)
        } else {
            // It's a root in this context (e.g. the project task itself, or an orphan)
            roots.push(node)
        }
    })

    // Post-process: sort all children arrays once (avoids re-sorting on every insertion)
    taskMap.forEach(node => {
        if (node.children.length > 1) {
            node.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        }
    })

    // Calculate depth (BFS)
    const queue = roots.map(node => ({ node, depth: 0 }))
    while (queue.length > 0) {
        const { node, depth } = queue.shift()!
        node.depth = depth
        node.children.forEach(child => {
            queue.push({ node: child, depth: depth + 1 })
        })
    }

    // Sort roots
    roots.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    return roots
}

export interface SeparatedTasks {
    instanceTasks: Task[];
    templateTasks: Task[];
}

export function separateTasksByOrigin(tasks: Task[] = []): SeparatedTasks {
    return {
        instanceTasks: tasks.filter(t => t.origin !== 'template'),
        templateTasks: tasks.filter(t => t.origin === 'template')
    };
}
