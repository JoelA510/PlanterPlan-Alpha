import { useState, useMemo, useCallback } from 'react';
import { buildTree, separateTasksByOrigin } from '@/shared/lib/tree-helpers';
import type { TaskRow as Task } from '@/shared/db/app.types';
import type { TaskNode } from '@/shared/lib/tree-helpers';

export interface UseTaskTreeParams {
    tasks: Task[];
    hydratedProjects: Record<string, Task[]>;
    activeProjectId: string | null;
    joinedProjects?: Task[];
}

export interface UseTaskTreeReturn {
    instanceTasks: Task[];
    templateTasks: Task[];
    activeProject: (Task & { children: TaskNode[]; isExpanded: boolean }) | null;
    expandedTaskIds: Set<string>;
    handleToggleExpand: (task: { id: string }, expanded: boolean) => void;
}

/**
 * useTaskTree
 * 
 * Manages the hierarchical structure of tasks for a project.
 */
export const useTaskTree = ({
    tasks,
    hydratedProjects,
    activeProjectId,
    joinedProjects = []
}: UseTaskTreeParams): UseTaskTreeReturn => {
    // --- Local UI State ---
    const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

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

        let childrenTree: TaskNode[] = [];
        if (childrenFlat) {
            childrenTree = buildTree(childrenFlat, activeProjectId);
        }

        // Recursive expansion helper
        const applyExpansion = (nodes: TaskNode[]): any[] => {
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
    const handleToggleExpand = useCallback((task: { id: string }, expanded: boolean) => {
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
