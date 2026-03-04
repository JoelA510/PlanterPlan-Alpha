import { useMemo } from 'react';
import { buildTree, separateTasksByOrigin } from '@/shared/lib/tree-helpers';
import type { TaskRow as Task } from '@/shared/db/app.types';
import type { TaskNode } from '@/shared/lib/tree-helpers';

export interface UseTaskTreeParams {
  tasks: Task[];
  hydratedProjects: Record<string, Task[]>;
  activeProjectId: string | null;
  joinedProjects?: Task[];
  expandedTaskIds: Set<string>;
}

export interface UseTaskTreeReturn {
  instanceTasks: Task[];
  templateTasks: Task[];
  activeProject: (Task & { children: TaskNode[]; isExpanded: boolean }) | null;
}

/**
 * useTaskTree
 * 
 * Manages the hierarchical structure of tasks for a project. 
 * Purely declarative and state-free.
 */
export const useTaskTree = ({
  tasks,
  hydratedProjects,
  activeProjectId,
  joinedProjects = [],
  expandedTaskIds
}: UseTaskTreeParams): UseTaskTreeReturn => {

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

  return {
    instanceTasks,
    templateTasks,
    activeProject,
  };
};
