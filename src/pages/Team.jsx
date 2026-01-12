import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import { planter } from '@/api/planterClient'; // UPDATED
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Mail,
  Trash2,
  UserPlus,
  Loader2,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Team() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');
  // NOTE: Team page apparently uses query param project=... in the merge version.
  // App.jsx path is /team
  // So /team?project=123 is valid if this is the pattern.
  // Link in ProjectHeader: createPageUrl(`Team?project=${project.id}`)
  // createPageUrl returns path? 
  // If use createPageUrl(`team?project=`) -> `/team?project=`.
  // So using window.location.search is fine here as it's not a path param.

  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: '' });

  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId
  });

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => planter.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => planter.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: '' });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id) => planter.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
    }
  });

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    await addMemberMutation.mutateAsync({
      ...formData,
      project_id: projectId
    });
    setLoading(false);
  };

  const getTaskCount = (email) => {
    return tasks.filter(t => t.assigned_to === email).length;
  };

  const getCompletedTaskCount = (email) => {
    return tasks.filter(t => t.assigned_to === email && t.status === 'completed').length;
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl(`project/${projectId}`)}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
              {project && (
                <p className="text-slate-600">{project.name}</p>
              )}
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {teamMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No team members yet</h3>
            <p className="text-slate-600 mb-6">
              Add team members to delegate tasks and collaborate
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Member
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-5 border border-slate-200 bg-white hover:shadow-xl hover:border-orange-200 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900">{member.name}</h3>
                        {member.role && (
                          <p className="text-sm text-slate-500">{member.role}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteMemberMutation.mutate(member.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-slate-900">{getTaskCount(member.email)}</span>
                      <span className="text-slate-500 ml-1">assigned</span>
                    </div>
                    <div>
                      <span className="font-semibold text-green-600">{getCompletedTaskCount(member.email)}</span>
                      <span className="text-slate-500 ml-1">completed</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="e.g., Worship Leader, Administrator"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Member'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
