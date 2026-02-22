import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * useProjectSelection
 * 
 * Manages the "Active Project" state, including:
 * 1. Syncing with URL parameters (projectId)
 * 2. Hydrating project details (fetching subtasks) if missing
 * 3. Handling selection errors
 * 
 * @param {Object} params
 * @param {String} params.urlProjectId - The projectId from the URL (useParams)
 * @param {Array} params.instanceTasks - Instance projects
 * @param {Array} params.templateTasks - Template projects
 * @param {Array} params.joinedProjects - Joined projects
 * @param {Object} params.hydratedProjects - Cache of project subtasks
 * @param {Function} params.fetchProjectDetails - Async function to load subtasks
 * @param {Boolean} params.loading - Global loading state
 */
export const useProjectSelection = ({
    urlProjectId,
    instanceTasks,
    templateTasks,
    joinedProjects,
    hydratedProjects,
    fetchProjectDetails,
    loading,
}) => {
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [hydrationError, setHydrationError] = useState(null);

    // --- Selection Handler ---
    const handleSelectProject = useCallback(
        async (project) => {
            // Optimistic update
            setActiveProjectId(project.id);
            setHydrationError(null);

            // Hydration check
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

    // --- URL Synchronization ---
    useEffect(() => {
        // Only sync if we have a URL ID, it differs from state, and we are not loading initial data
        if (urlProjectId && urlProjectId !== activeProjectId && !loading) {
            // Find the project object across all lists
            const project =
                instanceTasks.find((p) => p.id === urlProjectId) ||
                templateTasks.find((p) => p.id === urlProjectId) ||
                joinedProjects.find((p) => p.id === urlProjectId);

            if (project) {
                handleSelectProject(project);
            } else {
                // Project not found in lists (Access Denied or Delete?)
                // Could set error or redirect, but for now just log
                // console.warn('Project in URL not found in user lists');
            }
        } else if (!urlProjectId && activeProjectId) {
            // If URL has no ID (dashboard root), we might want to clear active project.
            // Doing strictly implies "No Project Selected".
            // However, we must match old behavior: did it clear?
            // Old code: "Let's leave it unless explicit."
            // We will leave it for now to avoid flickering, or can explicitly clear if safe.
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
        setHydrationError // Exposed for reset if needed
    };
};
