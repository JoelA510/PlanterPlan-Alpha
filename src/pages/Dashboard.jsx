import { useState } from 'react';
import { planter } from '@shared/api/planterClient';
import { createProjectWithDefaults, updateProjectStatus } from '@features/projects/services/projectService'; // Service import
import { useAuth } from '@app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/button';
import { Plus, FolderKanban, Loader2, LayoutGrid, Kanban } from 'lucide-react';
import { motion } from 'framer-motion';

import ProjectCard from '@features/dashboard/components/ProjectCard';
import CreateProjectModal from '@features/dashboard/components/CreateProjectModal';
import StatsOverview from '@features/dashboard/components/StatsOverview';
import ProjectPipelineBoard from '@features/dashboard/components/ProjectPipelineBoard';
import OnboardingWizard from '@features/onboarding/components/OnboardingWizard';
import GettingStartedWidget from '@features/onboarding/components/GettingStartedWidget';
import MobileAgenda from '@features/mobile/MobileAgenda';

import DashboardLayout from '@layouts/DashboardLayout';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'pipeline'
  const [wizardDismissed, setWizardDismissed] = useState(false); // Enable dismissing the wizard
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => planter.entities.Project.list('-created_date'),
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => planter.entities.Task.list(),
    enabled: !!user,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => planter.entities.TeamMember.list(),
    enabled: !!user,
  });

  const createProjectMutation = useMutation({
    mutationFn: createProjectWithDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }); // Sync Sidebar
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }) => updateProjectStatus(projectId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }); // Sync Sidebar
    },
    onError: (error) => {
      console.error('Failed to update project status:', error);
      // Optional: Add toast notification here
    }
  });

  const handleCreateProject = async (projectData) => {
    try {
      await createProjectMutation.mutateAsync({ ...projectData, creator: user?.id });
    } catch (error) {
      console.error('Create project failed:', error);
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ projectId, status: newStatus });
    } catch (error) {
      console.error('Status move failed:', error);
      // If we had optimistic UI, we'd roll back here.
      // Since we rely on refetch, we might just need to ensure the board resets if error.
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  };

  if (loadingProjects || authLoading) {
    console.log('[Dashboard] Loading State:', { loadingProjects, authLoading, user: !!user });
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 flex-shrink-0"
        >
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your church planting projects</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-card border border-border rounded-lg p-1 flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-muted text-card-foreground' : 'text-muted-foreground hover:text-card-foreground'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'pipeline' ? 'bg-muted text-card-foreground' : 'text-muted-foreground hover:text-card-foreground'}`}
                title="Pipeline View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        {viewMode === 'grid' && (
          <div className="mb-8 flex-shrink-0">
            {projects.length > 0 && (
              <GettingStartedWidget
                project={projects[0]} // Primary/First project
                teamMembers={teamMembers.filter(m => m.project_id === projects[0].id)}
                onDismiss={() => { }}
              />
            )}
            <MobileAgenda tasks={tasks} />
            <StatsOverview projects={projects} tasks={tasks} teamMembers={teamMembers} />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FolderKanban className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start your church planting journey by creating your first project
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </Button>
            </motion.div>
          ) : viewMode === 'pipeline' ? (
            <ProjectPipelineBoard
              projects={projects}
              tasks={tasks}
              teamMembers={teamMembers}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <>
              {/* Primary Projects */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-card-foreground mb-4">Primary Projects</h2>
                <motion.div
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {projects
                    .filter((p) => p.project_type === 'primary' || !p.project_type)
                    .map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        variants={item}
                      >
                        <ProjectCard
                          project={project}
                          tasks={tasks.filter((t) => t.project_id === project.id)}
                          teamMembers={teamMembers.filter((m) => m.project_id === project.id)}
                        />
                      </motion.div>
                    ))}
                </motion.div>
              </div>

              {/* Secondary Projects */}
              {projects.filter((p) => p.project_type === 'secondary').length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Secondary Projects</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects
                      .filter((p) => p.project_type === 'secondary')
                      .map((project, index) => (
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
                </div>
              )}
            </>
          )}
        </div>

        <CreateProjectModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />

        <OnboardingWizard
          open={!loadingProjects && projects.length === 0 && !wizardDismissed}
          onCreateProject={handleCreateProject}
          onDismiss={() => setWizardDismissed(true)}
        />
      </div>
    </DashboardLayout>
  );
}
