// Shared email dispatch + rendering helpers for Supabase Edge Functions.
//
// Wave 22: wires real dispatch through Resend for the supervisor-report
// function. `sendEmail` sanitizes upstream errors before returning (mirrors
// the pattern in `supervisor-report/index.ts:193-201`). Rendering is kept
// pure so it can be unit-tested without hitting the network.

export interface MilestoneSummary {
    id: string
    title: string | null
    due_date: string | null
    status: string | null
    is_complete: boolean | null
    updated_at: string | null
}

export interface ProjectReportPayload {
    project_id: string
    project_title: string | null
    supervisor_email: string
    month: string
    completed_this_month: MilestoneSummary[]
    overdue: MilestoneSummary[]
    upcoming_this_month: MilestoneSummary[]
}

export interface SendEmailInput {
    to: string
    subject: string
    html: string
    text: string
}

export interface SendEmailResult {
    ok: boolean
    id?: string
    error?: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * POST a single transactional email via Resend. The return value never
 * contains raw upstream response bodies — the caller gets a boolean plus a
 * sanitized error string. Full response details are logged server-side.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY')
    const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS')

    if (!apiKey || !fromAddress) {
        console.error('[email] missing EMAIL_PROVIDER_API_KEY or RESEND_FROM_ADDRESS')
        return { ok: false, error: 'Email provider not configured' }
    }

    try {
        const res = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: input.to,
                subject: input.subject,
                html: input.html,
                text: input.text,
            }),
        })

        if (!res.ok) {
            // Consume the body for logging, but never return it to the caller.
            const raw = await res.text().catch(() => '<unreadable>')
            console.error('[email] dispatch failed', res.status, raw)
            return { ok: false, error: 'Email dispatch failed' }
        }

        const data = (await res.json().catch(() => ({}))) as { id?: string }
        return { ok: true, id: data.id }
    } catch (error) {
        console.error('[email] network error', error)
        return { ok: false, error: 'Email dispatch failed' }
    }
}

// ----------------------------------------------------------------------------
// Pure rendering (unit-testable)
// ----------------------------------------------------------------------------

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function displayTitle(m: MilestoneSummary): string {
    return m.title?.trim() || 'Untitled milestone'
}

function renderTextSection(heading: string, milestones: MilestoneSummary[]): string {
    if (milestones.length === 0) return `${heading}: none`
    const lines = milestones.map((m) => {
        const due = m.due_date ? ` (due ${m.due_date})` : ''
        return `  - ${displayTitle(m)}${due}`
    })
    return `${heading} (${milestones.length}):\n${lines.join('\n')}`
}

function renderHtmlSection(heading: string, milestones: MilestoneSummary[]): string {
    if (milestones.length === 0) {
        return `<h3>${escapeHtml(heading)}</h3><p><em>None</em></p>`
    }
    const items = milestones
        .map((m) => {
            const due = m.due_date ? ` <span style="color:#64748b">(due ${escapeHtml(m.due_date)})</span>` : ''
            return `<li>${escapeHtml(displayTitle(m))}${due}</li>`
        })
        .join('')
    return `<h3>${escapeHtml(heading)} (${milestones.length})</h3><ul>${items}</ul>`
}

export interface RenderedEmail {
    subject: string
    html: string
    text: string
}

/**
 * Build the subject + HTML + plain-text body for a supervisor monthly
 * report. Pure: same input always produces the same output. Keep the payload
 * shape in sync with `src/features/projects/hooks/useProjectReports.ts` and
 * with `supervisor-report/index.ts:buildProjectPayload`.
 */
export function renderSupervisorReportEmail(payload: ProjectReportPayload): RenderedEmail {
    const projectName = payload.project_title?.trim() || 'Untitled project'
    const subject = `Project Status Report — ${projectName} — ${payload.month}`

    const { completed_this_month, overdue, upcoming_this_month } = payload
    const hasAny =
        completed_this_month.length + overdue.length + upcoming_this_month.length > 0

    const intro = hasAny
        ? `Here is the monthly project status report for ${projectName} (${payload.month}).`
        : `No milestone activity to report for ${projectName} this month (${payload.month}).`

    const text = [
        intro,
        '',
        renderTextSection('Completed this month', completed_this_month),
        '',
        renderTextSection('Overdue', overdue),
        '',
        renderTextSection('Upcoming this month', upcoming_this_month),
    ].join('\n')

    const html = [
        `<p>${escapeHtml(intro)}</p>`,
        renderHtmlSection('Completed this month', completed_this_month),
        renderHtmlSection('Overdue', overdue),
        renderHtmlSection('Upcoming this month', upcoming_this_month),
    ].join('')

    return { subject, html, text }
}
