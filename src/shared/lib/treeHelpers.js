// src/utils/treeHelpers.js

/**
 * Generates a mapping of old IDs to new IDs for a list of tasks.
 * @param {Array} tasks - List of tasks to clone.
 * @returns {Object} - Map of oldId -> newId.
 */
export const generateIdMap = (tasks) => {
  const map = {};
  tasks.forEach((task) => {
    map[task.id] = crypto.randomUUID();
  });
  return map;
};

/**
 * Prepares a list of tasks for insertion as a deep clone.
 * @param {Array} tasks - The flat list of tasks to clone (including root).
 * @param {string} rootId - The ID of the root task in the source list.
 * @param {string} newParentId - The ID of the parent for the new root (or null).
 * @param {string} newOrigin - The origin for the new tasks ('instance' or 'template').
 * @param {string} creatorId - The user ID of the creator.
 * @param {string} existingRootId - Optional. If cloning into an existing project, this is the project root ID.
 * @returns {Array} - List of new task objects ready for insertion.
 */
export const prepareDeepClone = (
  tasks,
  rootId,
  newParentId,
  newOrigin,
  creatorId,
  existingRootId = null
) => {
  const idMap = generateIdMap(tasks);
  const newRootId = idMap[rootId];

  if (!newRootId) {
    throw new Error('Root task not found in provided task list');
  }

  // If we are given an existing root ID (e.g. adding a subtask to a project), use it.
  // Otherwise, the new root task IS the new root ID.
  const resolvedRootId = existingRootId || newRootId;

  const newTasks = tasks.map((task) => {
    const isRoot = task.id === rootId;
    const newId = idMap[task.id];

    // If it's the root, its parent is the passed newParentId.
    // If it's a child, its parent is the mapped ID of its original parent.
    const parentTaskId = isRoot ? newParentId : idMap[task.parent_task_id] || null;

    return {
      id: newId,
      title: task.title,
      description: task.description,
      purpose: task.purpose,
      actions: task.actions,
      notes: task.notes,
      days_from_start: task.days_from_start,
      origin: newOrigin,
      creator: creatorId,
      parent_task_id: parentTaskId,
      // Fix: Pre-calculate root_id so batch insert works with triggers
      root_id: resolvedRootId,
      position: task.position,
      is_complete: false,
      // Dates will be recalculated by the caller or DB triggers usually,
      // but we can copy offsets if needed. For now, we rely on days_from_start.
      start_date: null,
      due_date: null,
      primary_resource_id: null, // Will be set after resources are cloned
    };
  });

  return { newTasks, idMap };
};

// Helper to merge new children into a nested tree structure
export const mergeChildrenIntoTree = (nodes, parentId, children) => {
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
export const updateTaskInTree = (nodes, taskId, updates) => {
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

/**
 * Flattens a tree structure into a flat array.
 * @param {Array} tree - The tree structure.
 * @returns {Array} - Flat array of items.
 */
export const flattenTree = (tree) => {
  const result = [];
  const traverse = (nodes) => {
    for (const node of nodes) {
      const { children, ...rest } = node;
      result.push(rest);
      if (children && children.length > 0) {
        traverse(children);
      }
    }
  };
  traverse(tree);
  return result;
};

/**
 * Builds a hierarchical tree from a flat list of items.
 * Uses a Map for O(n) complexity.
 * @param {Array} items - Flat list of items.
 * @param {string|number} parentId - The parent ID to start building from.
 * @returns {Array} - Array of root nodes with nested children.
 */
export const buildTree = (items, parentId) => {
  const map = new Map();
  // Initialize map
  items.forEach((item) => map.set(item.id, { ...item, children: [] }));

  const roots = [];
  // Link children to parents
  items.forEach((item) => {
    if (item.parent_task_id === parentId) {
      roots.push(map.get(item.id));
    } else if (map.has(item.parent_task_id)) {
      map.get(item.parent_task_id).children.push(map.get(item.id));
    }
  });

  // Sort all children arrays
  map.forEach((node) => {
    node.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  return roots.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};

/**
 * Merges updates from a list of new tasks into an existing tree, preserving children.
 * @param {Array} currentTree - Valid current tree state.
 * @param {Array} newTasks - Incoming list of tasks (e.g. from pagination).
 * @returns {Array} - Merged tree.
 */
export const mergeTaskUpdates = (currentTree, newTasks) => {
  const currentMap = new Map(currentTree.map((t) => [t.id, t]));

  return newTasks.map((newTask) => {
    const existing = currentMap.get(newTask.id);
    if (existing) {
      // Preserve existing children and expansion state, update other props
      return {
        ...newTask,
        children: existing.children,
        isExpanded: existing.isExpanded, // Preserve UI state
      };
    }
    // New task, initialize children
    return { ...newTask, children: [], isExpanded: false };
  });
};

/**
 * Recursively updates the expansion state of the tree based on a Set of IDs.
 * @param {Array} nodes - The tree nodes.
 * @param {Set} expandedIds - Set of IDs that should be expanded.
 * @returns {Array} - New tree with updated expansion state.
 */
export const updateTreeExpansion = (nodes, expandedIds) => {
  return nodes.map((node) => ({
    ...node,
    isExpanded: expandedIds.has(node.id),
    children: node.children ? updateTreeExpansion(node.children, expandedIds) : [],
  }));
};
