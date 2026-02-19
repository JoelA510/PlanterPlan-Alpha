import { TASK_STATUS, PROJECT_STATUS } from './index';

export const CHART_COLORS = {
  [TASK_STATUS.TODO]: 'var(--color-slate-400)',
  [TASK_STATUS.IN_PROGRESS]: 'var(--color-amber-500)',
  [TASK_STATUS.BLOCKED]: 'var(--color-rose-500)',
  [TASK_STATUS.COMPLETED]: 'var(--color-emerald-500)',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: {
    bg: 'bg-white',
    border: 'border-2 border-blue-600',
    text: 'text-blue-700',
    gradient: '',
    accent: 'border-blue-500',
    headerBg: 'bg-blue-600',
    headerContent: 'text-white',
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    bg: 'bg-white',
    border: 'border-2 border-orange-600',
    text: 'text-orange-700',
    gradient: '',
    accent: 'border-orange-500',
    headerBg: 'bg-orange-600',
    headerContent: 'text-white',
  },
  [PROJECT_STATUS.LAUNCHED]: {
    bg: 'bg-white',
    border: 'border-2 border-emerald-600',
    text: 'text-emerald-700',
    gradient: '',
    accent: 'border-emerald-500',
    headerBg: 'bg-emerald-600',
    headerContent: 'text-white',
  },
  [PROJECT_STATUS.PAUSED]: {
    bg: 'bg-white',
    border: 'border-2 border-amber-500',
    text: 'text-amber-700',
    icon: 'text-slate-900',
    indicator: 'bg-amber-500',
    gradient: '',
    accent: 'border-amber-500',
    headerBg: 'bg-amber-500',
    headerContent: 'text-white',
  },
};
