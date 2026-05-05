import {
    addDaysToIsoDate,
    dateStringToUtcMidnightMs,
    toUtcIsoDate,
} from './date.ts'

// Deno mirror of the frontend business-calendar seam. PR I1 intentionally
// preserves calendar-day behavior: every valid date is a business day.

export type BusinessCalendarId = 'calendar-day'

export interface BusinessCalendar {
    readonly id: BusinessCalendarId
    /**
     * Checks whether an ISO date/timestamp is usable by the calendar.
     * @param isoDate - ISO date or timestamp to validate.
     * @returns True when the input is valid and included by this calendar.
     */
    isBusinessDay(isoDate: string | null | undefined): boolean
    /**
     * Adds business days to an ISO date/timestamp using this calendar's rules.
     * @param isoDate - Starting ISO date or timestamp.
     * @param amount - Number of business days to add; negative values subtract.
     * @returns Resulting YYYY-MM-DD date, or null when the input is invalid.
     */
    addBusinessDays(isoDate: string | null | undefined, amount: number): string | null
    /**
     * Calculates `later - earlier` in this calendar's business-day units.
     * @param later - Later ISO date or timestamp.
     * @param earlier - Earlier ISO date or timestamp.
     * @returns Signed business-day difference, or null when either input is invalid.
     */
    diffInBusinessDays(
        later: string | null | undefined,
        earlier: string | null | undefined,
    ): number | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Normalizes an ISO date/timestamp to a UTC YYYY-MM-DD date.
 * @param raw - ISO date or timestamp to normalize.
 * @returns UTC date-only string, or null when the input is invalid.
 */
const normalizeToUtcIsoDate = (raw: string | null | undefined): string | null => {
    const midnightMs = dateStringToUtcMidnightMs(raw ?? null)
    if (midnightMs === null) return null
    return toUtcIsoDate(new Date(midnightMs))
}

export const calendarDayBusinessCalendar: BusinessCalendar = {
    id: 'calendar-day',

    isBusinessDay(isoDate) {
        return dateStringToUtcMidnightMs(isoDate ?? null) !== null
    },

    addBusinessDays(isoDate, amount) {
        const normalized = normalizeToUtcIsoDate(isoDate)
        if (!normalized) return null
        return addDaysToIsoDate(normalized, amount)
    },

    diffInBusinessDays(later, earlier) {
        const laterMs = dateStringToUtcMidnightMs(later ?? null)
        const earlierMs = dateStringToUtcMidnightMs(earlier ?? null)
        if (laterMs === null || earlierMs === null) return null
        return Math.round((laterMs - earlierMs) / MS_PER_DAY)
    },
}

export const defaultBusinessCalendar = calendarDayBusinessCalendar
