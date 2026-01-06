import React, { useEffect } from 'react';
import { Breadcrumbs } from '../atoms/Breadcrumbs';

const ProjectHeader = ({ project, onInviteMember }) => {
  // Update document title for SEO/UX
  useEffect(() => {
    if (project?.title) {
      document.title = `${project.title} | PlanterPlan`;
    }
    return () => {
      document.title = 'PlanterPlan';
    };
  }, [project?.title]);

  if (!project) return null;

  return (
    <div className="mb-6">
      <Breadcrumbs project={project} />

      <div className="flex justify-between items-start border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
          {project.description && (
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-medium border
            ${
              project.status === 'active'
                ? 'bg-green-50 text-green-700 border-green-200'
                : project.status === 'archived'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {project.status || 'Active'}
          </span>

          <div className="flex -space-x-2 mr-2">
            <div
              className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600"
              title="Project Owner"
            >
              OWN
            </div>
          </div>

          {onInviteMember && (
            <button
              onClick={onInviteMember}
              className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full px-4 py-1.5 transition-colors border border-blue-200"
              title="Invite Member"
            >
              <span className="mr-1 text-lg font-bold leading-none">+</span> Invite
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 mb-6">
        <button className="pb-3 px-1 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">
          Tasks
        </button>
        <a
          href={`/report/${project.id}`}
          className="pb-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium text-sm transition-colors"
        >
          Reports
        </a>
      </div>
    </div>
  );
};

export default ProjectHeader;
