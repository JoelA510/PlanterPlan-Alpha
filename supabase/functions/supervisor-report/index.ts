import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    dateStringToUtcMidnightMs,
    dateStringToUtcMonthKey,
    toUtcIsoDate,
    toUtcMonthKey,
} from '../_shared/date.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type TaskRow = {
    id: string
    root_id: string | null
    parent_task_id: string | null
    title: string | null
    status: string | null
    is_complete: boolean | null
    due_date: string | null
    updated_at: string | null
    supervisor_email: string | null
}

interface MilestoneSummary {
    id: string
    title: string | null
    due_date: string | null
    status: string | null
    is_complete: boolean | null
    updated_at: string | null
}

interface ProjectReportPayload {
    project_id: string
    project_title: string | null
    supervisor_email: string
    month: string
    completed_this_month: MilestoneSummary[]
    overdue: MilestoneSummary[]
    upcoming_this_month: MilestoneSummary[]
}

interface DispatchResult {
    projects_considered: number
    payloads_built: number
    payloads_logged: number
    payloads_dispatched: number
}

const isMilestoneComplete = (m: { status: string | null; is_complete: boolean | null }): boolean =>
    Boolean(m.is_complete) || m.status === 'completed'

/**
 * Build the per-project report payload for the given month. Mirrors the
 * shape produced by `src/features/projects/hooks/useProjectReports.ts` — if
 * that hook's filtering rules change, update this function too.
 */
function buildProjectPayload(
    root: TaskRow,
    allTasks: TaskRow[],
    monthKey: string,
    todayMidnightMs: number,
): ProjectReportPayload {
    const projectTasks = allTasks.filter((t) => t.root_id === root.id)
    const phaseIds = new Set(
        projectTasks.filter((t) => t.parent_task_id === root.id).map((p) => p.id),
    )

    // Milestones: tasks whose parent is a phase.
    const milestones: MilestoneSummary[] = projectTasks
        .filter((t) => t.parent_task_id !== null && phaseIds.has(t.parent_task_id))
        .map((m) => ({
            id: m.id,
            title: m.title,
            due_date: m.due_date,
            status: m.status,
            is_complete: m.is_complete,
            updated_at: m.updated_at,
        }))

    const completedThisMonth = milestones.filter((m) => {
        if (!isMilestoneComplete(m)) return false
        const dueMonth = dateStringToUtcMonthKey(m.due_date)
        const updatedMonth = dateStringToUtcMonthKey(m.updated_at)
        return dueMonth === monthKey || updatedMonth === monthKey
    })

    const overdue = milestones.filter((m) => {
        if (isMilestoneComplete(m)) return false
        const dueMs = dateStringToUtcMidnightMs(m.due_date)
        if (dueMs === null) return false
        return dueMs < todayMidnightMs
    })

    const upcomingThisMonth = milestones.filter((m) => {
        if (isMilestoneComplete(m)) return false
        const dueMonth = dateStringToUtcMonthKey(m.due_date)
        if (dueMonth !== monthKey) return false
        const dueMs = dateStringToUtcMidnightMs(m.due_date)
        if (dueMs === null) return false
        return dueMs >= todayMidnightMs
    })

    return {
        project_id: root.id,
        project_title: root.title,
        supervisor_email: root.supervisor_email ?? '',
        month: monthKey,
        completed_this_month: completedThisMonth,
        overdue,
        upcoming_this_month: upcomingThisMonth,
    }
}

async function fetchProjectRoots(
    supabase: SupabaseClient,
): Promise<TaskRow[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, root_id, parent_task_id, title, status, is_complete, due_date, updated_at, supervisor_email')
        .is('parent_task_id', null)
        .not('supervisor_email', 'is', null)
    if (error) throw error
    return (data ?? []) as TaskRow[]
}

async function fetchTasksForRoots(
    supabase: SupabaseClient,
    rootIds: string[],
): Promise<TaskRow[]> {
    if (rootIds.length === 0) return []
    const { data, error } = await supabase
        .from('tasks')
        .select('id, root_id, parent_task_id, title, status, is_complete, due_date, updated_at, supervisor_email')
        .in('root_id', rootIds)
    if (error) throw error
    return (data ?? []) as TaskRow[]
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const now = new Date()
        const monthKey = toUtcMonthKey(now)
        const todayMidnightMs =
            dateStringToUtcMidnightMs(toUtcIsoDate(now)) ??
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

        const roots = await fetchProjectRoots(supabase)
        const rootIds = roots.map((r) => r.id)
        const allTasks = await fetchTasksForRoots(supabase, rootIds)

        const providerKey = Deno.env.get('EMAIL_PROVIDER_API_KEY')
        const result: DispatchResult = {
            projects_considered: roots.length,
            payloads_built: 0,
            payloads_logged: 0,
            payloads_dispatched: 0,
        }

        for (const root of roots) {
            if (!root.supervisor_email) continue
            const payload = buildProjectPayload(root, allTasks, monthKey, todayMidnightMs)
            result.payloads_built += 1

            if (providerKey) {
                // TODO(wave-22): wire real email dispatch (Resend/SMTP) here.
                // Intentionally a no-op this wave — provider integration is
                // deferred so the pg_cron -> edge function -> payload shape
                // wiring can ship first without adding an email SDK or a
                // secret requirement. See spec.md §6 Backlog.
                result.payloads_dispatched += 1
            } else {
                console.log('[supervisor-report] log-only payload', JSON.stringify(payload))
                result.payloads_logged += 1
            }
        }

        return new Response(
            JSON.stringify({ success: true, ...result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        // Log the raw error server-side; return a generic message to the
        // caller to avoid leaking stack details.
        console.error('[supervisor-report] unhandled error', error)
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
    }
})
