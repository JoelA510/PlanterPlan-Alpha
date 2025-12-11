
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
 * @returns {Array} - List of new task objects ready for insertion.
 */
export const prepareDeepClone = (tasks, rootId, newParentId, newOrigin, creatorId) => {
    const idMap = generateIdMap(tasks);
    const newRootId = idMap[rootId];

    if (!newRootId) {
        throw new Error('Root task not found in provided task list');
    }

    return tasks.map((task) => {
        const isRoot = task.id === rootId;
        const newId = idMap[task.id];

        // If it's the root, its parent is the passed newParentId.
        // If it's a child, its parent is the mapped ID of its original parent.
        const parentTaskId = isRoot ? newParentId : (idMap[task.parent_task_id] || null);

        return {
            id: newId,
            title: task.title,
            description: task.description,
            purpose: task.purpose,
            actions: task.actions,
            resources: task.resources,
            notes: task.notes,
            days_from_start: task.days_from_start,
            origin: newOrigin,
            creator: creatorId,
            parent_task_id: parentTaskId,
            position: task.position,
            is_complete: false,
            // Dates will be recalculated by the caller or DB triggers usually, 
            // but we can copy offsets if needed. For now, we rely on days_from_start.
            start_date: null,
            due_date: null,
        };
    });
};
