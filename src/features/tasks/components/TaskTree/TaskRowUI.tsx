import { GripVertical } from 'lucide-react'
import { TaskNode } from '@/shared/lib/tree-helpers'
import { TaskActions } from './TaskActions'

import { DraggableAttributes } from '@dnd-kit/core'
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'

interface TaskRowUIProps {
    node: TaskNode
    isDragging: boolean
    dragAttributes: DraggableAttributes
    dragListeners: SyntheticListenerMap | undefined
    setNodeRef: (node: HTMLElement | null) => void
    style: React.CSSProperties
    onToggle: () => void
    onDelete: () => void
    onAddSubtask: () => void
    onSelect?: () => void
    children?: React.ReactNode
}

export function TaskRowUI({
    node,
    isDragging,
    dragAttributes,
    dragListeners,
    setNodeRef,
    style,
    onToggle,
    onDelete,
    onAddSubtask,
    onSelect,
    children
}: TaskRowUIProps) {
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border border-gray-200 rounded-lg p-4 transition-all group hover:border-gray-300 ${isDragging ? 'opacity-30' : ''}`}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 items-start flex-1">
                    <button
                        {...dragAttributes}
                        {...dragListeners}
                        className="mt-1 cursor-grab text-gray-300 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded"
                        aria-label="Drag handle"
                    >
                        <GripVertical size={16} />
                    </button>

                    <TaskActions
                        node={node}
                        onToggle={onToggle}
                        onAddSubtask={onAddSubtask}
                        onDelete={onDelete}
                        onSelect={onSelect}
                    />

                </div>
            </div>

            {children && (
                <div className="ml-10 mt-3 pl-4 border-l-2 border-gray-100 space-y-3 min-h-[10px]">
                    {children}
                </div>
            )}
        </div>
    )
}
