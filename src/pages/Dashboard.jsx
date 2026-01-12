import React, { useState } from 'react';
import { planter } from 'api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import ProjectCard from '@/components/dashboard/ProjectCard';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import StatsOverview from '@/components/dashboard/StatsOverview';

import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';

import { useAuth } from '@app/contexts/AuthContext';
import { createProjectWithDefaults } from '@features/projects/services/projectService';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => planter.entities.Project.list('-created_date'),
    enabled: !authLoading && !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => planter.entities.Task.list(),
    enabled: !authLoading && !!user,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => planter.entities.TeamMember.list(),
    enabled: !authLoading && !!user,
  });

  const createProjectMutation = useMutation({
    mutationFn: createProjectWithDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleCreateProject = async (projectData) => {
    await createProjectMutation.mutateAsync(projectData);
  };

  const dashboardContent = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your church planting projects</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="mb-8">
        <StatsOverview projects={projects} tasks={tasks} teamMembers={teamMembers} />
      </div>

      {/* Projects */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Projects</h2>
      </div>

      {loadingProjects ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FolderKanban className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
          <p className="text-slate-600 mb-6 max-w-sm mx-auto">
            Start your church planting journey by creating your first project
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-500 hover:bg-brand-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Project
          </Button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ProjectCard
                project={project}
                tasks={tasks.filter((t) => t.project_id === project.id)}
                teamMembers={teamMembers.filter((m) => m.project_id === project.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );

  return (
    <DashboardLayout
      sidebar={
        <SideNav
          joinedProjects={[]}
          instanceTasks={projects.map((p) => ({ ...p, title: p.name }))}
          templateTasks={[]}
          handleSelectProject={(p) => navigate(`/project/${p.id}`)}
          onNewProjectClick={() => setShowCreateModal(true)}
          onNewTemplateClick={() => { }}
          loading={loadingProjects}
        />
      }
    >
      {dashboardContent}
    </DashboardLayout>
  );
}
