import { i18n } from '@/shared/i18n';

const currentLocale = (): string => i18n.language || 'en';

/**
 * Locale-aware date formatter for DISPLAY only. Internal date math (sorting,
 * comparison, persistence, ISO parsing) lives in `@/shared/lib/date-engine`.
 */
export function formatDateLocalized(
  iso: string | null,
  format: 'short' | 'long' | 'relative',
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  if (format === 'relative') {
    const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });
    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
    return rtf.format(Math.round(diffDays / 30), 'month');
  }
  return new Intl.DateTimeFormat(currentLocale(), {
    dateStyle: format === 'long' ? 'full' : 'medium',
  }).format(d);
}

export function formatNumberLocalized(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale(), opts).format(n);
}

export function formatCurrencyLocalized(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).format(n);
}
