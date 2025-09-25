import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import TaskItem from './TaskItem';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Fetch tasks for current user
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('creator', user.id)
        .order('position', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchy: find root tasks (no parent) and their children
  const buildTaskHierarchy = (tasks) => {
    const taskMap = {};
    const rootTasks = [];

    // Create a map of all tasks
    tasks.forEach(task => {
      taskMap[task.id] = { ...task, children: [] };
    });

    // Build hierarchy
    tasks.forEach(task => {
      if (task.parent_task_id && taskMap[task.parent_task_id]) {
        taskMap[task.parent_task_id].children.push(taskMap[task.id]);
      } else {
        rootTasks.push(taskMap[task.id]);
      }
    });

    return rootTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
          <span className="text-slate-600 font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <div className="text-red-600 font-semibold">Error loading projects</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  const hierarchicalTasks = buildTaskHierarchy(tasks);

  if (hierarchicalTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
          <p className="text-slate-600">Create your first church planting project to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {hierarchicalTasks.map(project => (
        <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
          {/* Modern project header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {project.title}
                  </h2>
                  {project.origin === 'template' && (
                    <span className="inline-block mt-1 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      Template Project
                    </span>
                  )}
                </div>
              </div>
              
              {/* Task count badge */}
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {project.children ? project.children.length : 0}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {project.children?.length === 1 ? 'Task' : 'Tasks'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tasks list */}
          <div className="min-h-[120px]">
            {project.children && project.children.length > 0 ? (
              project.children.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  level={0}
                />
              ))
            ) : (
              <div className="px-8 py-8 text-center">
                <div className="text-slate-400 text-sm">No tasks in this project</div>
                <div className="text-slate-300 text-xs mt-1">Add tasks to get started</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;