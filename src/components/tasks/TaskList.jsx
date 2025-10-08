import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import TaskItem from './TaskItem';
import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from './TaskDetailsView';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [parentTaskForNewChild, setParentTaskForNewChild] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

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

  const buildTaskHierarchy = (tasks) => {
    const taskMap = {};
    const rootTasks = [];

    tasks.forEach(task => {
      taskMap[task.id] = { ...task, children: [] };
    });

    tasks.forEach(task => {
      if (task.parent_task_id && taskMap[task.parent_task_id]) {
        taskMap[task.parent_task_id].children.push(taskMap[task.id]);
      } else {
        rootTasks.push(taskMap[task.id]);
      }
    });

    return rootTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const separateTasksByOrigin = (tasks) => {
    const instanceTasks = tasks.filter(task => task.origin === 'instance');
    const templateTasks = tasks.filter(task => task.origin === 'template');
    
    return {
      instanceTasks: buildTaskHierarchy(instanceTasks),
      templateTasks: buildTaskHierarchy(templateTasks)
    };
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setShowTaskForm(false);
  };

  const handleAddChildTask = (parentTask) => {
    setParentTaskForNewChild(parentTask);
    setShowTaskForm(true);
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleCreateProject = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const instanceTasks = tasks.filter(t => t.origin === 'instance' && !t.parent_task_id);
      const maxPosition = instanceTasks.length > 0 
        ? Math.max(...instanceTasks.map(t => t.position || 0))
        : 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title,
          description: formData.description || null,
          purpose: formData.purpose || null,
          actions: formData.actions || null,
          resources: formData.resources || null,
          origin: 'instance',
          creator: user.id,
          parent_task_id: null,
          position: maxPosition + 1000,
          is_complete: false
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [...prev, data]);
      setShowForm(false);
      setSelectedTask(null);
      
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const handleCreateChildTask = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate position among siblings
      const siblings = tasks.filter(t => t.parent_task_id === parentTaskForNewChild.id);
      const maxPosition = siblings.length > 0 
        ? Math.max(...siblings.map(t => t.position || 0))
        : 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title,
          description: formData.description || null,
          purpose: formData.purpose || null,
          actions: formData.actions || null,
          resources: formData.resources || null,
          origin: 'instance',
          creator: user.id,
          parent_task_id: parentTaskForNewChild.id,
          position: maxPosition + 1000,
          is_complete: false
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [...prev, data]);
      setShowTaskForm(false);
      setParentTaskForNewChild(null);
      
    } catch (error) {
      console.error('Error creating child task:', error);
      throw error;
    }
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
      <div className="split-layout">
        <div className="task-list-area">
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
              <p className="text-slate-600 mb-4">Create your first church planting project using the form on the right.</p>
            </div>
          </div>
        </div>

        <div className="permanent-side-panel">
          <div className="panel-header">
            <h2 className="panel-title">New Project</h2>
          </div>
          <div className="panel-content">
            <NewProjectForm
              onSubmit={handleCreateProject}
              onCancel={() => {}}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="split-layout">
      <div className="task-list-area">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
        </div>

        {instanceTasks.length > 0 && (
          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Projects</h2>
                <span className="section-count">{instanceTasks.length}</span>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setSelectedTask(null);
                }}
                className="btn-new-item"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
                </svg>
                New Project
              </button>
            </div>
            <div className="task-cards-container">
              {instanceTasks.map(project => (
                <TaskItem 
                  key={project.id} 
                  task={project} 
                  level={0}
                  onTaskClick={handleTaskClick}
                  selectedTaskId={selectedTask?.id}
                  onAddChildTask={handleAddChildTask}
                />
              ))}
            </div>
          </div>
        )}

        {templateTasks.length > 0 && (
          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Templates</h2>
                <span className="section-count">{templateTasks.length}</span>
              </div>
            </div>
            <div className="task-cards-container">
              {templateTasks.map(template => (
                <TaskItem 
                  key={template.id} 
                  task={template} 
                  level={0}
                  onTaskClick={handleTaskClick}
                  selectedTaskId={selectedTask?.id}
                  onAddChildTask={handleAddChildTask}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="permanent-side-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {showForm 
              ? 'New Project' 
              : showTaskForm 
                ? `New Task in ${parentTaskForNewChild?.title}` 
                : selectedTask 
                  ? selectedTask.title 
                  : 'Details'}
          </h2>
          {showForm && (
            <button
              onClick={() => setShowForm(false)}
              className="panel-header-btn"
            >
              Hide Form
            </button>
          )}
          {showTaskForm && (
            <button
              onClick={() => {
                setShowTaskForm(false);
                setParentTaskForNewChild(null);
              }}
              className="panel-header-btn"
            >
              Cancel
            </button>
          )}
          {selectedTask && !showForm && !showTaskForm && (
            <button
              onClick={() => setSelectedTask(null)}
              className="panel-header-btn"
            >
              Close
            </button>
          )}
        </div>
        <div className="panel-content">
          {showForm ? (
            <NewProjectForm
              onSubmit={handleCreateProject}
              onCancel={() => setShowForm(false)}
            />
          ) : showTaskForm ? (
            <NewTaskForm
              parentTask={parentTaskForNewChild}
              onSubmit={handleCreateChildTask}
              onCancel={() => {
                setShowTaskForm(false);
                setParentTaskForNewChild(null);
              }}
            />
          ) : selectedTask ? (
            <TaskDetailsView 
              task={selectedTask}
              onAddChildTask={handleAddChildTask}
            />
          ) : (
            <div className="empty-panel-state">
              <div className="empty-panel-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="empty-panel-title">No Selection</h3>
              <p className="empty-panel-text">
                Click "New Project" to create a project, or select a task to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskList;