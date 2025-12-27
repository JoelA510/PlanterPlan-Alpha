// src/components/organisms/MasterLibraryList.jsx
import React, { useMemo, useState, useCallback } from 'react';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';
import TaskItem from '../molecules/TaskItem';
import { fetchTaskChildren, updateTaskStatus } from '../../services/taskService';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

import {
  mergeChildrenIntoTree,
  updateTaskInTree,
  buildTree,
  mergeTaskUpdates,
  updateTreeExpansion,
} from '../../utils/treeHelpers';

const PAGE_SIZE = 50;

const MasterLibraryList = (props) => {
  const [page, setPage] = useState(0);
  const [resourceType, setResourceType] = useState('all');

  // Local state to store the tree with fetched children
  const [treeData, setTreeData] = useState([]);
  // Track which tasks are currently loading children
  const [loadingNodes, setLoadingNodes] = useState({});
  // Track expanded tasks to persist across refreshes
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

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

  // Effect 1: Handle data updates from hook
  React.useEffect(() => {
    if (rootTasks && rootTasks.length > 0) {
      setTreeData((prevTree) => mergeTaskUpdates(prevTree, rootTasks));
    } else if (rootTasks) {
      setTreeData([]);
    }
  }, [rootTasks]);

  // Effect 2: Sync persistent expansion state to tree UI
  // This runs whenever the set of expanded IDs changes (user toggles)
  React.useEffect(() => {
    setTreeData((prevTree) => updateTreeExpansion(prevTree, expandedTaskIds));
  }, [expandedTaskIds]);

  const handleToggleExpand = useCallback(
    async (task, expanded) => {
      // 1. Update persistent state. This will trigger Effect 2 to update UI state.
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        if (expanded) next.add(task.id);
        else next.delete(task.id);
        return next;
      });

      // 2. Fetch children if needed (Lazy Load)
      if (expanded && (!task.children || task.children.length === 0) && !loadingNodes[task.id]) {
        setLoadingNodes((prev) => ({ ...prev, [task.id]: true }));
        try {
          const children = await fetchTaskChildren(task.id);
          const rawDescendants = children.filter((c) => c.id !== task.id);
          const nestedChildren = buildTree(rawDescendants, task.id);

          // We explicitly merge children here. The isExpanded state will be maintained
          // because mergeChildrenIntoTree preserves the rest of the node properties.
          setTreeData((prev) => mergeChildrenIntoTree(prev, task.id, nestedChildren));
        } catch (err) {
          console.error('Failed to load children', err);
        } finally {
          setLoadingNodes((prev) => ({ ...prev, [task.id]: false }));
        }
      }
    },
    [loadingNodes]
  );

  const handleTaskClick = (task) => {
    if (props.onTaskSelect) {
      props.onTaskSelect(task);
    }
  };

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setTreeData((prev) => {
      // Optimistic update: manually update the status in the tree
      return updateTaskInTree(prev, taskId, { status: newStatus });
    });

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert could be implemented here by re-fetching or undoing the change,
      // but for now we log the error. Ideally we would capture the previous status to revert.
    }
  }, []);

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
                    onAddChildTask={() => { }}
                    forceShowChevron={true}
                    onToggleExpand={handleToggleExpand}
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
