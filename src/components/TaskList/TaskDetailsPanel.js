import React from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';

/**
 * TaskDetailsPanel - Component for displaying task details
 * @param {Object} props
 * @param {Object} props.task - The task to display details for
 * @param {Array} props.tasks - The full list of tasks
 * @param {Function} props.toggleTaskCompletion - Function to toggle task completion
 * @param {Function} props.onClose - Function to close the details panel
 * @param {Function} props.onAddChildTask - Function to add a child task
 * @param {Function} props.onDeleteTask - Function to delete the task
 */
const TaskDetailsPanel = ({
  task,
  tasks,
  toggleTaskCompletion,
  onClose,
  onAddChildTask,
  onDeleteTask
}) => {
  if (!task) return null;
  
  const level = getTaskLevel(task, tasks);
  const backgroundColor = getBackgroundColor(level);
  
  return (
    <div className="bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
      <div className="relative" style={{ backgroundColor }}>
        <div className={`absolute top-0 right-0 text-white text-xs font-bold uppercase py-1 px-2 rounded-bl ${task.is_complete ? 'bg-green-600' : 'bg-red-600'}`}>
          {task.is_complete ? 'Completed' : 'In Progress'}
        </div>
        
        <div className="flex justify-between items-center p-4 text-white">
          <div className="flex items-center">
            <input 
              type="checkbox"
              checked={task.is_complete || false}
              onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
              className="mr-3 w-5 h-5"
            />
            <h3 className={`font-bold m-0 ${task.is_complete ? 'line-through opacity-80' : ''}`}>
              {task.title}
            </h3>
          </div>
          
          <button 
            onClick={onClose} 
            className="bg-white bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center text-sm border-0 hover:bg-opacity-30 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <h4 className="font-bold mb-1">Status:</h4>
          <div className="flex items-center">
            <p className={`inline-block py-1 px-2 rounded text-sm mt-1 mr-2 ${
              task.is_complete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {task.is_complete ? 'Completed' : 'In Progress'}
            </p>
            
            {task.is_complete && (
              <div className="flex items-center text-sm">
                <span className="text-green-600 mr-1">✓</span>
                <span>Completed on {new Date().toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 h-2 w-full bg-gray-200 rounded overflow-hidden">
            <div 
              className="h-full bg-green-600 rounded transition-all duration-500 ease-in-out"
              style={{ width: task.is_complete ? '100%' : '0%' }}
            />
          </div>
        </div>
        
        <TaskDetailSection 
          title="Due Date" 
          content={task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'} 
        />
        
        <TaskDetailSection 
          title="Purpose" 
          content={task.purpose || 'No purpose specified'} 
        />
        
        <TaskDetailSection 
          title="Description" 
          content={task.description || 'No description specified'} 
        />
        
        <TaskDetailSection 
          title="Actions" 
          content={
            Array.isArray(task.actions) && task.actions.length > 0 ? 
            <ul className="pl-5 mt-2 mb-0">
              {task.actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul> : 
            <p>No actions specified</p>
          } 
        />
        
        <TaskDetailSection 
          title="Resources" 
          content={
            Array.isArray(task.resources) && task.resources.length > 0 ? 
            <ul className="pl-5 mt-2 mb-0">
              {task.resources.map((resource, index) => (
                <li key={index}>{resource}</li>
              ))}
            </ul> : 
            <p>No resources specified</p>
          } 
        />
        
        <div className="mt-6 flex gap-3">
          <button 
            onClick={() => onAddChildTask(task.id)} 
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded flex items-center justify-center border-0 hover:bg-green-600 transition-colors"
          >
            <span className="mr-2">Add Child Task</span>
            <span>+</span>
          </button>
          
          <button 
            onClick={() => onDeleteTask(task.id)} 
            className="bg-red-500 text-white py-2 px-4 rounded flex items-center justify-center border-0 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component defined in the same file
const TaskDetailSection = ({ title, content }) => {
    return (
      <div className="mb-4">
        <h4 className="font-bold mb-1 mt-4">{title}:</h4>
        {typeof content === 'string' ? <p>{content}</p> : content}
      </div>
    );
  };
  
export default TaskDetailsPanel;