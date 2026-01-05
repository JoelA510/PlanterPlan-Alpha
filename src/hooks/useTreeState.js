import { useState, useEffect, useCallback } from 'react';
import {
  mergeTaskUpdates,
  updateTreeExpansion,
  buildTree,
  mergeChildrenIntoTree,
  updateTaskInTree,
} from '../utils/treeHelpers';
import { fetchTaskChildren, updateTaskStatus } from '../services/taskService';

// Extracting logic from MasterLibraryList.jsx
export const useTreeState = (rootTasks) => {
  // Local state to store the tree with fetched children
  const [treeData, setTreeData] = useState([]);
  // Track which tasks are currently loading children
  const [loadingNodes, setLoadingNodes] = useState({});
  // Track expanded tasks to persist across refreshes
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  // Effect 1: Handle data updates from props (rootTasks)
  useEffect(() => {
    if (rootTasks && rootTasks.length > 0) {
      setTreeData((prevTree) => mergeTaskUpdates(prevTree, rootTasks));
    } else if (rootTasks) {
      setTreeData([]);
    }
  }, [rootTasks]);

  // Effect 2: Sync persistent expansion state to tree UI
  useEffect(() => {
    setTreeData((prevTree) => updateTreeExpansion(prevTree, expandedTaskIds));
  }, [expandedTaskIds]);

  const toggleExpand = useCallback(
    async (task, expanded) => {
      // 1. Update persistent state.
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        if (expanded) next.add(task.id);
        else next.delete(task.id);
        return next;
      });

      // 2. Fetch children if needed (Lazy Load) with race condition protection
      if (expanded && (!task.children || task.children.length === 0) && !loadingNodes[task.id]) {
        setLoadingNodes((prev) => ({ ...prev, [task.id]: true }));
        try {
          const children = await fetchTaskChildren(task.id);
          const rawDescendants = children.filter((c) => c.id !== task.id);
          const nestedChildren = buildTree(rawDescendants, task.id);

          setTreeData((prev) => {
            // Apply the new children
            return mergeChildrenIntoTree(prev, task.id, nestedChildren);
          });
        } catch (err) {
          console.error('Failed to load children', err);
        } finally {
          setLoadingNodes((prev) => ({ ...prev, [task.id]: false }));
        }
      }
    },
    [loadingNodes]
  );

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setTreeData((prev) => {
      // Optimistic update
      return updateTaskInTree(prev, taskId, { status: newStatus });
    });

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert logic could go here
    }
  }, []);

  return {
    treeData,
    loadingNodes,
    expandedTaskIds,
    toggleExpand,
    handleStatusChange,
  };
};
