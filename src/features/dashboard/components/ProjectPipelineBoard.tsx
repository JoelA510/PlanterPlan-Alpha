```
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners, useDroppable, useDraggable } from '@dnd-kit/core';
import ProjectCard from '@/features/dashboard/components/ProjectCard';
import type { Task, Project, TeamMemberRow } from '@/shared/db/app.types';
import { useProjectPipelineLogic } from '../hooks/useProjectPipelineLogic';

interface ProjectPipelineBoardProps {
 projects: Project[];
 tasks: Task[];
 teamMembers: TeamMemberRow[];
 onStatusChange: (projectId: string, status: string) => void;
}

export default function ProjectPipelineBoard({ projects, tasks, teamMembers, onStatusChange }: ProjectPipelineBoardProps) {
  const {
    columns,
    tasksByProjectId,
    teamMembersByProjectId,
    activeProject,
    handleDragStart,
    handleDragEnd
  } = useProjectPipelineLogic(projects, tasks, teamMembers, onStatusChange);

 const sensors = useSensors(
 useSensor(PointerSensor, {
 activationConstraint: {
 distance: 8,
 },
 })
 );

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
 tasksByProjectId={tasksByProjectId}
 teamMembersByProjectId={teamMembersByProjectId}
 />
 ))}
 </section>

 {createPortal(
 <DragOverlay aria-hidden="true">
 {activeProject && (
 <div className="w-[350px] rotate-2 cursor-grabbing">
 <ProjectCard
 project={activeProject}
 tasks={tasksByProjectId[activeProject.id] || []}
 teamMembers={teamMembersByProjectId[activeProject.id] || []}
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

interface PipelineColumnProps {
 column: {
 id: string;
 title: string;
 projects: Project[];
 headerBg?: string;
 headerContent?: string;
 };
 tasksByProjectId: Record<string, Task[]>;
 teamMembersByProjectId: Record<string, TeamMemberRow[]>;
}

function PipelineColumn({ column, tasksByProjectId, teamMembersByProjectId }: PipelineColumnProps) {
 const { setNodeRef } = useDroppable({
 id: column.id,
 data: { type: 'Column', status: column.id }
 });

 return (
 <div ref={setNodeRef} className={`flex-1 w-0 min-w-0 flex flex-col h-full rounded-xl bg-slate-50 border border-brand-100/50`}>
 {/* Header */}
 {/* Header */}
 {/* Header */}
 <div className={`p-4 border-b border-transparent rounded-t-xl ${column.headerBg || ''}`}>
 <div className="flex items-center justify-between">
 <h3 className={`font-bold text-sm uppercase tracking-wider ${column.headerContent || ''}`}>
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
 tasks={tasksByProjectId[project.id] || []}
 teamMembers={teamMembersByProjectId[project.id] || []}
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

interface DraggableProjectCardProps {
 project: Project;
 tasks: Task[];
 teamMembers: TeamMemberRow[];
}

function DraggableProjectCard({ project, tasks, teamMembers }: DraggableProjectCardProps) {
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
 tasks={tasks}
 teamMembers={teamMembers}
 />
 </div>
 );
 }

 return (
 <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-xl" aria-label={`Move project ${project.title}`}>
 <ProjectCard
 project={project}
 tasks={tasks}
 teamMembers={teamMembers}
 />
 </div>
 );
}
