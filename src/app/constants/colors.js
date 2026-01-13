import { TASK_STATUS } from './index';

export const CHART_COLORS = {
  [TASK_STATUS.TODO]: 'var(--color-slate-400)',
  [TASK_STATUS.IN_PROGRESS]: 'var(--color-amber-500)',
  [TASK_STATUS.BLOCKED]: 'var(--color-rose-500)',
  [TASK_STATUS.COMPLETED]: 'var(--color-emerald-500)',
};
