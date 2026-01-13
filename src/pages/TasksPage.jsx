import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import ProjectSidebar from '@features/navigation/components/ProjectSidebar';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import TaskItem from '@features/tasks/components/TaskItem';
import EditTaskForm from '@features/tasks/components/EditTaskForm';
import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/alert-dialog";

const TasksPage = () => {
  const navigate = useNavigate();
  const {
    tasks = [],
    joinedProjects = [],
    instanceTasks = [],
    templateTasks = [],
    loading,
    error,
    joinedError,
    loadMoreProjects,
    hasMore,
    isFetchingMore,
    updateTask,
    deleteTask
  } = useTaskOperations();

  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'edit'
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const handleSelectProject = (project) => navigate(`/project/${project.id}`);

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setActiveModal('edit');
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete.id);
        setTaskToDelete(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Filter for leaf tasks (actual tasks, not projects)
  // And generally tasks assigned to me? For now, we show ALL tasks in the system that are not roots.
  const myTasks = tasks.filter(t => t.parent_task_id !== null && t.origin === 'instance');

  const sidebar = (
    <ProjectSidebar
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      loading={loading}
      error={error}
      joinedError={joinedError}
      handleSelectProject={handleSelectProject}
      onNewProjectClick={() => navigate('/dashboard')}
      onNewTemplateClick={() => navigate('/dashboard')}
      onLoadMore={loadMoreProjects}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
    />
  );

  if (loading) {
    return (
      <DashboardLayout sidebar={sidebar}>
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">All Tasks</h1>

        {myTasks.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p>No tasks found across your projects.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.map(task => (
              <div key={task.id} className="bg-white rounded-lg border border-slate-200">
                <TaskItem
                  task={task}
                  level={0}
                  hideExpansion={true}
                  onEdit={handleEditTask}
                  onDelete={() => setTaskToDelete(task)}
                  onStatusChange={handleStatusChange}
                // Disable DND features for this flat view
                />
              </div>
            ))}
          </div>
        )}

        {activeModal === 'edit' && selectedTask && (
          <EditTaskForm
            open={true}
            onClose={() => setActiveModal(null)}
            task={selectedTask}
            onSuccess={() => setActiveModal(null)}
          />
        )}

        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default TasksPage;
