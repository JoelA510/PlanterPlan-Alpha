import { useEffect, useState } from 'react'
import { useTaskDetails } from '@/features/tasks/hooks/useTaskDetails'
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations'
import { X, Save } from 'lucide-react'

interface TaskDetailsProps {
    taskId: string
    onClose: () => void
}

export function TaskDetails({ taskId, onClose }: TaskDetailsProps) {
    const { data: task, isLoading, error } = useTaskDetails(taskId)
    const { mutate: updateTask } = useUpdateTask()

    // Local state for editing form
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isDirty, setIsDirty] = useState(false)

    // Sync local state when task loads or changes
    useEffect(() => {
        if (task) {
            // eslint-disable-next-line
            setTitle(task.title)
            setDescription(task.description || '')
            setIsDirty(false)
        }
    }, [task])

    const handleSave = () => {
        if (!task) return
        updateTask({
            id: task.id,
            title,
            description
        })
        setIsDirty(false)
    }

    if (isLoading) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50">Loading details...</div>
    if (error) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50 text-red-500">Error loading task</div>
    if (!task) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50">Task not found</div>

    return (
        <div className="h-full bg-white border-l border-gray-200 flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task Details</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Status Badge */}
                <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.is_complete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {task.status || 'todo'}
                    </span>
                </div>

                {/* Title Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => { setTitle(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        rows={6}
                        value={description}
                        onChange={e => { setDescription(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Add more details..."
                    />
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                    <p>Created: {new Date(task.created_at || '').toLocaleDateString()}</p>
                    <p>ID: {task.id}</p>
                </div>
            </div>

            {/* Footer / Actions */}
            {isDirty && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Save size={16} className="mr-2" />
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    )
}
