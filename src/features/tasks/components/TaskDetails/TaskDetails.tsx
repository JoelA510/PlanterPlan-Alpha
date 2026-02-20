import { useEffect, useState } from 'react'
import { useTaskDetails } from '@/features/tasks/hooks/useTaskDetails'
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations'
import { X, Save, Mail, Lock, Crown } from 'lucide-react'
import TaskResources from '../../TaskResources'
import { formatDisplayDate } from '@/shared/lib/date-engine'

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
    const [purpose, setPurpose] = useState('')
    const [actions, setActions] = useState('')
    const [notes, setNotes] = useState('')
    const [isDirty, setIsDirty] = useState(false)

    // Sync local state when task loads or changes
    useEffect(() => {
        if (task) {
            // eslint-disable-next-line
            setTitle(task.title)
            setDescription(task.description || '')
            setPurpose(task.purpose || '')
            setActions(task.actions || '')
            setNotes(task.notes || '')
            setIsDirty(false)
        }
    }, [task])

    const handleSave = () => {
        if (!task) return
        updateTask({
            id: task.id,
            title,
            description,
            purpose,
            actions,
            notes
        })
        setIsDirty(false)
    }

    if (isLoading) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50 dark:bg-slate-900 border-border">Loading details...</div>
    if (error) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50 text-red-500 dark:bg-slate-900 border-border">Error loading task</div>
    if (!task) return <div className="p-4 border-l border-gray-200 h-full bg-gray-50 dark:bg-slate-900 border-border">Task not found</div>

    return (
        <div className="h-full bg-white border-l border-gray-200 flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task Details</span>
                    {task.is_premium && <Crown size={14} className="text-amber-500" aria-label="Premium Task" />}
                    {task.is_locked && <Lock size={14} className="text-gray-400" aria-label="Locked Task" />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.location.href = `mailto:?subject=Task: ${encodeURIComponent(task.title)}&body=${encodeURIComponent(task.description || '')}`}
                        className="text-gray-400 hover:text-brand-600 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Email Task"
                    >
                        <Mail size={18} />
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.is_complete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {task.status || 'todo'}
                    </span>
                    {task.is_premium && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Premium
                        </span>
                    )}
                </div>

                {/* Title Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => { setTitle(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-gray-300 dark:border-border dark:bg-input dark:text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">Overview</label>
                    <textarea
                        rows={4}
                        value={description}
                        onChange={e => { setDescription(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-gray-300 dark:border-border dark:bg-input dark:text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Add more details..."
                    />
                </div>

                {/* Purpose - The Why */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">
                        Purpose (The Why)
                    </label>
                    <textarea
                        rows={2}
                        value={purpose}
                        onChange={e => { setPurpose(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 text-slate-700 dark:text-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border leading-relaxed"
                        placeholder="Why are we doing this?"
                    />
                </div>

                {/* Actions - The What */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">
                        Action Steps (The What)
                    </label>
                    <textarea
                        rows={3}
                        value={actions}
                        onChange={e => { setActions(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 text-slate-700 dark:text-green-200 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border leading-relaxed whitespace-pre-wrap"
                        placeholder="Action items needed..."
                    />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">Notes</label>
                    <textarea
                        rows={2}
                        value={notes}
                        onChange={e => { setNotes(e.target.value); setIsDirty(true) }}
                        className="block w-full rounded-md border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-slate-700 dark:text-amber-200 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border italic"
                        placeholder="Additional context..."
                    />
                </div>

                <div className="h-px bg-slate-100 dark:bg-border my-6"></div>

                {/* Dates Grid */}
                <div className="detail-section mb-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 uppercase tracking-wide">Schedule</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                Start Date
                            </span>
                            <span className="text-sm font-bold text-card-foreground tracking-tight">
                                {formatDisplayDate(task.start_date)}
                            </span>
                        </div>
                        <div className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                Due Date
                            </span>
                            <span className="text-sm font-bold text-card-foreground tracking-tight">
                                {formatDisplayDate(task.due_date)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resources Section */}
                <div className="pt-6 border-t border-gray-100 dark:border-border">
                    <TaskResources taskId={task.id} primaryResourceId={task.primary_resource_id} />
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-100 dark:border-border text-xs text-gray-400 dark:text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                        <span>Created</span>
                        <span className="font-mono">{formatDisplayDate(task.created_at)}</span>
                    </div>
                    {task.updated_at && (
                        <div className="flex justify-between">
                            <span>Updated</span>
                            <span className="font-mono">{formatDisplayDate(task.updated_at)}</span>
                        </div>
                    )}
                    <div className="flex justify-between mt-2">
                        <span>ID</span>
                        <span className="font-mono opacity-50">{task.id}</span>
                    </div>
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
