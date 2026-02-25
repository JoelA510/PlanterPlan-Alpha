import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
    ArrowLeft,
    Mail,
    UserPlus,
    Loader2,
    Users,
    MoreVertical,
    Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeam } from '@/features/people/hooks/useTeam';

export default function Team() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');

    const [showAddModal, setShowAddModal] = useState(false);

    const { project, teamMembers, isLoading, mutations } = useTeam(projectId);

    if (isLoading) {
        return (
            <>
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-background">
                <div className="bg-card border-b border-border">
                    <div className="max-w-5xl mx-auto px-4 py-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {projectId && (
                                    <Link to={createPageUrl(`Project?id=${projectId}`)}>
                                        <Button variant="ghost" size="icon" className="rounded-full">
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                )}
                                <div>
                                    <h1 className="text-3xl font-bold text-foreground">{projectId ? 'Project Team' : 'All Team Members'}</h1>
                                    {project && <p className="text-muted-foreground mt-1">{project.title}</p>}
                                    {!projectId && <p className="text-muted-foreground mt-1">People collaborating across your projects</p>}
                                </div>
                            </div>
                            {projectId && (
                                <Button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20"
                                >
                                    <UserPlus className="w-5 h-5 mr-2" />
                                    Add Member
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {teamMembers.map((member, index) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center border-2 border-background shadow-sm ring-2 ring-muted">
                                                <Users className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/40"
                                                        onClick={() => mutations.deleteMember.mutate(member.id)}
                                                    >
                                                        Remove from team
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <h3 className="text-lg font-bold text-foreground mb-1">{member.name || 'Unknown Name'}</h3>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300">
                                                {member.role || 'Member'}
                                            </span>
                                            {member.is_lead && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                                    Lead
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-4 pt-4 border-t border-border">
                                            {member.email && (
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <Mail className="w-4 h-4 mr-2" />
                                                    {member.email}
                                                </div>
                                            )}
                                            {member.phone && (
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    {member.phone}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {teamMembers.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Users className="w-10 h-10 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Build your team</h3>
                                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                                    {projectId
                                        ? "Add members to collaborate on this project."
                                        : "No team members found across your projects."}
                                </p>
                                {projectId && (
                                    <Button
                                        onClick={() => setShowAddModal(true)}
                                        className="bg-brand-600 hover:bg-brand-700 text-white"
                                    >
                                        <UserPlus className="w-5 h-5 mr-2" />
                                        Add First Member
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogContent className="bg-card text-card-foreground border-border">
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>
                                Fill in the details below to add a new member.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                mutations.addMember.mutate({
                                    project_id: projectId,
                                    name: formData.get('name') as string,
                                    email: formData.get('email') as string,
                                    role: formData.get('role') as string,
                                });
                                setShowAddModal(false);
                            }}
                            className="space-y-4 pt-4"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Full Name</label>
                                <Input name="name" placeholder="Enter name" required className="bg-background border-input" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Email Address</label>
                                <Input name="email" type="email" placeholder="Enter email" className="bg-background border-input" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Role</label>
                                <Input name="role" placeholder="e.g. Lead, Coordinator, Volunteer" className="bg-background border-input" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-brand-600 hover:bg-brand-700 text-white"
                                    disabled={mutations.addMember.isPending}
                                >
                                    {mutations.addMember.isPending ? 'Adding...' : 'Add Member'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
