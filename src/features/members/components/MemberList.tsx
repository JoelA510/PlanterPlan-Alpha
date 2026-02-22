import { useState } from 'react'
import { useProjectMembers, useInviteMember } from '@/features/members/hooks/useMembers'
import { User, UserPlus } from 'lucide-react'

export function MemberList({ projectId }: { projectId: string }) {
    const { data: members, isLoading } = useProjectMembers(projectId)
    const { mutate: invite, isPending } = useInviteMember()
    const [showInvite, setShowInvite] = useState(false)
    const [email, setEmail] = useState('')

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        invite({ projectId, email }, {
            onSuccess: () => {
                setEmail('')
                setShowInvite(false)
                alert("Invitation sent!")
            },
            onError: (err) => {
                alert("Error: " + err.message)
            }
        })
    }

    if (isLoading) return <div className="text-sm text-gray-400">Loading members...</div>

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User size={16} /> Team
                </h3>
                <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                    <UserPlus size={14} /> Invite
                </button>
            </div>

            {showInvite && (
                <form onSubmit={handleInvite} className="mb-4 flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                        {isPending ? '...' : 'Send'}
                    </button>
                </form>
            )}

            <div className="space-y-2">
                {members?.length === 0 && <p className="text-sm text-gray-400 italic">No members yet.</p>}
                {members?.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {member.user_id.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-700 truncate max-w-[150px]">
                                {member.user_id} {/* Ideally join with profiles for email/name */}
                            </span>
                        </div>
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                            {member.role}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
