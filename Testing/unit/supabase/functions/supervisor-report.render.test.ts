import { describe, it, expect } from 'vitest';
import {
    renderSupervisorReportEmail,
    type MilestoneSummary,
    type ProjectReportPayload,
} from '../../../../supabase/functions/_shared/email';

function makeMilestone(overrides: Partial<MilestoneSummary> = {}): MilestoneSummary {
    return {
        id: 'm-1',
        title: 'Milestone',
        due_date: '2026-04-15',
        status: null,
        is_complete: null,
        updated_at: null,
        ...overrides,
    };
}

function makePayload(overrides: Partial<ProjectReportPayload> = {}): ProjectReportPayload {
    return {
        project_id: 'p-1',
        project_title: 'Test Project',
        supervisor_email: 'bishop@example.com',
        month: '2026-04',
        completed_this_month: [],
        overdue: [],
        upcoming_this_month: [],
        ...overrides,
    };
}

describe('renderSupervisorReportEmail', () => {
    it('includes project title and month in the subject', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({ project_title: 'Pilsen Plant', month: '2026-04' }),
        );
        expect(rendered.subject).toContain('Pilsen Plant');
        expect(rendered.subject).toContain('2026-04');
    });

    it('falls back to "Untitled project" when the project has no title', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({ project_title: null }),
        );
        expect(rendered.subject).toContain('Untitled project');
    });

    it('renders every section with its items in the text body', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({
                completed_this_month: [makeMilestone({ id: 'c1', title: 'Baptism service' })],
                overdue: [makeMilestone({ id: 'o1', title: 'Core team training', due_date: '2026-03-01' })],
                upcoming_this_month: [makeMilestone({ id: 'u1', title: 'Launch Sunday' })],
            }),
        );

        expect(rendered.text).toContain('Completed this month');
        expect(rendered.text).toContain('Baptism service');
        expect(rendered.text).toContain('Overdue');
        expect(rendered.text).toContain('Core team training');
        expect(rendered.text).toContain('2026-03-01');
        expect(rendered.text).toContain('Upcoming this month');
        expect(rendered.text).toContain('Launch Sunday');
    });

    it('marks empty sections as "none" rather than omitting them', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({
                completed_this_month: [makeMilestone({ title: 'Baptism service' })],
            }),
        );
        expect(rendered.text).toContain('Overdue: none');
        expect(rendered.text).toContain('Upcoming this month: none');
    });

    it('produces a non-empty text body even when every section is empty', () => {
        const rendered = renderSupervisorReportEmail(makePayload());
        expect(rendered.text.length).toBeGreaterThan(0);
        expect(rendered.text).toContain('No milestone activity');
        expect(rendered.subject.length).toBeGreaterThan(0);
    });

    it('escapes HTML-significant characters in titles', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({
                completed_this_month: [makeMilestone({ title: '<script>x</script>' })],
            }),
        );
        expect(rendered.html).not.toContain('<script>x</script>');
        expect(rendered.html).toContain('&lt;script&gt;');
    });

    it('uses the Untitled milestone fallback when a title is blank', () => {
        const rendered = renderSupervisorReportEmail(
            makePayload({
                overdue: [makeMilestone({ title: null })],
            }),
        );
        expect(rendered.text).toContain('Untitled milestone');
    });

    it('is deterministic for the same input', () => {
        const input = makePayload({
            completed_this_month: [makeMilestone({ id: 'c1', title: 'A' })],
        });
        expect(renderSupervisorReportEmail(input)).toEqual(renderSupervisorReportEmail(input));
    });
});
