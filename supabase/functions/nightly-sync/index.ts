import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface SyncResult {
    overdue: number
    due_soon: number
    overdue_ids: string[]
    due_soon_ids: string[]
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

        const result: SyncResult = {
            overdue: overdueIds.length,
            due_soon: dueSoonIds.length,
            overdue_ids: overdueIds,
            due_soon_ids: dueSoonIds,
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
