import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { planter } from '@shared/api/planterClient';
import { createProjectWithDefaults, updateProjectStatus } from '@features/projects/services/projectService'; // Service import
import { useAuth } from '@app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@shared/ui/use-toast';
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



const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'pipeline'
  const [wizardDismissed, setWizardDismissed] = useState(() => {
    return localStorage.getItem('gettingStartedDismissed') === 'true';
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projects = [], isLoading: loadingProjects, isError, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => planter.entities.Project.list('-created_date'),
    enabled: !!user,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => planter.entities.Task.listByCreator(user?.id),
    enabled: !!user,
  });

  // [PERF] Memoize filtered tasks to prevent re-computation on every render
  const activeProjects = useMemo(() => {
    return Array.isArray(projects) ? projects.filter(p => p.status === 'active') : [];
  }, [projects]);

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(allTasks)) return [];

    // 1. Filter by Project (if selected)
    let tasks = selectedProjectId
      ? allTasks.filter(t => t.project_id === selectedProjectId)
      : allTasks;

    // 2. Filter by Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return tasks;
  }, [allTasks, selectedProjectId, searchQuery]);

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
    onError: (error) => {
      toast({ title: 'Failed to create project', description: error.message, variant: 'destructive' });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }) => updateProjectStatus(projectId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }); // Sync Sidebar
    },
    onError: (error) => {
      toast({
        title: 'Failed to move project',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleCreateProject = async (projectData) => {
    try {
      const project = await createProjectMutation.mutateAsync({ ...projectData, creator: user?.id });
      // Redirect to the new project board
      if (project?.id) {
        navigate(`/project/${project.id}`);
      }
    } catch (error) {
      // Error handled by onError in useMutation, no need for console.error here
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ projectId, status: newStatus });
    } catch (error) {
      // Error handled by onError in useMutation, no need for console.error here
      // If we had optimistic UI, we'd roll back here.
      // Since we rely on refetch, we might just need to ensure the board resets if error.
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  };

  if (loadingProjects || authLoading) {

    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-destructive font-medium">Failed to load projects</p>
          <p className="text-muted-foreground text-sm">{error?.message}</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
            Retry
          </Button>
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
                onDismiss={() => {
                  setWizardDismissed(true);
                  // Optional: Persist to localStorage if we want it to survive reloads
                  // localStorage.setItem('gettingStartedDismissed', 'true'); 
                  // For now, session-based dismissal (until refresh) is acceptable, 
                  // but let's persist it to be robust as requested.
                  localStorage.setItem('gettingStartedDismissed', 'true');
                }}
              />
            )}
            <MobileAgenda tasks={filteredTasks} />
            <StatsOverview projects={projects} tasks={filteredTasks} teamMembers={teamMembers} />
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
              tasks={filteredTasks}
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
                          tasks={filteredTasks.filter((t) => t.project_id === project.id)}
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
                            tasks={filteredTasks.filter((t) => t.project_id === project.id)}
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
