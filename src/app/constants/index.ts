// Re-export shared constants so existing `@/app/constants` consumers are unaffected.
// Canonical definitions live in `src/shared/constants/index.ts`.
export { ROLES, POSITION_STEP } from '@/shared/constants';

export const TASK_ORIGIN = {
    INSTANCE: 'instance',
    TEMPLATE: 'template',
} as const;

export type TaskOrigin = (typeof TASK_ORIGIN)[keyof typeof TASK_ORIGIN];

export const TASK_STATUS = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    BLOCKED: 'blocked',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const PROJECT_STATUS = {
    PLANNING: 'planning',
    IN_PROGRESS: 'in_progress',
    LAUNCHED: 'launched',
    PAUSED: 'paused',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const STORAGE_BUCKETS = {
    RESOURCES: 'resources',
} as const;
