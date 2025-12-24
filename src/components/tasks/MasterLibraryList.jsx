import React, { useMemo, useState, useCallback } from 'react';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';
import TaskItem from './TaskItem';
import { fetchTaskChildren, updateTaskStatus } from '../../services/taskService';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

// Helper to merge new children into a nested tree structure
const mergeChildrenIntoTree = (nodes, parentId, children) => {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: children };
    }
    if (node.children) {
      return { ...node, children: mergeChildrenIntoTree(node.children, parentId, children) };
    }
    return node;
  });
};

// Helper to update a specific task in the tree
const updateTaskInTree = (nodes, taskId, updates) => {
  return nodes.map((node) => {
    if (node.id === taskId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return { ...node, children: updateTaskInTree(node.children, taskId, updates) };
    }
    return node;
  });
};

const PAGE_SIZE = 10;

const MasterLibraryList = () => {
  const [page, setPage] = useState(0);
  const [resourceType, setResourceType] = useState('all');

  // Local state to store the full tree with fetched children
  const [treeData, setTreeData] = useState([]);
  // Track which tasks are currently loading children
  const [loadingNodes, setLoadingNodes] = useState({});

  const { tasks: rootTasks, isLoading, error, hasMore, refresh } = useMasterLibraryTasks({
    page,
    limit: PAGE_SIZE,
    resourceType,
  });

  // Sync root tasks from hook to local tree state when they change
  React.useEffect(() => {
    if (rootTasks) {
      if (rootTasks.length > 0) {
        setTreeData(prev => {
          // Simple replacement for pagination
          return rootTasks.map(t => ({ ...t, children: [] }));
        });
      } else {
        setTreeData([]);
      }
    }
  }, [rootTasks]);

  const handleFilterChange = (type) => {
    setResourceType(type);
    setPage(0);
  };

  const handleToggleExpand = useCallback(async (task) => {
    // Check if children are loaded
    if ((!task.children || task.children.length === 0) && !loadingNodes[task.id]) {
      // Fetch children
      setLoadingNodes(prev => ({ ...prev, [task.id]: true }));
      try {
        const children = await fetchTaskChildren(task.id);
        // Let's filter out the root task itself (which is in descendants)
        const rawDescendants = children.filter(c => c.id !== task.id);

        // Build tree from flat list
        const buildTree = (items, parentId) => {
          return items
            .filter(item => item.parent_task_id === parentId)
            .map(item => ({
              ...item,
              children: buildTree(items, item.id)
            }))
            .sort((a, b) => a.position - b.position);
        };

        const nestedChildren = buildTree(rawDescendants, task.id);

        setTreeData(prev => mergeChildrenIntoTree(prev, task.id, nestedChildren));

      } catch (err) {
        console.error("Failed to load children", err);
      } finally {
        setLoadingNodes(prev => ({ ...prev, [task.id]: false }));
      }
    }
  }, [loadingNodes]);

  const handleTaskClick = (task) => {
    handleToggleExpand(task);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistic update
      setTreeData(prev => updateTaskInTree(prev, taskId, { status: newStatus }));
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
      refresh();
    }
  };

  const pageDescription = useMemo(() => {
    if (isLoading) return 'Loading master library tasks…';
    const start = page * PAGE_SIZE + 1;
    const end = start + (rootTasks?.length || 0) - 1;
    return rootTasks?.length > 0 ? `Showing tasks ${start} to ${end}` : `No tasks found on page ${page + 1}`;
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
          <p className="text-sm text-slate-600" role="status" aria-live="polite">{pageDescription}</p>
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
              {treeData.map(task => (
                <div key={task.id} className="relative">
                  <TaskItem
                    task={task}
                    level={0}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    // Mock handlers for required props
                    onAddChildTask={() => { }}
                  />
                  {loadingNodes[task.id] && (
                    <div className="absolute top-2 right-2 text-xs text-gray-500">Loading subtasks...</div>
                  )}
                </div>
              ))}
            </DndContext>
          </div>
        )}

        {!isLoading && treeData.length === 0 && <div className="text-center py-8 text-gray-500">No tasks found.</div>}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <button onClick={handlePrev} disabled={page === 0} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
          <span className="text-sm">Page {page + 1}</span>
          <button onClick={handleNext} disabled={!hasMore} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </section>
  );
};

export default MasterLibraryList;
