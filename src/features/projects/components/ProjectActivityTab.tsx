import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { formatDisplayDate } from '@/shared/lib/date-engine';
import { useProjectActivity } from '@/features/projects/hooks/useProjectActivity';
import { ActivityRow } from './ActivityRow';
import type { ActivityLogWithActor } from '@/shared/db/app.types';

interface ProjectActivityTabProps {
    projectId: string | null;
}

type Filter = 'all' | 'task' | 'comment' | 'member';

const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'task', label: 'Tasks' },
    { key: 'comment', label: 'Comments' },
    { key: 'member', label: 'Members' },
];

function dayLabel(isoString: string): string {
    const today = new Date();
    const rowDay = new Date(isoString);
    const sameDay = (a: Date, b: Date): boolean =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    if (sameDay(rowDay, today)) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (sameDay(rowDay, yesterday)) return 'Yesterday';
    return formatDisplayDate(isoString);
}

function groupByDay(rows: ActivityLogWithActor[]): Array<{ day: string; rows: ActivityLogWithActor[] }> {
    const out: Array<{ day: string; rows: ActivityLogWithActor[] }> = [];
    const byDay = new Map<string, ActivityLogWithActor[]>();
    for (const r of rows) {
        const key = dayLabel(r.created_at);
        const list = byDay.get(key);
        if (list) list.push(r);
        else {
            const fresh: ActivityLogWithActor[] = [r];
            byDay.set(key, fresh);
            out.push({ day: key, rows: fresh });
        }
    }
    return out;
}

export default function ProjectActivityTab({ projectId }: ProjectActivityTabProps) {
    const [limit, setLimit] = useState(50);
    const [filter, setFilter] = useState<Filter>('all');
    const { data: rows = [], isLoading } = useProjectActivity(projectId, { limit });

    // Client-side filter — never re-runs the query.
    const visible = useMemo(
        () => (filter === 'all' ? rows : rows.filter((r) => r.entity_type === filter)),
        [rows, filter],
    );
    const groups = useMemo(() => groupByDay(visible), [visible]);

    return (
        <div className="detail-section" data-testid="project-activity-tab">
            <div className="flex flex-wrap gap-2 mb-4">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        data-testid={`activity-filter-${f.key}`}
                        data-active={filter === f.key ? 'true' : 'false'}
                        className={
                            filter === f.key
                                ? 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-brand-600 text-white border-brand-600'
                                : 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                {isLoading ? (
                    <p className="text-sm text-slate-500" data-testid="activity-loading">
                        Loading activity…
                    </p>
                ) : visible.length === 0 ? (
                    <p className="text-sm text-slate-500" data-testid="activity-empty">
                        No activity yet — create a task or invite a teammate to get started.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {groups.map((g) => (
                            <div key={g.day} data-testid={`activity-day-${g.day}`}>
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {g.day}
                                </h4>
                                <div className="divide-y divide-slate-100">
                                    {g.rows.map((r) => (
                                        <ActivityRow key={r.id} row={r} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {rows.length >= limit && (
                    <div className="pt-4 border-t border-slate-100 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setLimit((n) => n + 50)}
                            data-testid="activity-load-older"
                        >
                            Load older
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
