import React, { useEffect } from 'react';
import { Breadcrumbs } from '../atoms/Breadcrumbs';

const ProjectHeader = ({ project }) => {
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
          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border
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

          {/* Simple Member Count or Avatars if available */}
          {/* Assuming project.members is populated or we use a placeholder */}
          <div className="flex -space-x-2">
            <div
              className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600"
              title="Project Owner"
            >
              OWN
            </div>
            {/* Placeholder for other members */}
            <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-400">
              +
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
