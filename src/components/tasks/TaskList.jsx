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
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  const hierarchicalTasks = buildTaskHierarchy(tasks);

  return (
    <div className="space-y-6">
      {hierarchicalTasks.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No projects found
        </div>
      ) : (
        hierarchicalTasks.map(project => (
          <div key={project.id} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {project.title}
              </h2>
              {project.origin === 'template' && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                  Template
                </span>
              )}
            </div>
            
            <div className="divide-y divide-gray-100">
              {project.children && project.children.length > 0 ? (
                project.children.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    level={0}
                  />
                ))
              ) : (
                <div className="px-6 py-4 text-gray-500 text-sm">
                  No tasks in this project
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskList;