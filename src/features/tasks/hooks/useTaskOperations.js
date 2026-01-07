import { useTaskQuery } from './useTaskQuery';
import { useTaskMutations } from './useTaskMutations';

export const useTaskOperations = () => {
  const query = useTaskQuery();

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
    ...mutations,
  };
};
