import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewMode } from 'gantt-task-react';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { tasksToGanttRows } from '@/features/gantt/lib/gantt-adapter';
import { ProjectGantt, type GanttZoom } from '@/features/gantt/components/ProjectGantt';
import { useGanttDragShift } from '@/features/gantt/hooks/useGanttDragShift';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import type { HierarchyTask } from '@/shared/db/app.types';

export default function Gantt() {
    const [searchParams, setSearchParams] = useSearchParams();
    const projectId = searchParams.get('projectId');

    const { data: dashboard } = useDashboard();
    const activeProjects = dashboard.activeProjects;

    const [zoom, setZoom] = useState<GanttZoom>(ViewMode.Week);
    const [includeLeafTasks, setIncludeLeafTasks] = useState(false);

    const { projectHierarchy } = useProjectData(projectId);
    const hierarchyTasks = projectHierarchy as unknown as HierarchyTask[];

    const { rows, skippedCount } = useMemo(
        () => tasksToGanttRows(hierarchyTasks, { includeLeafTasks }),
        [hierarchyTasks, includeLeafTasks],
    );

    const onShiftDates = useGanttDragShift({
        projectId: projectId ?? '',
        tasks: hierarchyTasks,
    });

    if (!projectId) {
        return (
            <div className="flex flex-col gap-4 p-6">
                <h1 className="text-2xl font-semibold text-slate-900">Gantt Chart</h1>
                <p className="text-sm text-slate-600">Pick a project to render its timeline.</p>
                {activeProjects.length === 0 ? (
                    <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        No active projects yet.
                    </p>
                ) : (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="gantt-project-picker" className="text-sm text-slate-600">Project</Label>
                        <Select
                            onValueChange={(id) => {
                                setSearchParams({ projectId: id });
                            }}
                        >
                            <SelectTrigger id="gantt-project-picker" className="w-80">
                                <SelectValue placeholder="Select a project…" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeProjects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.title ?? '(untitled project)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Gantt Chart</h1>
            <ProjectGantt
                rows={rows}
                skippedCount={skippedCount}
                zoom={zoom}
                onZoomChange={setZoom}
                includeLeafTasks={includeLeafTasks}
                onIncludeLeafTasksChange={setIncludeLeafTasks}
                onShiftDates={onShiftDates}
            />
        </div>
    );
}
