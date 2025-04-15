import React, { useState } from 'react';
import TemplateItem from './TemplateItem';
import TaskDropZone from '../TaskList/TaskDropZone';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { useOrganization } from '../contexts/OrganizationProvider';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext'; // Import the task context hook
import '../TaskList/TaskList.css';

const TemplateList = () => {
  // Context hooks
  const { organization, organizationId } = useOrganization();
  const { user } = useAuth();
  
  // Use the task context instead of local state for tasks
  const { 
    templateTasks: tasks, 
    loading, 
    error, 
    fetchTasks, 
    setTasks 
  } = useTasks();
  
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const toggleExpandTask = (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  // Function to select a task and show its details in the right panel
  const selectTask = (taskId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
  // Render top-level tasks (templates) with spacing between them
  const renderTopLevelTemplates = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => a.position - b.position);
    
    if (topLevelTasks.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No templates found. Create your first template to get started!
        </div>
      );
    }
    
    const taskElements = [];
    
    // Render each template with spacing between them
    topLevelTasks.forEach((task, index) => {
      // Add the template using TemplateItem component
      taskElements.push(
        <TemplateItem 
          key={task.id}
          task={task}
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          selectedTaskId={selectedTaskId}
          selectTask={selectTask}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
        />
      );
      
      // Add a spacing div after each template (except the last one)
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <div 
            key={`template-spacer-${index}`}
            className="h-1.5 my-0.5"
          />
        );
      }
    });
    
    return taskElements;
  };
  
  // Render the details panel for the selected template
  const renderTemplateDetailsPanel = () => {
    if (!selectedTask) {
      return (
        <div className="empty-details-panel flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300 p-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <p className="mt-4 text-center">
            Select a template to view its details
          </p>
        </div>
      );
    }
    
    // Get the task level and background color
    const level = getTaskLevel(selectedTask, tasks);
    const backgroundColor = getBackgroundColor(level);
    
    return (
      <div className="task-details-panel bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
        <div className="details-header" style={{
          backgroundColor: backgroundColor,
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          position: 'relative'
        }}>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <h3 className="m-0 font-bold">
                {selectedTask.title}
              </h3>
            </div>
            
            <button 
              onClick={() => setSelectedTaskId(null)}
              className="bg-white bg-opacity-20 border-0 rounded-full text-white cursor-pointer w-6 h-6 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="details-content p-4">
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Purpose:</h4>
            <p>{selectedTask.purpose || 'No purpose specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Description:</h4>
            <p>{selectedTask.description || 'No description specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Actions:</h4>
            <ul className="pl-5 mt-2 mb-0">
              {selectedTask.actions && selectedTask.actions.length > 0 ? 
                selectedTask.actions.map((action, index) => (
                  <li key={index}>{action}</li>
                )) : 
                <li>No actions specified</li>
              }
            </ul>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Resources:</h4>
            <ul className="pl-5 mt-2 mb-0">
              {selectedTask.resources && selectedTask.resources.length > 0 ? 
                selectedTask.resources.map((resource, index) => (
                  <li key={index}>{resource}</li>
                )) : 
                <li>No resources specified</li>
              }
            </ul>
          </div>
          
          <div className="detail-row mt-6">
            <button
              onClick={() => alert(`Create project from template: ${selectedTask.title}`)}
              className="bg-green-500 text-white py-2 px-4 rounded border-0 w-full"
            >
              Use as Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Left panel - Template list */}
      <div className="flex-1 flex-grow-6 mr-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Templates</h1>
          <div className="flex gap-3">
            <button 
              onClick={() => alert('Create new template functionality would go here')}
              className="bg-green-500 text-white py-2 px-4 rounded border-0"
            >
              New Template
            </button>
            <button 
              onClick={() => fetchTasks(true)}
              className="bg-blue-500 text-white py-2 px-4 rounded border-0"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Only show loading indicator when we have no tasks AND are actually loading */}
        {(loading && tasks.length === 0) ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        ) : (
          <div>{renderTopLevelTemplates()}</div>
        )}
      </div>
      
      {/* Right panel - Template details */}
      <div className="flex-1 flex-grow-4 min-w-75 max-w-125">
        {renderTemplateDetailsPanel()}
      </div>
      
      {/* Debug section */}
      <details className="fixed bottom-2.5 left-2.5 p-2 bg-gray-100 bg-opacity-90 rounded border border-gray-200 w-56 max-h-75 overflow-y-auto text-xs z-20 shadow-sm">
        <summary className="cursor-pointer text-blue-500 font-medium text-xs select-none">
          Debug Information
        </summary>
        <div className="mt-1.5">
          <p>Total templates: {tasks.length}</p>
          <p>Top-level templates: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Selected template: {selectedTaskId ? selectedTaskId.substring(0, 8) + '...' : 'None'}</p>
        </div>
      </details>
    </div>
  );
};

export default TemplateList;