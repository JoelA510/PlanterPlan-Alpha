import { useMemo } from 'react';
import { useTaskQuery } from '@features/tasks/hooks/useTaskQuery';
import { useTaskMutations } from '@features/tasks/hooks/useTaskMutations';
import { useProjectMutations } from '@features/projects/hooks/useProjectMutations';
import { useTaskSubscription } from '@features/tasks/hooks/useTaskSubscription';
import { separateTasksByOrigin } from '@shared/lib/viewHelpers';

export const useTaskOperations = () => {
  const query = useTaskQuery();

  const { instanceTasks, templateTasks } = useMemo(
    () => separateTasksByOrigin(query.tasks || []),
    [query.tasks]
  );

  const mutations = useTaskMutations({
    tasks: query.tasks,
    fetchTasks: query.fetchTasks,
    fetchProjects: query.fetchProjects,
    refreshProjectDetails: query.refreshProjectDetails,
    findTask: query.findTask,
    joinedProjects: query.joinedProjects,
    hydratedProjects: query.hydratedProjects,
    commitOptimisticUpdate: query.commitOptimisticUpdate,
  });

  useTaskSubscription({
    refreshProjectDetails: query.refreshProjectDetails,
    fetchProjects: query.fetchProjects,
    findTask: query.findTask,
    currentUserId: query.currentUserId,
  });

  const projectMutations = useProjectMutations({
    tasks: query.tasks,
    fetchTasks: query.fetchTasks,
  });

  return {
    ...query,
    instanceTasks,
    templateTasks,
    ...mutations,
    ...projectMutations,
    handleOptimisticUpdate: query.handleOptimisticUpdate,
    commitOptimisticUpdate: query.commitOptimisticUpdate,
  };
};
