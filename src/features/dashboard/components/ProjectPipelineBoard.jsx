import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners, useDroppable, useDraggable } from '@dnd-kit/core';
import { PROJECT_STATUS } from '@/app/constants/index';
import { PROJECT_STATUS_COLORS } from '@/app/constants/colors';
import ProjectCard from '@/features/dashboard/components/ProjectCard';
import { useProjectRealtime } from '@/features/projects/hooks/useProjectRealtime';

const COLUMNS = [
    { id: PROJECT_STATUS.PLANNING, title: 'Planning', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING] },
    { id: PROJECT_STATUS.IN_PROGRESS, title: 'In Progress', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.IN_PROGRESS] },
    { id: PROJECT_STATUS.LAUNCHED, title: 'Launched', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.LAUNCHED] },
    { id: PROJECT_STATUS.PAUSED, title: 'Paused', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PAUSED] },
];

export default function ProjectPipelineBoard({ projects, tasks, teamMembers, onStatusChange }) {
    // Enable Realtime Subscription for the board (global scope or all projects)
    // Since this is a "All Projects" board, we pass null to listen to all tasks we have access to
    // OR we could subscribe to 'tasks' globally.
    useProjectRealtime(); // No specific projectId means listen to all accessible task changes

    const [activeProject, setActiveProject] = useState(null);

    const columns = useMemo(() => {
        // Optimization: Bucketize projects in one pass (O(N)) instead of filtering for every column
        const buckets = projects.reduce((acc, project) => {
            const status = project.status || PROJECT_STATUS.PLANNING;
            if (!acc[status]) acc[status] = [];
            acc[status].push(project);
            return acc;
        }, {});

        return COLUMNS.map(c => ({
            ...c,
            projects: buckets[c.id] || []
        }));
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
        // Always clear active project first to ensure overlay is removed
        setActiveProject(null);

        if (!over) return;

        const projectId = active.id;
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
        <div className="h-full overflow-x-auto pb-4 no-scrollbar">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                accessibility={{
                    screenReaderInstructions: {
                        draggable: "To pick up a project, press space or enter. Use arrow keys to move between columns."
                    }
                }}
            >
                <section className="flex gap-4 h-full w-full overflow-x-hidden pb-4 no-scrollbar">
                    {columns.map((column) => (
                        <PipelineColumn
                            key={column.id}
                            column={column}
                            tasks={tasks}
                            teamMembers={teamMembers}
                        />
                    ))}
                </section>

                {createPortal(
                    <DragOverlay aria-hidden="true">
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

ProjectPipelineBoard.propTypes = {
    projects: PropTypes.array.isRequired,
    tasks: PropTypes.array.isRequired,
    teamMembers: PropTypes.array.isRequired,
    onStatusChange: PropTypes.func.isRequired
};

function PipelineColumn({ column, tasks, teamMembers }) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', status: column.id }
    });

    return (
        <div ref={setNodeRef} className={`flex-1 w-0 min-w-0 flex flex-col h-full rounded-xl bg-slate-50 border border-brand-100/50`}>
            {/* Header */}
            {/* Header */}
            {/* Header */}
            <div className={`p-4 border-b border-transparent rounded-t-xl ${column.headerBg}`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-sm uppercase tracking-wider ${column.headerContent}`}>
                        {column.title}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                        {column.projects.length}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3 no-scrollbar">
                {column.projects.map(project => (
                    <DraggableProjectCard
                        key={project.id}
                        project={project}
                        tasks={tasks}
                        teamMembers={teamMembers}
                    />
                ))}
                {column.projects.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
                        Drop Project Here
                    </div>
                )}
            </div>
        </div>
    );
}

PipelineColumn.propTypes = {
    column: PropTypes.object.isRequired,
    tasks: PropTypes.array.isRequired,
    teamMembers: PropTypes.array.isRequired
};


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
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-xl" aria-label={`Move project ${project.name}`}>
            <ProjectCard
                project={project}
                tasks={tasks.filter(t => t.project_id === project.id)}
                teamMembers={teamMembers.filter(m => m.project_id === project.id)}
            />
        </div>
    );
}

DraggableProjectCard.propTypes = {
    project: PropTypes.object.isRequired,
    tasks: PropTypes.array.isRequired,
    teamMembers: PropTypes.array.isRequired
};
