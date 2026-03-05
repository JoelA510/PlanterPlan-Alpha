import { useState, useCallback, useEffect } from 'react';

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
 loading,
}: UseProjectSelectionParams): UseProjectSelectionReturn => {
 const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
 const [hydrationError, setHydrationError] = useState<string | null>(null);

 const handleSelectProject = useCallback(
 async (project: SelectableProject): Promise<void> => {
 setActiveProjectId(project.id);
      setHydrationError(null);
 // React Query (useProjectData) will automatically fetch details based on activeProjectId
 },
 []
 );

 // URL Synchronization
 useEffect(() => {
 if (urlProjectId && urlProjectId !== activeProjectId && !loading) {
 const project =
 instanceTasks.find((p) => p.id === urlProjectId) ||
 templateTasks.find((p) => p.id === urlProjectId) ||
 joinedProjects.find((p) => p.id === urlProjectId);

 if (project) {
 // eslint-disable-next-line react-hooks/set-state-in-effect
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
