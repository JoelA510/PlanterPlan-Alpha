import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { TaskRow, TaskUpdate, Project } from '@/shared/db/app.types';
import { planter } from '@/shared/api/planterClient';
import TaskItem from '@/features/tasks/components/TaskItem';
import { Loader2, List, LayoutGrid } from 'lucide-react';
import ProjectBoardView from '@/features/tasks/components/board/ProjectBoardView';
import {
       useTaskFilters,
       FILTER_LABELS,
       EMPTY_STATE_COPY,
       type TaskFilterKey,
       type TaskSortKey,
} from '@/features/tasks/hooks/useTaskFilters';
import {
       Select,
       SelectContent,
       SelectItem,
       SelectTrigger,
       SelectValue,
} from '@/shared/ui/select';

export default function TasksPage() {
       const queryClient = useQueryClient();
       const { data: tasks = [], isLoading: loading } = useQuery({
              queryKey: ['tasks'],
              queryFn: () => planter.entities.Task.list(),
       });

       const findTask = useCallback((id: string) => tasks.find((t: TaskRow) => t.id === id), [tasks]);
       const invalidateTasks = useCallback(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }), [queryClient]);

       // State for View Mode
       const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'
       const [filter, setFilter] = useState<TaskFilterKey>('my_tasks');
       const [sort, setSort] = useState<TaskSortKey>('chronological');

       const updateTask = useCallback(
              async (taskId: string, updates: Record<string, unknown>) => {
                     try {
                            const task = findTask(taskId);
                            const oldParentId = task ? task.parent_task_id : null;

                            await planter.entities.Task.update(taskId, updates as TaskUpdate);
                            await invalidateTasks();

                            if (task && task.origin === 'instance') {
                                   const parentUpdates = new Set<string>();
                                   if ((updates.start_date !== undefined || updates.due_date !== undefined) && task.parent_task_id) {
                                          parentUpdates.add(task.parent_task_id);
                                   }
                                   if (updates.parent_task_id !== undefined && updates.parent_task_id !== oldParentId) {
                                          if (oldParentId) parentUpdates.add(oldParentId);
                                          if (updates.parent_task_id) parentUpdates.add(updates.parent_task_id as string);
                                   }
                                   for (const pId of parentUpdates) {
                                          await planter.entities.Task.updateParentDates(pId);
                                   }
                                   await invalidateTasks();
                            }
                     } catch (error) {
                            console.error('Error updating task:', error);
                            throw error;
                     }
              },
              [findTask, invalidateTasks]
       );

       const handleStatusChange = useCallback((id: string, status: string) => {
              updateTask(id, { status });
       }, [updateTask]);
       const handleNoop = useCallback(() => { }, []);

       const visibleTasks = useTaskFilters({ tasks, filter, sort });

       const sensors = useSensors(
              useSensor(PointerSensor, {
                     activationConstraint: {
                            distance: 5,
                     },
              }),
              useSensor(KeyboardSensor, {
                     coordinateGetter: sortableKeyboardCoordinates,
              })
       );

       // Drag End Handler for Board View
       const handleDragEnd = (event: DragEndEvent) => {
              const { active, over } = event;

              if (!over) return;

              const activeId = active.id;
              const overData = over.data.current;

              // We can drop on a Column (container) OR a Task. 
              // Both should have the 'status' property in their data.
              if (overData && overData.status) {
                     const newStatus = overData.status;
                     const task = findTask(activeId as string);

                     if (task && task.status !== newStatus) {
                            updateTask(activeId as string, { status: newStatus });
                     }
              }
       };

       if (loading) {
              return (
                     <>
                            <div className="flex justify-center py-20">
                                   <Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                     </>
              );
       }

       return (
              <>
                     <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragEnd={handleDragEnd}
                     >
                            <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
                                   <div className="flex-none max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                                          <div className="flex flex-col gap-6 mb-8 md:flex-row md:items-end md:justify-between">
                                                 <div>
                                                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{FILTER_LABELS[filter]}</h1>
                                                        <p className="text-muted-foreground mt-1">Review and manage your assignments across all projects</p>
                                                 </div>

                                                 <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex flex-col gap-1">
                                                               <label htmlFor="task-filter" className="text-xs font-medium text-muted-foreground">View</label>
                                                               <Select value={filter} onValueChange={(v) => setFilter(v as TaskFilterKey)}>
                                                                      <SelectTrigger id="task-filter" className="w-[180px] bg-card" aria-label="Task view">
                                                                             <SelectValue />
                                                                      </SelectTrigger>
                                                                      <SelectContent>
                                                                             {(Object.keys(FILTER_LABELS) as TaskFilterKey[]).map((key) => (
                                                                                    <SelectItem key={key} value={key}>{FILTER_LABELS[key]}</SelectItem>
                                                                             ))}
                                                                      </SelectContent>
                                                               </Select>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                               <label htmlFor="task-sort" className="text-xs font-medium text-muted-foreground">Sort</label>
                                                               <Select value={sort} onValueChange={(v) => setSort(v as TaskSortKey)}>
                                                                      <SelectTrigger id="task-sort" className="w-[180px] bg-card" aria-label="Sort order">
                                                                             <SelectValue />
                                                                      </SelectTrigger>
                                                                      <SelectContent>
                                                                             <SelectItem value="chronological">Chronological</SelectItem>
                                                                             <SelectItem value="alphabetical">Alphabetical</SelectItem>
                                                                      </SelectContent>
                                                               </Select>
                                                        </div>

                                                        <div className="bg-muted p-1 rounded-lg flex items-center space-x-1 self-end">
                                                               <button
                                                                      onClick={() => setViewMode('list')}
                                                                      className={`p-2 rounded-md transition-all ${viewMode === 'list'
                                                                             ? 'bg-card shadow text-card-foreground'
                                                                             : 'text-muted-foreground hover:text-card-foreground'
                                                                             }`}
                                                                      aria-label="List View"
                                                               >
                                                                      <List className="w-4 h-4" />
                                                               </button>
                                                               <button
                                                                      onClick={() => setViewMode('board')}
                                                                      className={`p-2 rounded-md transition-all ${viewMode === 'board'
                                                                             ? 'bg-card shadow text-card-foreground'
                                                                             : 'text-muted-foreground hover:text-card-foreground'
                                                                             }`}
                                                                      aria-label="Board View"
                                                               >
                                                                      <LayoutGrid className="w-4 h-4" />
                                                               </button>
                                                        </div>
                                                 </div>
                                          </div>
                                   </div>

                                   <div className="flex-1 overflow-hidden">
                                          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
                                                 {visibleTasks.length === 0 ? (
                                                        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                                                               <p className="text-muted-foreground">{EMPTY_STATE_COPY[filter]}</p>
                                                        </div>
                                                 ) : (
                                                        viewMode === 'list' ? (
                                                               <div className="space-y-6 overflow-y-auto h-full pb-20">
                                                                      <div className="flex flex-col gap-2">
                                                                             {visibleTasks.map(task => (
                                                                                    <TaskItem
                                                                                           key={task.id}
                                                                                           task={task}
                                                                                           level={0}
                                                                                           onStatusChange={handleStatusChange}
                                                                                           hideExpansion={true}
                                                                                           disableDrag={true}
                                                                                           // No-ops for unsupported actions in this view for now
                                                                                           onTaskClick={handleNoop}
                                                                                           onAddChildTask={handleNoop}
                                                                                           onInviteMember={handleNoop}
                                                                                    />
                                                                             ))}
                                                                      </div>
                                                               </div>
                                                        ) : (
                                                               <div className="h-full">
                                                                      <ProjectBoardView
                                                                             project={{ id: 'my-tasks-root' } as Project} // Dummy project ID for columns
                                                                             childrenTasks={visibleTasks}
                                                                             handleTaskClick={() => { }} // No detail view support yet in My Tasks
                                                                      />
                                                               </div>
                                                        )
                                                 )}
                                          </div>
                                   </div>
                            </div>
                     </DndContext>
              </>
       );
}
