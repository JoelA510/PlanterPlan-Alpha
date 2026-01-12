import { useMemo } from 'react';
import { useTaskQuery } from '@features/tasks/hooks/useTaskQuery';
import { useTaskMutations } from '@features/tasks/hooks/useTaskMutations';
import { separateTasksByOrigin } from '@shared/lib/viewHelpers';

export const useTaskOperations = () => {
  const query = useTaskQuery();

  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(query.tasks || []), [query.tasks]);

  const mutations = useTaskMutations({
    tasks: query.tasks,
    fetchTasks: query.fetchTasks,
    fetchProjects: query.fetchProjects,
    refreshProjectDetails: query.refreshProjectDetails,
    findTask: query.findTask,
    joinedProjects: query.joinedProjects,
    hydratedProjects: query.hydratedProjects,
  });

  return {
    ...query,
    instanceTasks,
    templateTasks,
    ...mutations,
  };
};
