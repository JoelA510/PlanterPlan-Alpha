import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { TaskNode } from '@/shared/lib/tree-helpers'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/features/tasks/hooks/useTaskMutations'
import { useAuth } from '@/app/contexts/AuthContext'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskTree } from '@/features/tasks/hooks/useTasks'

interface TaskRowProps {
    node: TaskNode
    rootId: string
    items: Record<string, string[]>
    onSelectTask?: (taskId: string) => void
}

import { TaskRowUI } from './TaskRowUI'

export function SortableTaskRow({ node, rootId, items, onSelectTask }: TaskRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: node.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const { mutate: updateTask } = useUpdateTask()
    const { mutate: deleteTask } = useDeleteTask()
    const { mutate: createTask } = useCreateTask()
    const { user } = useAuth()

    const handleToggle = () => {
        updateTask({ id: node.id, is_complete: !node.is_complete })
    }

    const handleDelete = () => {
        if (confirm("Delete this?")) deleteTask({ id: node.id })
    }

    const handleAddSubtask = () => {
        const title = prompt("Subtask Title:")
        if (!title) return
        createTask([{
            title,
            parent_task_id: node.id,
            root_id: rootId,
            creator: user?.id ?? null,
            status: 'todo'
        }])
    }

    // Children are now driven by the `items` state from the DnD hook
    const childIds = items[node.id] || []

    return (
        <TaskRowUI
            node={node}
            isDragging={isDragging}
            dragAttributes={attributes}
            dragListeners={listeners}
            setNodeRef={setNodeRef}
            style={style}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onSelect={() => onSelectTask?.(node.id)}
        >
            {/* Recursively Render Sortable Context for Children */}
            {childIds.length > 0 && (
                <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
                    {childIds.map(childId => {
                        return (
                            <ConnectedTaskRow
                                key={childId}
                                id={childId}
                                rootId={rootId}
                                items={items}
                                onSelectTask={onSelectTask}
                            />
                        )
                    })}
                </SortableContext>
            )}
        </TaskRowUI>
    )
}

interface ConnectedTaskRowProps {
    id: string
    rootId: string
    items: Record<string, string[]>
    onSelectTask?: (taskId: string) => void
}

export function ConnectedTaskRow({ id, rootId, items, onSelectTask }: ConnectedTaskRowProps) {
    const { data: tasks } = useTaskTree(rootId)
    const node = tasks?.find(t => t.id === id)

    if (!node) return null

    const taskNode: TaskNode = {
        ...node,
        children: [],
        depth: 0
    }

    return (
        <SortableTaskRow
            node={taskNode}
            rootId={rootId}
            items={items}
            onSelectTask={onSelectTask}
        />
    )
}
