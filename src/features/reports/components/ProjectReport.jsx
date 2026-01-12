import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import ProjectHeader from '@features/projects/components/ProjectHeader';
import { useTaskBoard } from '@features/tasks/hooks/useTaskBoard';
import { getProjectWithStats } from '@features/projects/services/projectService';
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TASK_STATUS } from '@app/constants/index';

// Semantic chart colors (aligned with Rule 30 Design Standards)
const CHART_COLORS = {
  [TASK_STATUS.TODO]: '#94a3b8',   // slate-400
  [TASK_STATUS.IN_PROGRESS]: '#f59e0b',   // amber-500
  [TASK_STATUS.BLOCKED]: '#f43f5e',    // rose-500
  [TASK_STATUS.COMPLETED]: '#10b981', // emerald-500
};

const ProjectReport = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Reuse the main hook to get sidebar data
  const {
    joinedProjects,
    instanceTasks,
    templateTasks,
    loading,
    error,
    joinedError,
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    handleOpenInvite,
    handleAddChildTask,
  } = useTaskBoard();

  // Fetch project details specifically for the report
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      const { data, error } = await getProjectWithStats(projectId);

      if (data) setProject(data);
      else if (error) console.error('Error fetching project report:', error);
    };
    fetchProject();
  }, [projectId]);

  // Handle sidebar navigation
  const onSelectProject = (proj) => {
    navigate(`/project/${proj.id}`);
  };

  const sidebar = (
    <SideNav
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      handleSelectProject={onSelectProject}
      selectedTaskId={projectId} // Use projectId from URL as selected
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
            <div className="bg-white px-8">
              <ProjectHeader project={project} />
            </div>

            {/* Report Content */}
            <div className="flex-1 px-8 pb-12 max-w-6xl w-full mx-auto overflow-x-visible pt-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold mb-4 text-slate-800">Project Performance</h2>
                {/* Placeholder for actual charts/stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1">Total Tasks</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {project.children?.length || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1">Completed</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {project.children?.filter((t) => t.is_complete).length || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1">Pending</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {project.children?.filter((t) => !t.is_complete).length || 0}
                    </div>
                  </div>
                </div>

                <div className="h-[350px] bg-slate-50 rounded-lg p-6 border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Status Distribution</h3>
                  <div className="w-full h-full pb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'To Do', count: project.children?.filter(t => t.status === TASK_STATUS.TODO || !t.status).length || 0, fill: CHART_COLORS[TASK_STATUS.TODO] },
                            { name: 'In Progress', count: project.children?.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length || 0, fill: CHART_COLORS[TASK_STATUS.IN_PROGRESS] },
                            { name: 'Blocked', count: project.children?.filter(t => t.status === TASK_STATUS.BLOCKED).length || 0, fill: CHART_COLORS[TASK_STATUS.BLOCKED] },
                            { name: 'Completed', count: project.children?.filter(t => t.status === TASK_STATUS.COMPLETED).length || 0, fill: CHART_COLORS[TASK_STATUS.COMPLETED] },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {[
                            { fill: CHART_COLORS[TASK_STATUS.TODO] },
                            { fill: CHART_COLORS[TASK_STATUS.IN_PROGRESS] },
                            { fill: CHART_COLORS[TASK_STATUS.BLOCKED] },
                            { fill: CHART_COLORS[TASK_STATUS.COMPLETED] },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, name]}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
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
