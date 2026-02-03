import { TASK_STATUS, PROJECT_STATUS } from './index';

export const CHART_COLORS = {
  [TASK_STATUS.TODO]: 'var(--color-slate-400)',
  [TASK_STATUS.IN_PROGRESS]: 'var(--color-amber-500)',
  [TASK_STATUS.BLOCKED]: 'var(--color-rose-500)',
  [TASK_STATUS.COMPLETED]: 'var(--color-emerald-500)',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: {
    bg: 'bg-white dark:bg-slate-950',
    border: 'border-2 border-blue-600 dark:border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    gradient: 'from-blue-100/60 to-transparent dark:from-blue-900/40 dark:to-transparent',
    accent: 'border-blue-500 dark:border-blue-400',
    headerBg: 'bg-blue-600 dark:bg-blue-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    bg: 'bg-white dark:bg-slate-950',
    border: 'border-2 border-orange-600 dark:border-orange-400',
    text: 'text-orange-700 dark:text-orange-300',
    gradient: 'from-orange-100/60 to-transparent dark:from-orange-900/40 dark:to-transparent',
    accent: 'border-orange-500 dark:border-orange-400',
    headerBg: 'bg-orange-600 dark:bg-orange-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.LAUNCHED]: {
    bg: 'bg-white dark:bg-slate-950',
    border: 'border-2 border-emerald-600 dark:border-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    gradient: 'from-emerald-100/60 to-transparent dark:from-emerald-900/40 dark:to-transparent',
    accent: 'border-emerald-500 dark:border-emerald-400',
    headerBg: 'bg-emerald-600 dark:bg-emerald-600',
    headerContent: 'text-white dark:text-slate-100',
  },
  [PROJECT_STATUS.PAUSED]: {
    bg: 'bg-white dark:bg-slate-950',
    border: 'border-2 border-amber-500 dark:border-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-slate-900 dark:text-white',
    indicator: 'bg-amber-500',
    gradient: 'from-amber-100/60 to-transparent dark:from-amber-900/40 dark:to-transparent',
    accent: 'border-amber-500 dark:border-amber-400',
    headerBg: 'bg-amber-500 dark:bg-amber-600',
    headerContent: 'text-white dark:text-slate-100',
  },
};
