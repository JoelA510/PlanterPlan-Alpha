import RoleIndicator from '@/shared/ui/RoleIndicator';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/shared/lib/utils';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@/shared/ui/ErrorFallback';
import { Lock, Link as LinkIcon, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskStatusSelect from './TaskStatusSelect';
import TaskControlButtons from './TaskControlButtons';
import InlineTaskInput from './InlineTaskInput';

export type { TaskItemData } from '@/shared/types/tasks';
import type { TaskItemData } from '@/shared/types/tasks';

type DragHandleProps = React.HTMLAttributes<HTMLButtonElement> & {
 ref?: React.Ref<HTMLElement>;
};

interface TaskItemProps {
 task: TaskItemData;
 level?: number;
 onTaskClick?: (task: TaskItemData) => void;
 selectedTaskId?: string | null;
 onAddChildTask?: (task: TaskItemData) => void;
 onInviteMember?: (task: TaskItemData) => void;
 onStatusChange?: (id: string, status: string) => void;
 dragHandleProps?: DragHandleProps;
 forceShowChevron?: boolean;
 onToggleExpand?: (task: TaskItemData, expanded: boolean) => void;
 onEdit?: ((task: TaskItemData) => void) | null;
 onDeleteTask?: ((id: string) => void) | null;
 hideExpansion?: boolean;
 disableDrag?: boolean;
 isAddingInline?: boolean;
 onInlineCommit?: (taskId: string, title: string) => void;
 onInlineCancel?: () => void;
}

const TaskItem = ({
 task,
 level = 0,
 onTaskClick,
 selectedTaskId,
 onAddChildTask,
 onInviteMember,
 onStatusChange,
 dragHandleProps = {},
 forceShowChevron = false,
 onToggleExpand,
 onEdit = null,
 onDeleteTask = null,
 hideExpansion = false,
 disableDrag = false,
 isAddingInline = false,
 onInlineCommit,
 onInlineCancel,
}: TaskItemProps) => {
 const hasChildren = task.children && task.children.length > 0;
 const indentWidth = level * 20;
 const isSelected = selectedTaskId === task.id;
 const canHaveChildren = level < 4;

 const isExpanded = !!task.isExpanded;
 const showChevron = !hideExpansion && canHaveChildren && (hasChildren || forceShowChevron);

 // Dnd-kit droppable
 const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
 id: `child-context-${task.id}`,
 data: {
 type: 'container',
 parentId: task.id,
 origin: task.origin,
 },
 });

 const handleCardClick = (e: React.MouseEvent) => {
 const target = e.target as HTMLElement;
 if (
 target.closest('.expand-button') ||
 target.closest('select') ||
 target.closest('button') ||
 target.closest('input')
 ) {
 return;
 }
 if (onTaskClick) {
 onTaskClick(task);
 }
 };

 const handleToggleExpandClick = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (onToggleExpand) {
 onToggleExpand(task, !isExpanded);
 }
 };

 const isLocked = !!task.is_locked;

 return (
 <>
 <div
 className={cn(
 'relative flex flex-col min-w-0 py-4 px-5 mb-3 rounded-xl border transition-all duration-200 shadow-sm',
 'bg-card text-card-foreground',
 isOver && 'ring-2 ring-brand-400 bg-brand-50 z-10',
 isSelected && !isOver
 ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-100'
 : !isOver && 'border-border hover:border-brand-300',
 isLocked && 'opacity-70 bg-muted/30',
 level === 0 && 'border-l-4 border-l-brand-600'
 )}
 style={{ marginLeft: `${indentWidth}px` }}
 onClick={!isLocked ? handleCardClick : undefined}
 data-testid={`task-row-${task.id}`}
 >
 <div className="flex items-center justify-between gap-4">
 <div className="flex-1 flex items-center min-w-0 overflow-hidden">
 {!disableDrag && (
 <button
 className={cn(
 'mr-2 p-1 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing',
 isLocked
 ? 'cursor-not-allowed opacity-30 text-slate-400'
 : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
 )}
 type="button"
 aria-label="Reorder task"
 ref={!isLocked && dragHandleProps.ref ? (dragHandleProps.ref as React.LegacyRef<HTMLButtonElement>) : undefined}
 {...(!isLocked ? (dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>) : {})}
 disabled={isLocked}
 >
 {isLocked ? (
 <Lock className="w-3 h-3" />
 ) : (
 <GripVertical className="w-4 h-4" />
 )}
 </button>
 )}

 {showChevron ? (
 <button
 onClick={handleToggleExpandClick}
 className="expand-button p-1 mr-2 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
 aria-label={isExpanded ? 'Collapse' : 'Expand'}
 >
 <svg
 className={cn(
 'transition-transform duration-200',
 isExpanded ? 'rotate-90' : ''
 )}
 width="16"
 height="16"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <polyline points="9 18 15 12 9 6" />
 </svg>
 </button>
 ) : (
 <div className="w-6 mr-2 flex-shrink-0"></div>
 )}

 <div className="flex items-center gap-3 min-w-0 overflow-hidden">
 <span
 className="font-semibold text-slate-900 text-sm truncate"
 title={task.title}
 >
 {task.title}
 </span>
 {task.duration && (
 <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 whitespace-nowrap flex-shrink-0">
 {task.duration}
 </span>
 )}
 {task.resource_type && (
 <span className="px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded bg-brand-50 text-brand-700 border border-brand-100 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
 <LinkIcon className="w-3 h-3" />
 {task.resource_type}
 </span>
 )}
 </div>
 </div>

 <div className="flex items-center gap-3 flex-shrink-0">
 {task.membership_role && <RoleIndicator role={task.membership_role} />}

 <TaskStatusSelect
 status={task.status}
 taskId={task.id}
 onStatusChange={onStatusChange}
 />

 <TaskControlButtons
 task={task}
 onEdit={() => onEdit?.(task)}
 onAddChild={() => onAddChildTask?.(task)}
 onInvite={() => onInviteMember?.(task)}
 onDelete={onDeleteTask || undefined}
 canHaveChildren={canHaveChildren}
 />
 </div>
 </div>
 </div>

 {canHaveChildren && isExpanded && (
 <div className="pl-0 min-h-[40px]" ref={setDroppableNodeRef}>
 <SortableContext
 items={task.children ? task.children.map((c) => c.id) : []}
 strategy={verticalListSortingStrategy}
 id={`sortable-context-${task.id}`}
 >
 <AnimatePresence mode="popLayout">
 {isAddingInline && onInlineCommit && (
 <motion.div
 layout
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
 className="ml-6 mb-2"
 >
 <InlineTaskInput
 onCommit={(title) => onInlineCommit(task.id, title)}
 onCancel={onInlineCancel || (() => { })}
 level={level + 1}
 />
 </motion.div>
 )}

 {task.children && task.children.length > 0 ? (
 task.children.map((child) => (
 <motion.div
 key={child.id}
 layout
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
 >
 <SortableTaskItem
 task={child}
 level={level + 1}
 onTaskClick={onTaskClick}
 selectedTaskId={selectedTaskId}
 onAddChildTask={onAddChildTask}
 onInviteMember={onInviteMember}
 onStatusChange={onStatusChange}
 onToggleExpand={onToggleExpand}
 onEdit={onEdit}
 onDeleteTask={onDeleteTask ? () => onDeleteTask(child.id) : undefined}
 isAddingInline={child.isAddingInline}
 onInlineCommit={onInlineCommit}
 onInlineCancel={onInlineCancel}
 />
 </motion.div>
 ))
 ) : (
 !isAddingInline && (
 <div className="py-2 px-4 text-xs text-slate-400 italic border-2 border-dashed border-slate-100 rounded-lg ml-6">
 Drop subtasks here
 </div>
 )
 )}
 </AnimatePresence>
 </SortableContext>
 </div>
 )}
 </>
 );
};

interface SortableTaskItemProps extends TaskItemProps {
 task: TaskItemData;
 level: number;
}

export const SortableTaskItem = function SortableTaskItem({ task, level, ...props }: SortableTaskItemProps) {
 const {
 attributes,
 listeners,
 setNodeRef,
 setActivatorNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({
 id: task.id,
 data: {
 type: 'Task',
 origin: task.origin,
 parentId: task.parent_task_id ?? null,
 },
 });

 const style = {
 transform: CSS.Translate.toString(transform),
 transition,
 opacity: isDragging ? 0.4 : 1,
 position: 'relative' as const,
 zIndex: isDragging ? 999 : 'auto',
 };

 return (
 <div
 ref={setNodeRef}
 style={style}
 className={cn(
 'transition-shadow duration-200',
 isDragging && 'shadow-xl rounded-xl z-50'
 )}
 >
 <ErrorBoundary
 FallbackComponent={(props) => <ErrorFallback error={props.error instanceof Error ? props.error : new Error(String(props.error))} resetErrorBoundary={props.resetErrorBoundary} />}
 onReset={() => window.location.reload()}
 >
 <TaskItem
 task={task}
 level={level}
 dragHandleProps={{ ...attributes, ...listeners, ref: setActivatorNodeRef }}
 {...props}
 />
 </ErrorBoundary>
 </div>
 );
};

TaskItem.displayName = '@/features/tasks/components/TaskItem';

export default TaskItem;
