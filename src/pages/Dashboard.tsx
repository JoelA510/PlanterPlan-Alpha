import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Hooks
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useCreateProject, useUpdateProjectStatus, useCreateTemplate } from '@/features/projects/hooks/useProjectMutations';

// Components
import CreateProjectModal from '@/features/dashboard/components/CreateProjectModal';
import StatsOverview from '@/features/dashboard/components/StatsOverview';
import ProjectPipelineBoard from '@/features/dashboard/components/ProjectPipelineBoard';
import OnboardingWizard from '@/features/onboarding/components/OnboardingWizard';
import GettingStartedWidget from '@/features/onboarding/components/GettingStartedWidget';
import MobileAgenda from '@/features/mobile/MobileAgenda';
import DashboardLayout from '@/layouts/DashboardLayout';

export default function Dashboard() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { state, data, actions } = useDashboard();

    const createProjectMutation = useCreateProject();
    const updateStatusMutation = useUpdateProjectStatus();
    const createTemplateMutation = useCreateTemplate();

    const handleCreateProject = async (projectData: Parameters<typeof createProjectMutation.mutateAsync>[0]) => {
        try {
            const project = await createProjectMutation.mutateAsync(projectData);
            if (project?.id) {
                navigate(`/project/${project.id}`);
            }
        } catch (error: any) {
            toast.error('Failed to create project', { description: error.message });
        }
    };

    const handleCreateTemplate = async (templateData: Parameters<typeof createTemplateMutation.mutateAsync>[0]) => {
        try {
            await createTemplateMutation.mutateAsync(templateData);
            toast.success('Template created', { description: 'Your new template is ready.' });
        } catch (error: any) {
            toast.error('Failed to create template', { description: error.message });
        }
    };

    const handleStatusChange = async (projectId: string, newStatus: string) => {
        try {
            await updateStatusMutation.mutateAsync({ projectId, status: newStatus });
        } catch (error: any) {
            toast.error('Failed to move project', { description: error.message });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    };

    if (state.isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            </DashboardLayout>
        );
    }

    if (state.isError) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-destructive font-medium">Failed to load projects</p>
                    <p className="text-muted-foreground text-sm">{state.error?.message}</p>
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
                        <Button
                            onClick={() => actions.setShowCreateModal(true)}
                            className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Project
                        </Button>
                    </div>
                </motion.div>

                {/* Stats and Top Widgets */}
                <div className="mb-8 flex-shrink-0">
                    {data.projects.length > 0 && (
                        <GettingStartedWidget
                            project={data.projects[0]}
                            teamMembers={data.teamMembers.filter((m) => m.project_id === data.projects[0].id)}
                            onDismiss={actions.handleDismissWizard}
                        />
                    )}
                    <MobileAgenda tasks={data.filteredTasks} />
                    <StatsOverview projects={data.projects} tasks={data.filteredTasks} teamMembers={data.teamMembers} />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    {data.projects.length === 0 ? (
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
                            <Button onClick={() => actions.setShowCreateModal(true)} className="bg-orange-500 hover:bg-orange-600">
                                <Plus className="w-5 h-5 mr-2" />
                                Create Your First Project
                            </Button>
                        </motion.div>
                    ) : (
                        <ProjectPipelineBoard
                            projects={data.projects}
                            tasks={data.filteredTasks}
                            teamMembers={data.teamMembers}
                            onStatusChange={handleStatusChange}
                        />
                    )}
                </div>

                <CreateProjectModal
                    open={state.showCreateModal}
                    onClose={() => actions.setShowCreateModal(false)}
                    onCreate={handleCreateProject}
                />

                <CreateProjectModal
                    mode="template"
                    open={state.showTemplateModal}
                    onClose={() => actions.setShowTemplateModal(false)}
                    onCreate={handleCreateTemplate}
                />

                <OnboardingWizard
                    open={!state.isLoading && data.projects.length === 0 && !state.wizardDismissed}
                    onCreateProject={handleCreateProject}
                    onDismiss={actions.handleDismissWizard}
                />
            </div>
        </DashboardLayout>
    );
}
