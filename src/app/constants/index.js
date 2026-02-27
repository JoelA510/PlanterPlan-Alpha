// Re-export shared constants so existing `@/app/constants` consumers are unaffected.
// Canonical definitions live in `src/shared/constants/index.ts`.
export { ROLES, POSITION_STEP } from '@/shared/constants';

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
