import { useState, useEffect, useCallback } from 'react';
import {
  mergeTaskUpdates,
  updateTreeExpansion,
  buildTree,
  mergeChildrenIntoTree,
  updateTaskInTree,
} from '@shared/lib/treeHelpers';
import { fetchTaskChildren, updateTaskStatus, updateTaskPosition } from '@features/tasks/services/taskService';
import { POSITION_STEP } from '@app/constants/index';

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
    let previousStatus;
    setTreeData((prev) => {
      // Find previous status for rollback
      const findTask = (nodes) => {
        for (const node of nodes) {
          if (node.id === taskId) return node;
          if (node.children) {
            const found = findTask(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const task = findTask(prev);
      if (task) previousStatus = task.status;

      // Optimistic update
      return updateTaskInTree(prev, taskId, { status: newStatus });
    });

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert logic
      if (previousStatus) {
        setTreeData((prev) => updateTaskInTree(prev, taskId, { status: previousStatus }));
      }
    }
  }, []);

  const handleReorder = useCallback(async (activeId, overId) => {
    if (activeId === overId) return;

    // We need to implement a "findNodeAndParent" helper or similar, 
    // but for now, we'll traverse checking children.
    // Simplifying assumption: We only support reordering within the same parent for now (siblings).
    // Or we rely on a flatted list search if the tree is deep.
    // Given 'treeData' is nested, this is tricky without a flat map.
    // Strategy: Flatten the tree temporarily to find positions?
    // Actually, updateTaskInTree might handle finding the node.

    // Better Strategy:
    // 1. Find the parent of 'overId' => that's our target parent.
    // 2. Find the index of 'overId' in that parent's children.
    // 3. Calculate new position.

    // For this iteration, let's implement a robust recursive finder.

    const findNodeAndSiblings = (nodes, targetId, parent = null) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
          return { node: nodes[i], siblings: nodes, index: i, parent };
        }
        if (nodes[i].children) {
          const result = findNodeAndSiblings(nodes[i].children, targetId, nodes[i]);
          if (result) return result;
        }
      }
      return null;
    };

    setTreeData((prevTree) => {
      const activeData = findNodeAndSiblings(prevTree, activeId);
      const overData = findNodeAndSiblings(prevTree, overId);

      if (!activeData || !overData) return prevTree;

      // Ensure we are reordering siblings for safety in V1
      if (activeData.parent?.id !== overData.parent?.id) {
        console.warn('Reparenting drag not yet supported via this simple reorder');
        return prevTree;
      }

      // Calculate new position
      // If dragging DOWN: dropped after overId? Or swap?
      // Standard list reorder: we want to place activeId relative to overId.
      // Dnd-kit usually implies insertion.

      const siblings = overData.siblings;
      const overIndex = overData.index;
      // const activeIndex = activeData.index;

      // Simplest Logic: Take position before or after 'over' node.
      // But we need the position values.

      // Let's assume we place it BEFORE the over node if moving up, AFTER if moving down?
      // Actually, standard dnd-kit sortable strategy is swap.
      // But we want persisted "Position" values.

      // Let's calculate a new position value.
      // Position = (PrevNode.pos + NextNode.pos) / 2

      // We need to fetch the *new* sorted list to determine neighbors.
      // But we are in the middle of a drag.

      // Let's defer strict calculation to the "Optimistic Update" phase.
      // But wait, we need the Calculated Position to send to the server.

      // Let's grab the neighbor positions from the current tree state.
      // If we drop ON 'overId', we place it *at* that index.

      let newPosition;

      // Check if we are moving UP or DOWN relative to the list order
      // Using indices from the SAME sibling list
      const isMovingDown = activeData.index < overData.index;

      if (isMovingDown) {
        // Place AFTER overId
        const afterPos = siblings[overIndex].position || 0;
        const nextSibling = siblings[overIndex + 1];
        const nextPos = nextSibling ? (nextSibling.position || afterPos + POSITION_STEP * 2) : (afterPos + POSITION_STEP);
        newPosition = (afterPos + nextPos) / 2;
      } else {
        // Place BEFORE overId
        const beforePos = siblings[overIndex].position || 0;
        const prevSibling = siblings[overIndex - 1];
        const prevPos = prevSibling ? (prevSibling.position || beforePos - POSITION_STEP * 2) : (beforePos - POSITION_STEP);
        newPosition = (prevPos + beforePos) / 2;
      }

      // Optimistic Tree Update
      // We clone the tree, remove active, insert at new index
      // But our helper `updateTaskInTree` just updates props. It doesn't move nodes.
      // For reordering, we need a `moveNode` helper.

      // For now, let's just update the position property and sort.
      // But the tree renderer sorts by default? 
      // Yes, rely on default sort if we update position.

      // Side Effect: Trigger API
      updateTaskPosition(activeId, newPosition, activeData.parent?.id)
        .catch(err => {
          console.error("Reorder failed", err);
          // Revert would be complex here without deep clone backup.
        });

      // Return new tree with updated position
      return updateTaskInTree(prevTree, activeId, { position: newPosition });
    });
  }, []);

  return {
    treeData,
    loadingNodes,
    expandedTaskIds,
    toggleExpand,
    handleStatusChange,
    handleReorder
  };
};
