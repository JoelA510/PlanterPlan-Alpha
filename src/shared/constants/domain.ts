export const ROLES = {
    OWNER: 'owner',
    EDITOR: 'editor',
    COACH: 'coach',
    VIEWER: 'viewer',
    LIMITED: 'limited',
    ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

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

export const PROJECT_TABS = {
    BOARD: 'board',
    PEOPLE: 'people',
} as const;

export const PROJECT_TAB_LABELS = {
    [PROJECT_TABS.BOARD]: 'Tasks & Board',
    [PROJECT_TABS.PEOPLE]: 'Team',
} as const;
