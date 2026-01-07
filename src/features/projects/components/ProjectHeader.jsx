import React, { useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ProjectHeader = ({ project, onInviteMember }) => {
  const location = useLocation();
  const isReportView = location.pathname.includes('/report/');

  // Update document title
  useEffect(() => {
    if (project?.title) {
      document.title = `${project.title} | PlanterPlan`;
    }
    return () => {
      document.title = 'PlanterPlan';
    };
  }, [project?.title]);

  // Calculate Progress Stats
  const stats = useMemo(() => {
    if (!project?.children) return { total: 0, completed: 0, percent: 0 };
    const total = project.children.length;
    const completed = project.children.filter((t) => t.is_complete).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  }, [project]);

  if (!project) return null;

  return (
    <div className="bg-white border-b border-slate-200 -mx-8 -mt-6 mb-8 px-8 pt-6 shadow-sm">
      {/* 1. Breadcrumbs & Meta */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          {/* Ensure breadcrumbs work or provide fallback */}
          <div className="mb-2">
            <Link
              to="/dashboard"
              className="text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-700">{project.title}</span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              {project.title}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                project.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {project.status || 'Active'}
            </span>
          </div>
          <p className="text-slate-500 mt-2 text-base max-w-3xl leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* 2. Actions (Right Side) */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-6">
          <div className="flex items-center -space-x-3">
            {/* Owner Avatar */}
            <div
              className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm ring-1 ring-slate-100"
              title="Project Owner"
            >
              {(project.owner_id || 'O').slice(0, 2).toUpperCase()}
            </div>
            {/* Invite Button (Small Circle or Action) */}
            {onInviteMember && (
              <button
                onClick={onInviteMember}
                className="h-9 w-9 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center transition-all z-10"
                title="Invite Member"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>

          {onInviteMember && (
            <button
              onClick={onInviteMember}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              Share Project
            </button>
          )}
        </div>
      </div>

      {/* 3. Progress Bar */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>{stats.percent}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Navigation Tabs (FIXED) */}
      <div className="flex space-x-8">
        <Link
          to={`/project/${project.id}`}
          className={`pb-3 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
            !isReportView
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Tasks
        </Link>

        <Link
          to={`/report/${project.id}`}
          className={`pb-3 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
            isReportView
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Reports
        </Link>
      </div>
    </div>
  );
};

export default ProjectHeader;
