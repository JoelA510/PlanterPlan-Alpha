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

/**
 * Resolves a business-calendar input to a Date.
 * @param input - Date input to resolve.
 * @returns A valid Date or null when the input is empty/invalid.
 */
const resolveBusinessDate = (input: BusinessCalendarDateInput | null | undefined): Date | null => {
 if (!input) return null;
 const date = typeof input === 'string' ? parseISO(input) : input;
 return isValid(date) ? date : null;
};

export const calendarDayBusinessCalendar: BusinessCalendar = {
 id: 'calendar-day',

 isBusinessDay(date) {
  return resolveBusinessDate(date) !== null;
 },

 addBusinessDays(date, amount) {
  const resolved = resolveBusinessDate(date);
  if (!resolved) return null;
  return addDays(resolved, amount);
 },

 diffInBusinessDays(later, earlier) {
  const resolvedLater = resolveBusinessDate(later);
  const resolvedEarlier = resolveBusinessDate(earlier);
  if (!resolvedLater || !resolvedEarlier) return null;
  return differenceInCalendarDays(resolvedLater, resolvedEarlier);
 },
};

export const defaultBusinessCalendar = calendarDayBusinessCalendar;
