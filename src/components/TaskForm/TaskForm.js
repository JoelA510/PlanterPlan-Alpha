// src/components/TaskForm/TaskForm.js - Updated with Tailwind CSS styling
import React, { useState, useRef } from 'react';
import { useTaskForm } from './useTaskForm';
import { formatDisplayDate } from '../../utils/taskUtils';
import URLTextComponent from '../URLTextComponent';
import MasterLibraryPopup from './MasterLibraryPopup';

const TaskForm = ({ 
  parentTaskId,
  parentStartDate,
  onSubmit, 
  onCancel, 
  backgroundColor,
  originType = 'instance',
  initialData = null,
  isEditing = false  
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [showMasterLibraryPopup, setShowMasterLibraryPopup] = useState(false);
  const formRef = useRef(null);

  const {
    formData,
    errors,
    dateMode,
    handleDateModeChange,
    handleChange,
    handleDateChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData,
    setFormData
  } = useTaskForm(initialData, parentStartDate);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getHeaderText = () => {
    if (isEditing) {
      return 'Edit Task';
    } else if (initialData) {
      return 'Edit Task';
    } else if (!parentTaskId) {
      return originType === 'template' ? 'Add Template' : 'Add Project';
    } else {
      return originType === 'template' ? 'Add Template Task' : 'Add Subtask';
    }
  };

  const getFormPosition = () => {
    if (formRef.current) {
      const rect = formRef.current.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left
      };
    }
    return { top: 100, left: 500 };
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCopyMasterLibraryTask = (templateTask) => {
    console.log('Copying master library task to form:', templateTask);
    
    const parseArrayField = (field) => {
      if (Array.isArray(field)) return field.length > 0 ? field : [''];
      if (!field) return [''];
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ['']) : [field];
        } catch (e) {
          return [field];
        }
      }
      return [''];
    };

    setFormData(prev => ({
      ...prev,
      title: templateTask.title || prev.title,
      purpose: templateTask.purpose || prev.purpose,
      description: templateTask.description || prev.description,
      actions: parseArrayField(templateTask.actions),
      resources: parseArrayField(templateTask.resources),
      duration_days: templateTask.default_duration || templateTask.duration_days || prev.duration_days,
      parent_task_id: prev.parent_task_id,
      start_date: prev.start_date,
      due_date: prev.due_date,
      days_from_start_until_due: prev.days_from_start_until_due
    }));

    setShowMasterLibraryPopup(false);
    console.log('✅ Master library task copied successfully');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const cleanedData = prepareFormData();
      
      onSubmit({
        ...cleanedData,
        parent_task_id: parentTaskId,
        origin: originType,
        is_complete: formData.is_complete !== undefined ? formData.is_complete : false
      });
    }
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const safeActions = Array.isArray(formData.actions) ? formData.actions : [''];
  const safeResources = Array.isArray(formData.resources) ? formData.resources : [''];

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================
  
  const renderHeader = () => (
    <div 
      className="text-white p-4 rounded-t flex justify-between items-center"
      style={{ backgroundColor: backgroundColor }}
    >
      <h3 className="m-0 font-bold text-lg">
        {getHeaderText()}
      </h3>
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMasterLibraryPopup(true)}
          className="bg-white bg-opacity-20 border border-white border-opacity-30 rounded text-white px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors hover:bg-white hover:bg-opacity-30"
          title="Search Master Library templates to copy"
        >
          <span>🔍</span>
          <span>Copy from Library</span>
        </button>
        
        <button 
          onClick={onCancel}
          className="bg-white bg-opacity-20 border-none rounded-full text-white w-6 h-6 flex items-center justify-center text-xs cursor-pointer hover:bg-white hover:bg-opacity-30 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );

  const renderTitleField = () => (
    <div className="mb-4">
      <label htmlFor="title" className="block font-bold mb-1 text-gray-900">
        Title *
      </label>
      <input
        id="title"
        name="title"
        type="text"
        value={formData.title || ''}
        onChange={handleChange}
        className={`
          w-full px-2 py-2 rounded border outline-none transition-colors
          ${errors.title 
            ? 'border-red-500 focus:border-red-600' 
            : 'border-gray-300 focus:border-blue-500'
          }
        `}
        placeholder="Enter task title"
      />
      {errors.title && (
        <p className="text-red-500 text-xs mt-1">{errors.title}</p>
      )}
    </div>
  );

  const renderScheduleSection = () => (
    <div className="mb-4 p-3 bg-gray-100 rounded">
      <div className="mb-3">
        <label htmlFor="duration_days" className="block font-bold mb-1 text-gray-900">
          Duration (days)
        </label>
        <input
          id="duration_days"
          name="duration_days"
          type="number"
          min="1"
          value={formData.duration_days || 1}
          onChange={handleChange}
          className="w-20 px-2 py-2 rounded border border-gray-300 outline-none focus:border-blue-500"
        />
        
        {formData.start_date && formData.due_date && (
          <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <div><strong>Start Date:</strong> {formatDisplayDate(formData.start_date)}</div>
            <div><strong>End Date:</strong> {formatDisplayDate(formData.due_date)}</div>
            <div className="mt-1 text-xs italic">
              Note: Changing duration will update the end date accordingly.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTextAreaField = (name, label, rows = 2, placeholder = '') => (
    <div className="mb-4">
      <label htmlFor={name} className="block font-bold mb-1 text-gray-900">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        rows={rows}
        className="w-full px-2 py-2 rounded border border-gray-300 outline-none resize-y focus:border-blue-500"
        placeholder={placeholder}
      />
    </div>
  );

  const renderArrayField = (type, label, placeholder, isResourceField = false) => (
    <div className="mb-4">
      <label className="block font-bold mb-1 text-gray-900">{label}</label>
      <div className="space-y-2">
        {(type === 'actions' ? safeActions : safeResources).map((item, index) => (
          <div key={`${type}-${index}`} className="flex items-start gap-2">
            {isResourceField ? (
              <URLTextComponent
                value={item || ''}
                onChange={(newValue) => handleArrayChange(type, index, newValue)}
                placeholder={placeholder}
                style={{ flex: 1 }}
              />
            ) : (
              <input
                type="text"
                value={item || ''}
                onChange={(e) => handleArrayChange(type, index, e.target.value)}
                className="flex-1 px-2 py-2 rounded border border-gray-300 outline-none focus:border-blue-500"
                placeholder={placeholder}
              />
            )}
            <button
              type="button"
              onClick={() => removeArrayItem(type, index)}
              className={`px-2 py-2 rounded border-none bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors ${isResourceField ? 'mt-2' : ''}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem(type)}
          className="px-2 py-1 rounded border border-gray-300 bg-white cursor-pointer flex items-center text-xs gap-1 hover:bg-gray-50 transition-colors"
        >
          <span>Add {label.slice(0, -1)}</span>
          <span>+</span>
        </button>
      </div>
    </div>
  );

  const renderFormButtons = () => (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-4 py-2 rounded border-none bg-green-600 text-white cursor-pointer hover:bg-green-700 transition-colors"
      >
        {isEditing || initialData ? 'Update Task' : 'Add Task'}
      </button>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      <div 
        ref={formRef}
        className="bg-gray-50 rounded border border-gray-200 h-full overflow-auto"
      >
        {renderHeader()}
        
        <form onSubmit={handleSubmit} className="p-4">
          {renderTitleField()}
          {renderScheduleSection()}
          {renderTextAreaField('purpose', 'Purpose', 2, 'What is the purpose of this task?')}
          {renderTextAreaField('description', 'Description', 3, 'Describe this task')}
          {renderArrayField('actions', 'Actions', 'Enter an action step')}
          {renderArrayField('resources', 'Resources', 'Enter a resource (URLs will be automatically detected)', true)}
          {renderFormButtons()}
        </form>
      </div>

      <MasterLibraryPopup
        isOpen={showMasterLibraryPopup}
        onClose={() => setShowMasterLibraryPopup(false)}
        onCopyTask={handleCopyMasterLibraryTask}
        position={getFormPosition()}
      />
    </>
  );
};

export default TaskForm;