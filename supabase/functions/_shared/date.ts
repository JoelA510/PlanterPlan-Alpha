// Mirror of src/shared/lib/date-engine helpers kept here because Deno edge
// functions cannot import from the frontend `src/` tree directly. Keep this
// file in lock-step with the frontend utilities — any signature change must
// land in both places.

export const toUtcMonthKey = (d: Date): string => {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

export const toUtcIsoDate = (d: Date): string => {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export const dateStringToUtcMidnightMs = (raw: string | null): number | null => {
    if (!raw) return null
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    // Deterministic UTC midnight via Date.UTC — avoids mutating setters.
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export const dateStringToUtcMonthKey = (raw: string | null): string | null => {
    if (!raw) return null
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7)
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return toUtcMonthKey(d)
}
