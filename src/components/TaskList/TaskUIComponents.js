import React from 'react';
import { getBackgroundColor } from '../../utils/taskUtils';

/**
 * EmptyPanel - Displays an empty state with an icon and message
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {ReactNode} props.icon - Optional custom icon component
 */
export const EmptyPanel = ({ message, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300 p-6">
      {icon || (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )}
      <p className="mt-4 text-center">{message}</p>
    </div>
  );
};

/**
 * DeleteConfirmation - A modal dialog to confirm deletion
 * @param {Object} props
 * @param {Function} props.onConfirm - Function to call when deletion is confirmed
 * @param {Function} props.onCancel - Function to call when deletion is canceled
 * @param {string} props.message - The confirmation message to display
 * @param {string} props.title - Optional custom title (defaults to "Confirm Deletion")
 */
export const DeleteConfirmation = ({ onConfirm, onCancel, message, title = "Confirm Deletion" }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="mt-0 text-red-500 text-xl font-semibold mb-4">{title}</h3>
        <p className="mb-6 text-gray-700">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="py-2 px-4 rounded border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 rounded border-0 bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ProjectForm - Form component for creating/editing projects
 * @param {Object} props
 * @param {Object} props.formData - The form data state
 * @param {Function} props.onFieldChange - Handler for field changes
 * @param {Function} props.onArrayChange - Handler for array field changes
 * @param {Function} props.onAddArrayItem - Handler for adding array items
 * @param {Function} props.onRemoveArrayItem - Handler for removing array items
 * @param {Function} props.onSubmit - Handler for form submission
 * @param {Function} props.onCancel - Handler for form cancellation
 * @param {string} props.backgroundColor - Background color for the header
 * @param {string} props.formTitle - Title for the form
 */
export const ProjectForm = ({
  formData,
  onFieldChange,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onSubmit,
  onCancel,
  backgroundColor = '#3b82f6',
  formTitle = 'Create New Project'
}) => {
  // Handler for form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
      <div className="text-white p-4 rounded-t-md" style={{ backgroundColor }}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold m-0">{formTitle}</h3>
          <button 
            onClick={onCancel}
            className="bg-white bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center text-sm border-0 hover:bg-opacity-30 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mb-4">
          <label 
            htmlFor="title"
            className="block font-bold mb-1"
          >
            Project Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        <div className="mb-4">
          <label 
            htmlFor="purpose"
            className="block font-bold mb-1"
          >
            Purpose
          </label>
          <textarea
            id="purpose"
            value={formData.purpose}
            onChange={(e) => onFieldChange('purpose', e.target.value)}
            rows={2}
            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
        </div>
        
        <div className="mb-4">
          <label 
            htmlFor="description"
            className="block font-bold mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={3}
            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
        </div>
        
        <div className="mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label 
                htmlFor="start_date"
                className="block font-bold mb-1"
              >
                Start Date
              </label>
              <input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => onFieldChange('start_date', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex-1">
              <label 
                htmlFor="due_date"
                className="block font-bold mb-1"
              >
                Due Date
              </label>
              <input
                id="due_date"
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => onFieldChange('due_date', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block font-bold mb-1">
            Actions
          </label>
          {formData.actions.map((action, index) => (
            <div key={`action-${index}`} className="flex mb-2 items-center">
              <input
                type="text"
                value={action}
                onChange={(e) => onArrayChange('actions', index, e.target.value)}
                className="flex-1 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter an action step"
              />
              <button
                type="button"
                onClick={() => onRemoveArrayItem('actions', index)}
                className="ml-2 p-2 rounded border-0 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onAddArrayItem('actions')}
            className="py-1 px-2 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer flex items-center text-sm transition-colors"
          >
            <span className="mr-1">Add Action</span>
            <span>+</span>
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block font-bold mb-1">
            Resources
          </label>
          {formData.resources.map((resource, index) => (
            <div key={`resource-${index}`} className="flex mb-2 items-center">
              <input
                type="text"
                value={resource}
                onChange={(e) => onArrayChange('resources', index, e.target.value)}
                className="flex-1 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a resource"
              />
              <button
                type="button"
                onClick={() => onRemoveArrayItem('resources', index)}
                className="ml-2 p-2 rounded border-0 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onAddArrayItem('resources')}
            className="py-1 px-2 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer flex items-center text-sm transition-colors"
          >
            <span className="mr-1">Add Resource</span>
            <span>+</span>
          </button>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="py-2 px-4 rounded border-0 bg-green-500 hover:bg-green-600 text-white cursor-pointer transition-colors"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * TemplateSelector - Component for selecting a template when creating a new project
 * @param {Object} props
 * @param {Array} props.templates - List of available templates
 * @param {string} props.selectedTemplateId - ID of the currently selected template
 * @param {Function} props.onTemplateSelect - Function called when a template is selected
 * @param {Function} props.onCancel - Function called when selection is canceled
 * @param {Function} props.onContinue - Function called when selection is confirmed
 */
export const TemplateSelector = ({ 
  templates, 
  selectedTemplateId, 
  onTemplateSelect, 
  onCancel, 
  onContinue 
}) => {
  return (
    <div className="bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
      <div className="bg-blue-500 text-white p-4 rounded-t-md">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold m-0">Select a Template</h3>
          <button 
            onClick={onCancel}
            className="bg-white bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center text-sm border-0 hover:bg-opacity-30 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <p className="mb-4">
          Choose a template to use as the basis for your new project:
        </p>
        
        {templates.length === 0 ? (
          <div className="text-gray-500 text-center py-6">
            No templates available. You can create a template from the Templates page.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map(template => {
              const bgColor = getBackgroundColor(0); // Top level
              
              return (
                <div 
                  key={template.id}
                  onClick={() => onTemplateSelect(template.id)}
                  style={{ backgroundColor: bgColor }}
                  className={`text-white p-3 rounded cursor-pointer font-bold border-2 transition-shadow ${
                    selectedTemplateId === template.id 
                      ? 'border-white shadow-lg' 
                      : 'border-transparent hover:shadow'
                  }`}
                >
                  {template.title}
                </div>
              );
            })}
          </div>
        )}
        
        {selectedTemplateId && (
          <div className="mt-6 text-right">
            <button
              onClick={onContinue}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded border-0 transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};