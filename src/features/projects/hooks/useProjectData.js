import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { planter } from '@/shared/api/planterClient';

/**
 * Hook to fetch project metadata, hierarchy (phases/milestones/tasks), and team members.
 * 
 * @param {string} projectId - UUID of the project to fetch.
 * @returns {Object} Data object containing:
 *  - project: {Object|null} Project metadata.
 *  - loadingProject: {boolean} Loading state for project metadata.
 *  - projectHierarchy: {Array} Flat array of all tasks/phases/milestones.
 *  - phases: {Array} Filtered list of Phase tasks.
 *  - milestones: {Array} Filtered list of Milestone tasks.
 *  - tasks: {Array} Filtered list of leaf Tasks.
 *  - teamMembers: {Array} List of project members.
 */
export function useProjectData(projectId) {
    // 1. Fetch Project Metadata
    const { data: project, isLoading: loadingProject } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res) => res[0]),
        enabled: !!projectId,
    });

    // 2. Fetch Project Hierarchy (Phases, Milestones, Tasks)
    const { data: projectHierarchy = [] } = useQuery({
        queryKey: ['projectHierarchy', projectId],
        queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
        enabled: !!projectId,
    });

    // Derived State
    const { phases, milestones, tasks } = useMemo(() => {
        // Build an adjacency map and categorizations in a single O(N) pass
        const phaseIds = new Set();
        const milestoneIds = new Set();

        const _phases = [];
        const _milestones = [];
        const _tasks = [];

        // Step 1: Initialize phase relationships first so milestones can find them
        for (const t of projectHierarchy) {
            if (t.parent_task_id === projectId) {
                phaseIds.add(t.id);
                _phases.push(t);
            }
        }

        // Step 2: Categorize milestones and tasks in one pass
        for (const t of projectHierarchy) {
            if (t.parent_task_id !== projectId) {
                if (phaseIds.has(t.parent_task_id)) {
                    milestoneIds.add(t.id);
                    _milestones.push(t);
                } else {
                    _tasks.push(t);
                }
            }
        }

        return { phases: _phases, milestones: _milestones, tasks: _tasks };
    }, [projectHierarchy, projectId]); // Recalculate only when raw data or query ID changes

    // 3. Fetch Team Members
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['teamMembers', projectId],
        queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
        enabled: !!projectId,
    });


    return {
        project,
        loadingProject,
        projectHierarchy,
        phases,
        milestones,
        tasks,
        teamMembers,
    };
}
