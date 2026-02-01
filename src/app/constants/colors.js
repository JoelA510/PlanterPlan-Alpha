import { TASK_STATUS, PROJECT_STATUS } from './index';

export const CHART_COLORS = {
  [TASK_STATUS.TODO]: 'var(--color-slate-400)',
  [TASK_STATUS.IN_PROGRESS]: 'var(--color-amber-500)',
  [TASK_STATUS.BLOCKED]: 'var(--color-rose-500)',
  [TASK_STATUS.COMPLETED]: 'var(--color-emerald-500)',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-slate-900 dark:border-white',
    text: 'text-slate-900 dark:text-white',
    gradient: 'from-blue-50/50 to-transparent dark:from-blue-900/20 dark:to-transparent',
    accent: 'border-blue-500 dark:border-blue-400',
    headerBg: 'bg-blue-600 dark:bg-blue-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    border: 'border-slate-900 dark:border-white',
    text: 'text-slate-900 dark:text-white',
    gradient: 'from-orange-50/50 to-transparent dark:from-orange-900/20 dark:to-transparent',
    accent: 'border-orange-500 dark:border-orange-400',
    headerBg: 'bg-orange-600 dark:bg-orange-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.LAUNCHED]: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    border: 'border-slate-900 dark:border-white',
    text: 'text-slate-900 dark:text-white',
    gradient: 'from-emerald-50/50 to-transparent dark:from-emerald-900/20 dark:to-transparent',
    accent: 'border-emerald-500 dark:border-emerald-400',
    headerBg: 'bg-emerald-600 dark:bg-emerald-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.PAUSED]: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    border: 'border-slate-900 dark:border-white',
    text: 'text-slate-900 dark:text-white',
    icon: 'text-slate-900 dark:text-white',
    indicator: 'bg-amber-500',
    gradient: 'from-amber-50/50 to-transparent dark:from-amber-900/20 dark:to-transparent',
    accent: 'border-amber-500 dark:border-amber-400',
    headerBg: 'bg-amber-500 dark:bg-amber-600',
    headerContent: 'text-white dark:text-slate-100',
  },
};
