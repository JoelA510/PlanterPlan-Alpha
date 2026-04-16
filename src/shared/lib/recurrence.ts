import type { RecurrenceRule } from '@/shared/db/app.types';

/**
 * Evaluates whether a recurrence rule fires on the given date (UTC).
 *
 * All time-math is UTC so the frontend and the Deno edge function agree.
 * Weekly: matches `weekday` (0 = Sun … 6 = Sat).
 * Monthly: matches `dayOfMonth` (1..28 — capped at 28 to sidestep Feb/leap edge cases).
 */
export function shouldFireRecurrenceOn(rule: RecurrenceRule, nowUtc: Date): boolean {
    if (rule.kind === 'weekly') {
        return nowUtc.getUTCDay() === rule.weekday;
    }
    return nowUtc.getUTCDate() === rule.dayOfMonth;
}

/** Runtime guard — safe for parsing `settings.recurrence` read from the DB. */
export function isRecurrenceRule(value: unknown): value is RecurrenceRule {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (typeof v.targetProjectId !== 'string' || v.targetProjectId.length === 0) return false;
    if (v.kind === 'weekly') {
        return typeof v.weekday === 'number' && v.weekday >= 0 && v.weekday <= 6;
    }
    if (v.kind === 'monthly') {
        return typeof v.dayOfMonth === 'number' && v.dayOfMonth >= 1 && v.dayOfMonth <= 28;
    }
    return false;
}
