import { Trash2, Plus, CheckCircle, Circle } from 'lucide-react'
import { TaskNode } from '@/shared/lib/tree-helpers'

interface TaskActionsProps {
    node: TaskNode
    onToggle: () => void
    onAddSubtask: () => void
    onDelete: () => void
    onSelect?: () => void
}

export function TaskActions({ node, onToggle, onAddSubtask, onDelete, onSelect }: TaskActionsProps) {
    return (
        <>
            <button
                onClick={onToggle}
                className={`mt-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded-full ${node.is_complete ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'}`}
                aria-label={node.is_complete ? "Mark as incomplete" : "Mark as complete"}
            >
                {node.is_complete ? <CheckCircle size={20} /> : <Circle size={20} />}
            </button>

            <div className="flex-1 min-w-0">
                <div
                    onClick={onSelect}
                    className={`text-base font-medium truncate cursor-pointer hover:text-blue-600 transition-colors ${node.is_complete ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                >
                    {node.title}
                </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 ml-auto">
                <button
                    onClick={onAddSubtask}
                    className="p-1.5 text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label="Add subtask"
                >
                    <Plus size={16} />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    aria-label="Delete task"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </>
    )
}
