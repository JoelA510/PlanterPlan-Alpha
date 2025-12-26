import React, { useMemo, useState, useCallback } from 'react';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';
import TaskItem from '../molecules/TaskItem';
import { fetchTaskChildren, updateTaskStatus } from '../../services/taskService';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

import { mergeChildrenIntoTree, updateTaskInTree, buildTree, mergeTaskUpdates } from '../../utils/treeHelpers';

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

  // Sync root tasks from hook to local tree state when they change
  React.useEffect(() => {
    if (rootTasks) {
      if (rootTasks.length > 0) {
        setTreeData((prevTree) => mergeTaskUpdates(prevTree, rootTasks));

        // Re-hydrate expanded state for visible roots
        rootTasks.forEach((task) => {
          if (expandedTaskIds.has(task.id)) {
            handleToggleExpand(task, true);
          }
        });
      } else {
        setTreeData([]);
      }
    }
  }, [rootTasks]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // const handleFilterChange = (type) => {
  //   setResourceType(type);
  //   setPage(0);
  // };

  const handleToggleExpand = useCallback(
    async (task, isExpanded) => {
      // Update persistent expansion state
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        if (isExpanded) next.add(task.id);
        else next.delete(task.id);
        return next;
      });

      // If expanding and children missing, fetch them
      if (isExpanded && (!task.children || task.children.length === 0) && !loadingNodes[task.id]) {
        // Fetch children
        setLoadingNodes((prev) => ({ ...prev, [task.id]: true }));
        try {
          const children = await fetchTaskChildren(task.id);
          // Let's filter out the root task itself (which is in descendants)
          const rawDescendants = children.filter((c) => c.id !== task.id);

          const nestedChildren = buildTree(rawDescendants, task.id);

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

  /*
   * Note: If we want to support selection for the Details panel, we need to lift state up or use a Context.
   * Based on the user feedback "Details panel stuck on No Selection", checking if onTaskSelect prop is needed.
   * Assuming the Dashboard passes a prop, we should use it.
   * But the current definition doesn't take props.
   * I will add `onTaskSelect` to props.
   */
  const handleTaskClick = (task) => {
    // Removed handleToggleExpand(task) to prevent auto-collapse on selection
    if (props.onTaskSelect) {
      props.onTaskSelect(task);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const previousTreeData = treeData;
    try {
      // Optimistic update
      setTreeData((prev) => updateTaskInTree(prev, taskId, { status: newStatus }));
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
      // Rollback to previous state on failure
      setTreeData(previousTreeData);
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

  // Dnd sensors (needed for TaskItem/Sortable context even if we disable drag)
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
            {/* ID for DndContext is arbitrary here since we aren't reordering really */}
            <DndContext sensors={sensors}>
              {treeData.map((task) => (
                <div key={task.id} className="relative">
                  <TaskItem
                    task={task}
                    level={0}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    // Mock handlers for required props
                    onAddChildTask={() => { }}
                    forceShowChevron={true}
                    onToggleExpand={handleToggleExpand}
                    isExpanded={expandedTaskIds.has(task.id)}
                    expandedTaskIds={expandedTaskIds}
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
