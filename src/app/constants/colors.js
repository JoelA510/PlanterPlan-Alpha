import { TASK_STATUS, PROJECT_STATUS } from './index';

export const CHART_COLORS = {
  [TASK_STATUS.TODO]: 'var(--color-slate-400)',
  [TASK_STATUS.IN_PROGRESS]: 'var(--color-amber-500)',
  [TASK_STATUS.BLOCKED]: 'var(--color-rose-500)',
  [TASK_STATUS.COMPLETED]: 'var(--color-emerald-500)',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-700',
  },
  [PROJECT_STATUS.LAUNCHED]: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    text: 'text-green-700',
  },
  [PROJECT_STATUS.PAUSED]: {
    bg: 'bg-slate-50',
    border: 'border-slate-100',
    text: 'text-slate-700',
  },
};
