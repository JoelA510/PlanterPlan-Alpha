import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ProjectSidebar } from '@/features/navigation';
import { ProjectHeader } from '@/features/projects';
import { useTaskQuery, useProjectSelection } from '@/features/tasks';
import { planter } from '@/shared/api/planterClient';
import { Loader2 } from 'lucide-react';
import StatusPieChart from '@/pages/components/StatusPieChart';
import type { TaskRow } from '@/shared/db/app.types';

interface ProjectWithChildren extends TaskRow {
    children?: TaskRow[];
}

const ProjectReport: React.FC = () => {
    const { projectId: urlProjectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    // 1. Core Data Layer
    const {
        tasks,
        joinedProjects,
        hydratedProjects,
        loading,
        error,
        joinedError,
        hasMore,
        isFetchingMore,
        loadMoreProjects,
        refetchProjects,
    } = useTaskQuery() as Record<string, unknown>;

    const fetchProjectDetails = () => refetchProjects();

    // 2. Project Selection Layer (Sidebar sync)
    const { handleSelectProject } = useProjectSelection({
        urlProjectId,
        instanceTasks: ((tasks as TaskRow[]) || []).filter((t: TaskRow) => t.origin === 'instance'),
        templateTasks: ((tasks as TaskRow[]) || []).filter((t: TaskRow) => t.origin === 'template'),
        joinedProjects,
        hydratedProjects,
        fetchProjectDetails,
        loading,
    });

    // Derived lists for sidebar
    const instanceTasks = ((tasks as TaskRow[]) || []).filter((t: TaskRow) => t.origin === 'instance');
    const templateTasks = ((tasks as TaskRow[]) || []).filter((t: TaskRow) => t.origin === 'template');

    const handleOpenInvite = () => { };
    const handleAddChildTask = () => { };

    // Fetch project details specifically for the report
    const [project, setProject] = useState<ProjectWithChildren | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            if (!urlProjectId) return;
            try {
                const { data, error } = await planter.entities.Project.getWithStats(urlProjectId);
                if (data) setProject(data);
                else if (error) console.error('Error fetching project report:', error);
            } catch (err) {
                console.error('Exception fetching project report:', err);
            }
        };
        fetchProject();
    }, [urlProjectId]);

    const sidebar = (
        <ProjectSidebar
            joinedProjects={joinedProjects}
            instanceTasks={instanceTasks}
            templateTasks={templateTasks}
            handleSelectProject={handleSelectProject}
            selectedTaskId={urlProjectId}
            loading={loading}
            error={error}
            joinedError={joinedError}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            onLoadMore={loadMoreProjects}
            handleOpenInvite={handleOpenInvite}
            handleAddChildTask={handleAddChildTask}
            onNewProjectClick={() => navigate('/dashboard')}
            onNewTemplateClick={() => navigate('/dashboard')}
        />
    );

    return (
        <DashboardLayout sidebar={sidebar}>
            <div className="project-view-container w-full h-full flex flex-col">
                {project ? (
                    <>
                        <div className="bg-card px-8 border-b border-border">
                            <ProjectHeader project={project} />
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 px-8 pb-12 max-w-6xl w-full mx-auto overflow-x-visible pt-8">
                            <div className="bg-card rounded-xl shadow-sm border border-border p-8">
                                <h2 className="text-xl font-semibold mb-4 text-card-foreground">Project Performance</h2>
                                {/* Placeholder for actual charts/stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                                        <div className="text-muted-foreground text-sm mb-1">Total Tasks</div>
                                        <div className="text-2xl font-bold text-card-foreground">
                                            {project.children?.length || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                                        <div className="text-muted-foreground text-sm mb-1">Completed</div>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {project.children?.filter((t: TaskRow) => t.is_complete).length || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                                        <div className="text-muted-foreground text-sm mb-1">Pending</div>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                            {project.children?.filter((t: TaskRow) => !t.is_complete).length || 0}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-80 bg-muted/30 rounded-lg p-6 border border-border/50">
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                                        Status Distribution
                                    </h3>
                                    <div className="w-full h-full pb-6">
                                        <StatusPieChart tasks={project.children || []} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ProjectReport;
