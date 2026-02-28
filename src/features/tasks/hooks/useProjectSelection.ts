import { useState, useCallback, useEffect, useMemo } from 'react';

/** Minimal project shape used for selection. */
interface SelectableProject {
    id: string;
    title?: string;
    status?: string;
    [key: string]: unknown;
}

interface UseProjectSelectionParams {
    urlProjectId: string | null | undefined;
    instanceTasks: SelectableProject[];
    templateTasks: SelectableProject[];
    joinedProjects: SelectableProject[];
    hydratedProjects: Record<string, unknown[]>;
    fetchProjectDetails: (projectId: string) => Promise<void>;
    loading: boolean;
}

interface UseProjectSelectionReturn {
    activeProjectId: string | null;
    handleSelectProject: (project: SelectableProject) => Promise<void>;
    hydrationError: string | null;
    setHydrationError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Manages the "Active Project" state, including URL sync and hydration.
 */
export const useProjectSelection = ({
    urlProjectId,
    instanceTasks,
    templateTasks,
    joinedProjects,
    hydratedProjects,
    fetchProjectDetails,
    loading,
}: UseProjectSelectionParams): UseProjectSelectionReturn => {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [hydrationError, setHydrationError] = useState<string | null>(null);

    const handleSelectProject = useCallback(
        async (project: SelectableProject) => {
            setActiveProjectId(project.id);
            setHydrationError(null);

            if (!hydratedProjects[project.id]) {
                try {
                    await fetchProjectDetails(project.id);
                } catch (err) {
                    console.error('[useProjectSelection] Failed to hydrate project:', err);
                    setHydrationError('Failed to load project tasks.');
                }
            }
        },
        [hydratedProjects, fetchProjectDetails]
    );

    // URL Synchronization
    useEffect(() => {
        if (urlProjectId && urlProjectId !== activeProjectId && !loading) {
            const project =
                instanceTasks.find((p) => p.id === urlProjectId) ||
                templateTasks.find((p) => p.id === urlProjectId) ||
                joinedProjects.find((p) => p.id === urlProjectId);

            if (project) {
                handleSelectProject(project);
            }
        }
    }, [
        urlProjectId,
        activeProjectId,
        loading,
        instanceTasks,
        templateTasks,
        joinedProjects,
        handleSelectProject,
    ]);

    return {
        activeProjectId,
        handleSelectProject,
        hydrationError,
        setHydrationError,
    };
};
