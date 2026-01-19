export const ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  COACH: 'coach',
  VIEWER: 'viewer',
  LIMITED: 'limited',
  ADMIN: 'admin',
};

export const TASK_ORIGIN = {
  INSTANCE: 'instance',
  TEMPLATE: 'template',
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  LAUNCHED: 'launched',
  PAUSED: 'paused',
};

export const STORAGE_BUCKETS = {
  RESOURCES: 'resources',
};

// Position spacing for drag-and-drop reordering
export const POSITION_STEP = 10000;
