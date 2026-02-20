import { useState } from 'react'
import { useTaskResources, useAddResource, useDeleteResource } from '@/features/resources/hooks/useResources'
import { Link2, Trash2, FileText, Plus } from 'lucide-react'

export function ResourceList({ taskId }: { taskId: string }) {
    const { data: resources, isLoading } = useTaskResources(taskId)
    const { mutate: addResource, isPending } = useAddResource()
    const { mutate: deleteResource } = useDeleteResource()

    const [isAdding, setIsAdding] = useState(false)
    const [url, setUrl] = useState('')
    const [label, setLabel] = useState('')

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        addResource([{
            task_id: taskId,
            resource_type: 'url', // Default for now
            resource_url: url,
            resource_text: label || url
        }], {
            onSuccess: () => {
                setIsAdding(false)
                setUrl('')
                setLabel('')
            }
        })
    }

    const handleDelete = (id: string) => {
        if (confirm("Remove resource?")) {
            deleteResource(id)
        }
    }

    if (isLoading) return <div className="text-sm text-gray-400">Loading resources...</div>

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Link2 size={16} /> Resources
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                    <Plus size={14} /> Add
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-4 space-y-2">
                    <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                    />
                    <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-2 py-1 text-sm border rounded"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                        {isPending ? 'Saving...' : 'Save Link'}
                    </button>
                </form>
            )}

            <div className="space-y-2">
                {resources?.length === 0 && <p className="text-sm text-gray-400 italic">No resources yet.</p>}
                {resources?.map((resource: { id: string; resource_url?: string; resource_text?: string }) => (
                    <div key={resource.id} className="flex items-center justify-between text-sm group">
                        <a
                            href={resource.resource_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline truncate"
                        >
                            <FileText size={14} className="text-gray-400" />
                            <span className="truncate max-w-[150px]">{resource.resource_text || resource.resource_url}</span>
                        </a>
                        <button
                            onClick={() => handleDelete(resource.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
