import { TASK_STATUS } from './index';

export const CHART_COLORS = {
    [TASK_STATUS.TODO]: '#94a3b8',   // slate-400
    [TASK_STATUS.IN_PROGRESS]: '#f59e0b',   // amber-500
    [TASK_STATUS.BLOCKED]: '#f43f5e',    // rose-500
    [TASK_STATUS.COMPLETED]: '#10b981', // emerald-500
};
