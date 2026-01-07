export const buildTaskHierarchy = (tasks) => {
  const taskMap = {};
  const rootTasks = [];

  tasks.forEach((task) => {
    taskMap[task.id] = { ...task, children: [] };
  });

  tasks.forEach((task) => {
    if (task.parent_task_id && taskMap[task.parent_task_id]) {
      taskMap[task.parent_task_id].children.push(taskMap[task.id]);
    } else {
      rootTasks.push(taskMap[task.id]);
    }
  });

  // Sort children for every task to ensure deterministic rendering order
  Object.values(taskMap).forEach((task) => {
    task.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  return rootTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};

export const separateTasksByOrigin = (tasks) => {
  const instanceTasks = tasks.filter((task) => task.origin === 'instance');
  const templateTasks = tasks.filter((task) => task.origin === 'template');

  return {
    instanceTasks: buildTaskHierarchy(instanceTasks),
    templateTasks: buildTaskHierarchy(templateTasks),
  };
};
