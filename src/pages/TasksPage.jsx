import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { planter } from '@shared/api/planterClient';
import DashboardLayout from '@layouts/DashboardLayout';
import TaskItem from '@features/tasks/components/TaskItem';
import { Loader2, List, LayoutGrid } from 'lucide-react';
import { useTaskMutations } from '@features/tasks/hooks/useTaskMutations';
import ProjectBoardView from '@features/tasks/components/board/ProjectBoardView';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => planter.entities.Task.list(),
  });

  const findTask = useCallback((id) => tasks.find((t) => t.id === id), [tasks]);

  // State for View Mode
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'

  // We still need mutation capabilities for the TaskList
  const { updateTask } = useTaskMutations({
    tasks,
    fetchTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    refreshProjectDetails: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    findTask
  });

  // For "My Tasks" view, we show all instance tasks that are actual tasks (not phases/milestones/roots)
  const myTasks = tasks.filter((t) => t.parent_task_id !== null && t.origin === 'instance');

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
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overData = over.data.current;

    // We can drop on a Column (container) OR a Task. 
    // Both should have the 'status' property in their data.
    if (overData && overData.status) {
      const newStatus = overData.status;
      const task = findTask(activeId);

      if (task && task.status !== newStatus) {
        updateTask(activeId, { status: newStatus });
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
          <div className="flex-none max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Tasks</h1>
                <p className="text-muted-foreground mt-1">Review and manage your assignments across all projects</p>
              </div>

              {/* View Toggler */}
              <div className="bg-muted p-1 rounded-lg flex items-center space-x-1">
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

          <div className="flex-1 overflow-hidden">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
              {myTasks.length === 0 ? (
                <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                  <p className="text-muted-foreground">No tasks found across your projects.</p>
                </div>
              ) : (
                viewMode === 'list' ? (
                  <div className="space-y-6 overflow-y-auto h-full pb-20">
                    <div className="flex flex-col gap-2">
                      {myTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          level={0}
                          onStatusChange={(id, status) => updateTask(id, { status })}
                          hideExpansion={true}
                          disableDrag={true}
                          // No-ops for unsupported actions in this view for now
                          onTaskClick={() => { }}
                          onAddChildTask={() => { }}
                          onInviteMember={() => { }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    <ProjectBoardView
                      project={{ id: 'my-tasks-root' }} // Dummy project ID for columns
                      childrenTasks={myTasks}
                      handleTaskClick={() => { }} // No detail view support yet in My Tasks
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </DashboardLayout>
  );
}
