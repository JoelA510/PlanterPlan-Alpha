import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import DashboardLayout from '@layouts/DashboardLayout';
import TaskList from '@features/tasks/components/TaskList';
import { Loader2 } from 'lucide-react';

export default function TasksPage() {
  const {
    tasks = [],
    loading,
    updateTask,
  } = useTaskOperations();

  // For "My Tasks" view, we show all instance tasks that are actual tasks (not phases/milestones/roots)
  const myTasks = tasks.filter((t) => t.parent_task_id !== null && t.origin === 'instance');

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
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Tasks</h1>
                <p className="text-slate-500 mt-1">Review and manage your assignments across all projects</p>
              </div>
            </div>

            <div className="space-y-6">
              {myTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                  <p className="text-slate-500">No tasks found across your projects.</p>
                </div>
              ) : (
                <TaskList
                  tasks={myTasks}
                  onUpdateTask={updateTask}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
