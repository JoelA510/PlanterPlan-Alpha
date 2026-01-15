import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { planter } from '@shared/api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Badge } from '@shared/ui/badge';
import { useToast } from '@shared/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
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
import DashboardLayout from '@layouts/DashboardLayout';

export default function Team() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');

  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res) => res[0]),
    enabled: !!projectId,
  });

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id) => planter.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      toast({ title: 'Member removed successfully' });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => planter.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      setShowAddModal(false);
      toast({ title: 'Member added successfully' });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout selectedTaskId={projectId}>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to={createPageUrl(`Project?id=${projectId}`)}>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Project Team</h1>
                  {project && <p className="text-slate-600 mt-1">{project.name}</p>}
                </div>
              </div>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add Member
              </Button>
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
                  <Card className="p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-slate-50">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMemberMutation.mutate(member.id)}
                          >
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-1">{member.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-0">
                        {member.role || 'Member'}
                      </Badge>
                      {member.is_lead && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                          Lead
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                      {member.email && (
                        <div className="flex items-center text-sm text-slate-500">
                          <Mail className="w-4 h-4 mr-2" />
                          {member.email}
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center text-sm text-slate-500">
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
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Build your team</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  Add members to collaborate on this project and track their progress.
                </p>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add First Member
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new member to your project team.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addMemberMutation.mutate({
                  project_id: projectId,
                  name: formData.get('name'),
                  email: formData.get('email'),
                  role: formData.get('role'),
                });
              }}
              className="space-y-4 pt-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <Input name="name" placeholder="Enter name" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <Input name="email" type="email" placeholder="Enter email" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <Input name="role" placeholder="e.g. Lead, Coordinator, Volunteer" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
