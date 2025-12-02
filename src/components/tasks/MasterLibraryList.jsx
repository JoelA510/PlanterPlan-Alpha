import React, { useMemo, useState } from 'react';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';

const PAGE_SIZE = 10;

const MasterLibraryList = () => {
  const [page, setPage] = useState(0);
  const { tasks, isLoading, error, hasMore, refresh } = useMasterLibraryTasks({
    page,
    limit: PAGE_SIZE,
  });

  const pageDescription = useMemo(() => {
    if (isLoading) {
      return 'Loading master library tasks…';
    }

    const start = page * PAGE_SIZE + 1;
    const end = start + tasks.length - 1;
    return tasks.length > 0
      ? `Showing tasks ${start} to ${end}`
      : `No tasks found on page ${page + 1}`;
  }, [isLoading, page, tasks.length]);

  const handlePrev = () => {
    if (page === 0 || isLoading) return;
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!hasMore || isLoading) return;
    setPage((prev) => prev + 1);
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Master Library</h2>
          <p className="text-sm text-slate-600" role="status" aria-live="polite">
            {pageDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          aria-label="Refresh master library tasks"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <span>Loading master library tasks…</span>
            </div>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="px-6 py-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-semibold text-red-600">Failed to load tasks</h3>
              <p className="mt-2 text-sm text-red-500">
                {error.message || 'An unexpected error occurred.'}
              </p>
              <button
                type="button"
                onClick={() => refresh()}
                className="mt-4 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                aria-label="Retry loading master library tasks"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && tasks.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-600">
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-slate-800">No tasks yet</h3>
              <p className="mt-2 text-sm">
                Master library tasks will appear here once they’re added.
              </p>
            </div>
          </div>
        ) : null}

        {tasks.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {tasks.map((task) => (
              <li key={task.id} className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-900">{task.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {task.origin || 'library'}
                    </span>
                  </div>
                  {task.description ? (
                    <p className="text-sm text-slate-600">{task.description}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No description provided.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page === 0 || isLoading}
            aria-label="Go to previous page"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page + 1}</span>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasMore || isLoading}
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default MasterLibraryList;
