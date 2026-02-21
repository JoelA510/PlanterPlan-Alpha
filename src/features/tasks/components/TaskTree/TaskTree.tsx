import { useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskNode, buildTaskTree } from '@/shared/lib/tree-helpers'
import { useTaskTreeDnD } from '@/features/tasks/hooks/useTaskTreeDnD'
import { SortableTaskRow } from './TaskRow'
import { Database } from '@/shared/db/types'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskTreeProps {
    projectId: string
    tasks: Task[] | null | undefined
    onSelectTask?: (taskId: string) => void
}

export function TaskTree({ projectId, tasks, onSelectTask }: TaskTreeProps) {
    const tree = useMemo(() => {
        if (!tasks || !projectId) return []
        return buildTaskTree(tasks, projectId)
    }, [tasks, projectId])

    // O(1) Lookup optimization: Flatten the tree into a Map
    const nodesMap = useMemo(() => {
        const map = new Map<string, TaskNode>()
        const flatten = (nodes: TaskNode[]) => {
            for (const node of nodes) {
                map.set(node.id, node)
                if (node.children) flatten(node.children)
            }
        }
        flatten(tree)
        return map
    }, [tree])

    const projectNode = nodesMap.get(projectId)
    const initialItems = useMemo(() => projectNode ? [projectNode] : [], [projectNode])

    const {
        items,
        activeId,
        handleDragStart,
        handleDragOver,
        handleDragEnd
    } = useTaskTreeDnD(initialItems)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    if (!projectNode) {
        return <div className="p-8">Project root not found in data.</div>
    }

    const rootChildIds = items[projectId] || []

    return (
        <div className="space-y-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={rootChildIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[50px] p-2 bg-gray-50/50 rounded-lg border border-transparent hover:border-blue-100/50 transition-colors">
                        {rootChildIds.map(id => {
                            const treeNode = nodesMap.get(id)
                            if (!treeNode) return null

                            // Pass onSelectTask to top-level rows
                            return (
                                <SortableTaskRow
                                    key={id}
                                    node={treeNode}
                                    rootId={projectId}
                                    items={items}
                                    onSelectTask={onSelectTask}
                                />
                            )
                        })}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white border border-blue-500 shadow-xl rounded-lg p-4 opacity-90 rotate-2 cursor-grabbing">
                            Moving Task...
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
