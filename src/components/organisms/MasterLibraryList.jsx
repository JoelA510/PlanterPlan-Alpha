// src/components/organisms/MasterLibraryList.jsx
import React, { useMemo, useState } from 'react';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';
import { useTreeState } from '../../hooks/useTreeState';
import TaskItem from '../molecules/TaskItem';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

const PAGE_SIZE = 50;

const MasterLibraryList = (props) => {
  const [page, setPage] = useState(0);
  const [resourceType, _setResourceType] = useState('all');

  const {
    tasks: rootTasks,
    isLoading,
    hasMore,
    refresh,
  } = useMasterLibraryTasks({
    page,
    limit: PAGE_SIZE,
    resourceType,
  });

  // Use the extracted hook for tree logic
  const {
    treeData,
    loadingNodes,
    toggleExpand,
    handleStatusChange,
  } = useTreeState(rootTasks);

  const handleTaskClick = (task) => {
    if (props.onTaskSelect) {
      props.onTaskSelect(task);
    }
  };

  const pageDescription = useMemo(() => {
    if (isLoading) return 'Loading master library tasks…';
    const start = page * PAGE_SIZE + 1;
    const end = start + (rootTasks?.length || 0) - 1;
    return rootTasks?.length > 0
      ? `Showing tasks ${start} to ${end}`
      : `No tasks found on page ${page + 1}`;
  }, [isLoading, page, rootTasks]);

  const handlePrev = () => {
    if (page === 0 || isLoading) return;
    setPage((prev) => Math.max(0, prev - 1));
  };
  const handleNext = () => {
    if (!hasMore || isLoading) return;
    setPage((prev) => prev + 1);
  };

  const sensors = useSensors(useSensor(PointerSensor));

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
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
        {isLoading && treeData.length === 0 ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-2">
            <DndContext sensors={sensors}>
              {treeData.map((task) => (
                <div key={task.id} className="relative">
                  <TaskItem
                    task={task}
                    level={0}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    onAddChildTask={props.onAddChildTask}
                    forceShowChevron={true}
                    onToggleExpand={toggleExpand}
                  />
                  {loadingNodes[task.id] && (
                    <div className="absolute top-2 right-2 text-xs text-gray-500">
                      Loading subtasks...
                    </div>
                  )}
                </div>
              ))}
            </DndContext>
          </div>
        )}

        {!isLoading && treeData.length === 0 && (
          <div className="text-center py-8 text-gray-500">No tasks found.</div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">Page {page + 1}</span>
          <button
            onClick={handleNext}
            disabled={!hasMore}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default MasterLibraryList;
