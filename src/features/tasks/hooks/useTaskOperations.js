import { useMemo } from 'react';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useTaskActions } from '@/features/tasks/hooks/useTaskActions';

import { useTaskSubscription } from '@/features/tasks/hooks/useTaskSubscription';
import { separateTasksByOrigin } from '@/shared/lib/viewHelpers';

export const useTaskOperations = () => {
  const query = useTaskQuery();

  const { instanceTasks, templateTasks } = useMemo(
    () => separateTasksByOrigin(query.tasks || []),
    [query.tasks]
  );

  const mutations = useTaskActions({
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



  return {
    ...query,
    instanceTasks,
    templateTasks,
    ...mutations,

    handleOptimisticUpdate: query.handleOptimisticUpdate,
    commitOptimisticUpdate: query.commitOptimisticUpdate,
  };
};
