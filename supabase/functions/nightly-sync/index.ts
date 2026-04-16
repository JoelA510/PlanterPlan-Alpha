import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isRecurrenceRule, shouldFireRecurrenceOn, RecurrenceRule } from '../_shared/recurrence.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_DUE_SOON_THRESHOLD_DAYS = 3

type TaskRow = {
    id: string
    root_id: string | null
    due_date: string | null
    status: string | null
    is_complete: boolean | null
    settings: Record<string, unknown> | null
}

type TemplateRow = {
    id: string
    creator: string | null
    settings: Record<string, unknown> | null
}

interface SyncResult {
    overdue: number
    due_soon: number
    recurrence_spawned: number
    recurrence_skipped: number
    overdue_ids: string[]
    due_soon_ids: string[]
    recurrence_spawned_ids: string[]
}

/**
 * Build a map of rootId → due_soon_threshold days by loading the project root
 * tasks referenced by `rootIds`. Falls back to DEFAULT_DUE_SOON_THRESHOLD_DAYS
 * for any root whose settings don't explicitly set a threshold.
 */
async function loadThresholds(
    supabase: SupabaseClient,
    rootIds: string[],
): Promise<Map<string, number>> {
    const unique = Array.from(new Set(rootIds.filter(Boolean)))
    const map = new Map<string, number>()
    if (unique.length === 0) return map

    const { data, error } = await supabase
        .from('tasks')
        .select('id, settings')
        .in('id', unique)
    if (error) throw error

    for (const row of (data ?? []) as Array<{ id: string; settings: Record<string, unknown> | null }>) {
        let threshold = DEFAULT_DUE_SOON_THRESHOLD_DAYS
        const s = row.settings
        if (s && typeof s === 'object' && !Array.isArray(s)) {
            const raw = (s as Record<string, unknown>).due_soon_threshold
            const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
            if (Number.isFinite(n) && n >= 0) threshold = Math.floor(n)
        }
        map.set(row.id, threshold)
    }
    return map
}

/**
 * Returns the ISO date (YYYY-MM-DD) of the given UTC moment — used as both
 * the spawn's `start_date`/`due_date` and the idempotency key.
 */
const toUtcIsoDate = (d: Date): string => {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/**
 * Recurrence-clone pass. For each template task with a valid `settings.recurrence`
 * rule that fires today, clone the template into the configured target project
 * as an instance task. The clone stamps `settings.spawnedFromTemplate` +
 * `settings.spawnedOn` so a same-day re-run is a no-op.
 */
async function runRecurrencePass(
    supabase: SupabaseClient,
    nowUtc: Date,
    nowIso: string,
): Promise<{ spawnedIds: string[]; skipped: number }> {
    const todayIso = toUtcIsoDate(nowUtc)
    const spawnedIds: string[] = []
    let skipped = 0

    // Pull candidate templates. JSONB filter: `settings -> 'recurrence'` is not null.
    const { data, error } = await supabase
        .from('tasks')
        .select('id, creator, settings')
        .eq('origin', 'template')
        .not('settings->recurrence', 'is', null)
    if (error) throw error

    const templates = (data ?? []) as TemplateRow[]
    for (const tmpl of templates) {
        const rule = (tmpl.settings ?? {}).recurrence as unknown
        if (!isRecurrenceRule(rule)) continue
        const valid = rule as RecurrenceRule

        if (!shouldFireRecurrenceOn(valid, nowUtc)) continue

        // Idempotency: skip if we already spawned this template into this
        // target on this UTC day.
        const { data: existing, error: existErr } = await supabase
            .from('tasks')
            .select('id')
            .eq('origin', 'instance')
            .eq('parent_task_id', valid.targetProjectId)
            .eq('settings->>spawnedFromTemplate', tmpl.id)
            .eq('settings->>spawnedOn', todayIso)
            .limit(1)
        if (existErr) throw existErr
        if ((existing ?? []).length > 0) {
            skipped += 1
            continue
        }

        // Deep-clone via the existing RPC, then stamp provenance on the root.
        const { data: cloned, error: cloneErr } = await supabase.rpc('clone_project_template', {
            p_template_id: tmpl.id,
            p_new_parent_id: valid.targetProjectId,
            p_new_origin: 'instance',
            p_user_id: tmpl.creator,
            p_start_date: todayIso,
            p_due_date: todayIso,
        })
        if (cloneErr) {
            console.error('[nightly-sync] recurrence clone failed', { templateId: tmpl.id, cloneErr })
            continue
        }

        // The RPC returns the cloned root id (jsonb). Stamp provenance so the
        // next run can short-circuit via the idempotency check above.
        const clonedId = typeof cloned === 'string'
            ? cloned
            : (cloned && typeof cloned === 'object' && 'id' in cloned ? (cloned as { id: string }).id : null)
        if (clonedId) {
            const { error: stampErr } = await supabase
                .from('tasks')
                .update({
                    settings: { spawnedFromTemplate: tmpl.id, spawnedOn: todayIso },
                    updated_at: nowIso,
                })
                .eq('id', clonedId)
            if (stampErr) {
                console.error('[nightly-sync] recurrence stamp failed', { clonedId, stampErr })
                continue
            }
            spawnedIds.push(clonedId)
        }
    }

    return { spawnedIds, skipped }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const nowIso = new Date().toISOString()

        // 1. Transition past-due, incomplete tasks to 'overdue'.
        const { data: overdueRows, error: overdueErr } = await supabase
            .from('tasks')
            .update({ status: 'overdue', updated_at: nowIso })
            .lt('due_date', nowIso)
            .neq('status', 'completed')
            .neq('status', 'overdue')
            .eq('is_complete', false)
            .select('id')
        if (overdueErr) throw overdueErr

        const overdueIds = (overdueRows ?? []).map((r: { id: string }) => r.id)

        // 2. Transition tasks due within their project's due_soon threshold to 'due_soon'.
        //    Candidate set: not complete, due_date >= now, status not already terminal/overdue/due_soon.
        const { data: candidates, error: candErr } = await supabase
            .from('tasks')
            .select('id, root_id, due_date, status, is_complete, settings')
            .gte('due_date', nowIso)
            .eq('is_complete', false)
            .not('status', 'in', '("completed","overdue","due_soon")')
        if (candErr) throw candErr

        const candidateRows = (candidates ?? []) as TaskRow[]
        const rootIds = candidateRows
            .map((r) => r.root_id)
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
        const thresholds = await loadThresholds(supabase, rootIds)

        const nowMs = new Date(nowIso).getTime()
        const dueSoonIds: string[] = []
        for (const row of candidateRows) {
            if (!row.due_date) continue
            const threshold = row.root_id
                ? thresholds.get(row.root_id) ?? DEFAULT_DUE_SOON_THRESHOLD_DAYS
                : DEFAULT_DUE_SOON_THRESHOLD_DAYS
            const dueMs = new Date(row.due_date).getTime()
            if (Number.isNaN(dueMs)) continue
            const cutoffMs = nowMs + threshold * 24 * 60 * 60 * 1000
            if (dueMs <= cutoffMs) dueSoonIds.push(row.id)
        }

        if (dueSoonIds.length > 0) {
            const { error: updateErr } = await supabase
                .from('tasks')
                .update({ status: 'due_soon', updated_at: nowIso })
                .in('id', dueSoonIds)
            if (updateErr) throw updateErr
        }

        // 3. Recurrence pass: clone matching template tasks into their target
        //    project roots. Idempotent — if an instance already exists for
        //    (template, target, today) we skip the spawn.
        const recurrence = await runRecurrencePass(supabase, new Date(nowIso), nowIso)

        const result: SyncResult = {
            overdue: overdueIds.length,
            due_soon: dueSoonIds.length,
            recurrence_spawned: recurrence.spawnedIds.length,
            recurrence_skipped: recurrence.skipped,
            overdue_ids: overdueIds,
            due_soon_ids: dueSoonIds,
            recurrence_spawned_ids: recurrence.spawnedIds,
        }

        return new Response(
            JSON.stringify({ success: true, ...result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return new Response(
            JSON.stringify({ success: false, error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
    }
})
