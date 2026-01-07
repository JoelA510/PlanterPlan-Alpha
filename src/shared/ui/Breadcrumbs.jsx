import React from 'react';
import { Link } from 'react-router-dom';

export const Breadcrumbs = ({ project, task }) => {
  return (
    <nav className="text-sm text-slate-500 mb-4 flex items-center space-x-2">
      <Link to="/" className="hover:text-blue-600 transition-colors">
        Home
      </Link>
      <span className="text-slate-300">/</span>
      <span className="hover:text-blue-600 transition-colors cursor-pointer">Projects</span>

      {project && (
        <>
          <span className="text-slate-300">/</span>
          <span
            className={`font-medium ${!task ? 'text-slate-900' : 'hover:text-blue-600 transition-colors cursor-pointer'}`}
          >
            {project.title}
          </span>
        </>
      )}

      {task && (
        <>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900 truncate max-w-[200px]">{task.title}</span>
        </>
      )}
    </nav>
  );
};
