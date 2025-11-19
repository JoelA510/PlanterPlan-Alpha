const findTaskById = (tasks, id) => {
  if (id === null || id === undefined) {
    return null;
  }

  return tasks.find((task) => task.id === id) || null;
};

export const calculateScheduleFromOffset = (tasks, parentId, daysOffset) => {
  if (parentId === null || parentId === undefined) {
    return {};
  }

  if (daysOffset === null || daysOffset === undefined) {
    return {};
  }

  const parentTask = findTaskById(tasks, parentId);

  if (!parentTask) {
    return {};
  }

  let rootTask = parentTask;
  const visited = new Set();

  while (rootTask?.parent_task_id && !visited.has(rootTask.parent_task_id)) {
    visited.add(rootTask.parent_task_id);
    const ancestor = findTaskById(tasks, rootTask.parent_task_id);
    if (!ancestor) {
      break;
    }
    rootTask = ancestor;
  }

  const projectStartDate = rootTask?.start_date || parentTask.start_date;

  if (!projectStartDate) {
    return {};
  }

  const baseDate = projectStartDate.includes('T')
    ? projectStartDate
    : `${projectStartDate}T00:00:00.000Z`;

  const start = new Date(baseDate);

  if (Number.isNaN(start.getTime())) {
    return {};
  }

  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + daysOffset);

  const iso = start.toISOString();

  return {
    start_date: iso,
    due_date: iso,
  };
};

export const toIsoDate = (value) => {
  if (!value) {
    return null;
  }

  const base = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const parsed = new Date(base);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCHours(0, 0, 0, 0);
  return parsed.toISOString();
};
