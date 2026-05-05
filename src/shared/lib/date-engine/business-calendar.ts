import { addDays, differenceInCalendarDays, isValid, parseISO } from 'date-fns';

/**
 * Business-calendar abstraction for PlanterPlan scheduling.
 *
 * PR I1 intentionally preserves current calendar-day behavior: every valid
 * date is treated as a business day, so Friday + 1 business day is Saturday.
 * Weekend and holiday skipping must be added behind this seam in a later PR
 * after product rules and edge parity are explicit.
 */

export type BusinessCalendarId = 'calendar-day';
export type BusinessCalendarDateInput = string | Date;

export interface BusinessCalendar {
 readonly id: BusinessCalendarId;
 /**
  * Checks whether a date is usable by the calendar.
  * @param date - Date input to validate.
  * @returns True when the date is valid and included by this calendar.
  */
 isBusinessDay(date: BusinessCalendarDateInput | null | undefined): boolean;
 /**
  * Adds business days to a date using this calendar's rules.
  * @param date - Starting date.
  * @param amount - Number of business days to add; negative values subtract.
  * @returns Resulting date, or null when the input is invalid.
  */
 addBusinessDays(date: BusinessCalendarDateInput | null | undefined, amount: number): Date | null;
 /**
  * Calculates `later - earlier` in this calendar's business-day units.
  * @param later - Later date input.
  * @param earlier - Earlier date input.
  * @returns Signed business-day difference, or null when either input is invalid.
  */
 diffInBusinessDays(
  later: BusinessCalendarDateInput | null | undefined,
  earlier: BusinessCalendarDateInput | null | undefined,
 ): number | null;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateOnlyParts = (input: string): [number, number, number] | null => {
 const match = DATE_ONLY_RE.exec(input);
 if (!match) return null;
 const [, yearRaw, monthRaw, dayRaw] = match;
 const year = Number(yearRaw);
 const month = Number(monthRaw);
 const day = Number(dayRaw);
 const utc = new Date(Date.UTC(year, month - 1, day));
 if (
  utc.getUTCFullYear() !== year ||
  utc.getUTCMonth() !== month - 1 ||
  utc.getUTCDate() !== day
 ) {
  return null;
 }
 return [year, month, day];
};

const dateOnlyToUtcMidnightMs = (input: string): number | null => {
 const parts = parseDateOnlyParts(input);
 if (!parts) return null;
 const [year, month, day] = parts;
 return Date.UTC(year, month - 1, day);
};

const addUtcDateOnlyDays = (input: string, amount: number): Date | null => {
 const parts = parseDateOnlyParts(input);
 if (!parts) return null;
 const [year, month, day] = parts;
 return new Date(Date.UTC(year, month - 1, day + amount));
};

/**
 * Resolves a business-calendar input to a Date.
 * @param input - Date input to resolve.
 * @returns A valid Date or null when the input is empty/invalid.
 */
const resolveBusinessDate = (input: BusinessCalendarDateInput | null | undefined): Date | null => {
 if (!input) return null;
 if (typeof input === 'string' && DATE_ONLY_RE.test(input)) {
  const utcMidnightMs = dateOnlyToUtcMidnightMs(input);
  return utcMidnightMs === null ? null : new Date(utcMidnightMs);
 }
 const date = typeof input === 'string' ? parseISO(input) : input;
 return isValid(date) ? date : null;
};

export const calendarDayBusinessCalendar: BusinessCalendar = {
 id: 'calendar-day',

 isBusinessDay(date) {
  return resolveBusinessDate(date) !== null;
 },

 addBusinessDays(date, amount) {
  if (typeof date === 'string' && DATE_ONLY_RE.test(date)) {
   return addUtcDateOnlyDays(date, amount);
  }
  const resolved = resolveBusinessDate(date);
  if (!resolved) return null;
  return addDays(resolved, amount);
 },

 diffInBusinessDays(later, earlier) {
  if (
   typeof later === 'string' &&
   typeof earlier === 'string' &&
   DATE_ONLY_RE.test(later) &&
   DATE_ONLY_RE.test(earlier)
  ) {
   const laterMs = dateOnlyToUtcMidnightMs(later);
   const earlierMs = dateOnlyToUtcMidnightMs(earlier);
   if (laterMs === null || earlierMs === null) return null;
   return Math.round((laterMs - earlierMs) / MS_PER_DAY);
  }
  const resolvedLater = resolveBusinessDate(later);
  const resolvedEarlier = resolveBusinessDate(earlier);
  if (!resolvedLater || !resolvedEarlier) return null;
  return differenceInCalendarDays(resolvedLater, resolvedEarlier);
 },
};

export const defaultBusinessCalendar = calendarDayBusinessCalendar;
