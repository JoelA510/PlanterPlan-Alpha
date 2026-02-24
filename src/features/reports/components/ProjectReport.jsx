import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProjectSidebar from '@/features/navigation/components/ProjectSidebar';
import ProjectHeader from '@/features/projects/components/ProjectHeader';
import { useTaskOperations } from '@/features/tasks/hooks/useTaskOperations';
import { useProjectSelection } from '@/features/tasks/hooks/useProjectSelection';
import { getProjectWithStats } from '@/features/projects/services/projectService';
import { Loader2 } from 'lucide-react';
// PieChart logic moved to StatusPieChart
// Removed hardcoded CHART_COLORS
import StatusPieChart from '@/features/reports/components/StatusPieChart';

const ProjectReport = () => {
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();

  // 1. Core Data Layer
  const {
    tasks,
    joinedProjects,
    loading,
    error,
    joinedError,
    fetchProjectDetails,
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    ...mutationUtils
  } = useTaskOperations();

  // 2. Project Selection Layer (Sidebar sync)
  const { activeProjectId, handleSelectProject } = useProjectSelection({
    urlProjectId,
    instanceTasks: useMemo(() => tasks.filter(t => t.origin === 'instance'), [tasks]),
    templateTasks: useMemo(() => tasks.filter(t => t.origin === 'template'), [tasks]),
    joinedProjects,
    hydratedProjects: mutationUtils.hydratedProjects,
    fetchProjectDetails,
    loading,
  });

  // Derived lists for sidebar
  const instanceTasks = useMemo(() => tasks.filter(t => t.origin === 'instance'), [tasks]);
  const templateTasks = useMemo(() => tasks.filter(t => t.origin === 'template'), [tasks]);

  const handleOpenInvite = () => { };
  const handleAddChildTask = () => { };

  // Fetch project details specifically for the report
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!urlProjectId) return;
      const { data, error } = await getProjectWithStats(urlProjectId);

      if (data) setProject(data);
      else if (error) console.error('Error fetching project report:', error);
    };
    fetchProject();
  }, [urlProjectId]);

  const sidebar = (
    <ProjectSidebar
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      handleSelectProject={handleSelectProject}
      selectedTaskId={urlProjectId} // Use urlProjectId from URL as selected
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
                      {project.children?.filter((t) => t.is_complete).length || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                    <div className="text-muted-foreground text-sm mb-1">Pending</div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {project.children?.filter((t) => !t.is_complete).length || 0}
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
