import { Database } from '@/shared/db/types'

type Task = Database['public']['Tables']['tasks']['Row']

export type TaskNode = Task & {
    children: TaskNode[]
    depth: number
}

export function buildTaskTree(tasks: Task[], rootId: string): TaskNode[] {
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

        // Determine parent
        // If task is the project root itself, it has no parent in *this* tree view (or it is the root)
        if (task.id === rootId) {
            // This is the project root task.
            // We might want to return it as the single root, or return its children?
            // Usually Project View shows the project task as the header/container, and children as the content.
            // Let's assume this function returns the children of the project? 
            // Or strictly strictly builds the tree from the list provided.
            // If the list contains the root, we put it in roots.
            // But if it has a parent_task_id that is NOT in the list, it's a root of this specific subgraph.
            // Let's rely on parent_task_id.
        }

        if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
            const parent = taskMap.get(task.parent_task_id)!
            parent.children.push(node)
            // Sort children by position
            parent.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        } else {
            // It's a root in this context (e.g. the project task itself, or an orphan)
            roots.push(node)
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
