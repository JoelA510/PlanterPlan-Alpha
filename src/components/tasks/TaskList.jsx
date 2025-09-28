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

  // Separate tasks by origin
  const separateTasksByOrigin = (tasks) => {
    const instanceTasks = tasks.filter(task => task.origin === 'instance');
    const templateTasks = tasks.filter(task => task.origin === 'template');
    
    return {
      instanceTasks: buildTaskHierarchy(instanceTasks),
      templateTasks: buildTaskHierarchy(templateTasks)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-slate-600 font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 font-semibold">Error loading projects</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  const { instanceTasks, templateTasks } = separateTasksByOrigin(tasks);

  if (instanceTasks.length === 0 && templateTasks.length === 0) {
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
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
      </div>

      {/* Instance Tasks (Projects) Section */}
      {instanceTasks.length > 0 && (
        <div className="task-section">
          <div className="section-header">
            <h2 className="section-title">Projects</h2>
            <span className="section-count">{instanceTasks.length}</span>
          </div>
          <div className="task-cards-container">
            {instanceTasks.map(project => (
              <TaskItem 
                key={project.id} 
                task={project} 
                level={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Template Tasks Section */}
      {templateTasks.length > 0 && (
        <div className="task-section">
          <div className="section-header">
            <h2 className="section-title">Templates</h2>
            <span className="section-count">{templateTasks.length}</span>
          </div>
          <div className="task-cards-container">
            {templateTasks.map(template => (
              <TaskItem 
                key={template.id} 
                task={template} 
                level={0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;