import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { PROJECT_STATUS } from '@app/constants/index';
import { PROJECT_STATUS_COLORS } from '@app/constants/colors';
import ProjectCard from '@features/dashboard/components/ProjectCard';
import BoardColumn from '@features/tasks/components/board/BoardColumn'; // Reusing generic column layout if possible, or creating new
// Actually, BoardColumn expects specific task props. Let's make a ProjectBoardColumn or custom generic layout.
// For speed, let's create a local column component or generic one.

const COLUMNS = [
    { id: PROJECT_STATUS.PLANNING, title: 'Planning', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING] },
    { id: PROJECT_STATUS.IN_PROGRESS, title: 'In Progress', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.IN_PROGRESS] },
    { id: PROJECT_STATUS.LAUNCHED, title: 'Launched', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.LAUNCHED] },
    { id: PROJECT_STATUS.PAUSED, title: 'Paused', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PAUSED] },
];

export default function ProjectPipelineBoard({ projects, tasks, teamMembers, onStatusChange }) {
    const [activeProject, setActiveProject] = useState(null);

    const columns = useMemo(() => {
        const cols = COLUMNS.map(c => ({
            ...c,
            projects: projects.filter(p => (p.status || PROJECT_STATUS.PLANNING) === c.id)
        }));
        return cols;
    }, [projects]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        const project = projects.find(p => p.id === active.id);
        setActiveProject(project);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveProject(null);

        if (!over) return;

        const projectId = active.id;
        // Find dropped column
        // The drop target could be a column OR another project in that column.

        // We assume the over.id is either a column ID or a project ID.
        // However, clean dnd-kit usage usually has column droppables.

        // Let's check if over.data.current has generic data if we added it?
        // Or just find generic id match.

        let newStatus = null;

        if (Object.values(PROJECT_STATUS).includes(over.id)) {
            newStatus = over.id;
        } else {
            // It's a project item, find its status
            const overProject = projects.find(p => p.id === over.id);
            if (overProject) {
                newStatus = overProject.status || PROJECT_STATUS.PLANNING;
            }
        }

        if (newStatus) {
            // Only trigger update if status changed
            const currentProject = projects.find(p => p.id === projectId);
            if (currentProject && (currentProject.status || PROJECT_STATUS.PLANNING) !== newStatus) {
                onStatusChange(projectId, newStatus);
            }
        }
    };

    return (
        <div className="h-full overflow-x-auto pb-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 h-full min-w-[1000px]">
                    {columns.map((column) => (
                        <PipelineColumn
                            key={column.id}
                            column={column}
                            tasks={tasks}
                            teamMembers={teamMembers}
                        />
                    ))}
                </div>

                {createPortal(
                    <DragOverlay>
                        {activeProject && (
                            <div className="w-[350px] rotate-2 cursor-grabbing">
                                <ProjectCard
                                    project={activeProject}
                                    tasks={tasks.filter(t => t.project_id === activeProject.id)}
                                    teamMembers={teamMembers.filter(m => m.project_id === activeProject.id)}
                                    isOverlay
                                />
                            </div>
                        )}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    );
}

// Sub-component for Column
import { useDroppable } from '@dnd-kit/core';

function PipelineColumn({ column, tasks, teamMembers }) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', status: column.id }
    });

    return (
        <div ref={setNodeRef} className="flex-1 flex flex-col min-w-[300px] h-full rounded-xl bg-slate-50/50 border border-slate-200/60">
            {/* Header */}
            <div className={`p-4 border-b ${column.border} bg-white rounded-t-xl`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm uppercase tracking-wider ${column.text}`}>
                        {column.title}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {column.projects.length}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {column.projects.map(project => (
                    <DraggableProjectCard
                        key={project.id}
                        project={project}
                        tasks={tasks}
                        teamMembers={teamMembers}
                    />
                ))}
                {column.projects.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                        Drop Project Here
                    </div>
                )}
            </div>
        </div>
    );
}

import { useDraggable } from '@dnd-kit/core';

function DraggableProjectCard({ project, tasks, teamMembers }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: project.id,
        data: { type: 'Project', project }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style} className="opacity-30 grayscale">
                <ProjectCard
                    project={project}
                    tasks={tasks.filter(t => t.project_id === project.id)}
                    teamMembers={teamMembers.filter(m => m.project_id === project.id)}
                />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none">
            <ProjectCard
                project={project}
                tasks={tasks.filter(t => t.project_id === project.id)}
                teamMembers={teamMembers.filter(m => m.project_id === project.id)}
            />
        </div>
    );
}
