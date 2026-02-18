import { useState, useMemo, useCallback } from 'react';
import { buildTree } from '@shared/lib/treeHelpers';
import { separateTasksByOrigin } from '@shared/lib/viewHelpers';

/**
 * useTaskTree
 * 
 * Manages the hierarchical structure of tasks for a project.
 * Handles:
 * 1. Filtering tasks by origin (Instance vs Template)
 * 2. Building the visual tree for the active project
 * 3. Managing local expansion state (open/close folders)
 * 
 * @param {Object} params
 * @param {Array} params.tasks - Root tasks
 * @param {Object} params.hydratedProjects - Map of projectId -> flatted subtasks
 * @param {String} params.activeProjectId - Currently selected project ID
 * @param {Array} params.joinedProjects - Projects the user is a member of
 */
export const useTaskTree = ({
    tasks,
    hydratedProjects,
    activeProjectId,
    joinedProjects = []
}) => {
    // --- Local UI State ---
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

    // --- Derived Data ---
    const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

    // --- Tree Construction ---
    const activeProject = useMemo(() => {
        if (!activeProjectId) return null;

        // Find the root project (Owned, Template, or Joined)
        const rootProject =
            instanceTasks.find((t) => t.id === activeProjectId) ||
            templateTasks.find((t) => t.id === activeProjectId) ||
            joinedProjects.find((t) => t.id === activeProjectId);

        if (!rootProject) return null;

        // Check if we have children in cache
        const childrenFlat = hydratedProjects[activeProjectId];

        let childrenTree = [];
        if (childrenFlat) {
            childrenTree = buildTree(childrenFlat, activeProjectId);
        }

        // Recursive expansion helper
        const applyExpansion = (nodes) => {
            return nodes.map((node) => ({
                ...node,
                isExpanded: expandedTaskIds.has(node.id),
                children: applyExpansion(node.children || []),
            }));
        };

        const projectWithTree = {
            ...rootProject,
            children: applyExpansion(childrenTree),
            isExpanded: expandedTaskIds.has(rootProject.id),
        };

        return projectWithTree;
    }, [
        activeProjectId,
        instanceTasks,
        templateTasks,
        joinedProjects,
        hydratedProjects,
        expandedTaskIds,
    ]);

    // --- Handlers ---
    const handleToggleExpand = useCallback((task, expanded) => {
        setExpandedTaskIds((prev) => {
            const next = new Set(prev);
            if (expanded) next.add(task.id);
            else next.delete(task.id);
            return next;
        });
    }, []);

    return {
        instanceTasks,
        templateTasks,
        activeProject,
        expandedTaskIds,
        handleToggleExpand,
    };
};
