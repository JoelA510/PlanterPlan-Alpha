import React, { useState, useEffect } from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import TemplateTaskForm from '../TaskForm/TemplateTaskForm';
import { useMasterLibrary } from '../../hooks/useMasterLibrary';

const TemplateDetailsPanel = ({
  task,
  tasks,
  onClose,
  onAddTask,
  onDeleteTask,
  onEditTask,
  // ✅ SIMPLIFIED: Only child copy handler (removed standalone copy)
  onCopyTaskAsChild,
  // ✅ NEW: Mode to determine button display
  mode = 'view' // 'view' | 'copy'
}) => {
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);
  
  // ✅ ENHANCED: Master Library Integration with real-time status
  const masterLibrary = useMasterLibrary();
  
  // ✅ FIXED: Get library status with proper handling for master library tasks
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isCheckingLibraryStatus, setIsCheckingLibraryStatus] = useState(true);
  const isLibraryLoading = masterLibrary.isTaskLoading(task.id);
  const libraryError = masterLibrary.getTaskError(task.id);

  // ✅ FIXED: Check library status when task changes
  useEffect(() => {
    const checkLibraryStatus = async () => {
      if (!task?.id) return;

      setIsCheckingLibraryStatus(true);

      try {
        // ✅ FORCE: Always do fresh API check for accurate status
        console.log('🔍 Checking master library status for task:', task.id);
        const result = await masterLibrary.checkTaskLibraryStatus(task.id);
        
        if (!result.error) {
          console.log('✅ Master library status result:', result.isInLibrary);
          setIsInLibrary(result.isInLibrary);
        } else {
          console.error('❌ Error checking master library status:', result.error);
          // Fallback to cache check
          const cachedStatus = masterLibrary.isTaskInLibrary(task.id);
          if (cachedStatus !== null) {
            setIsInLibrary(cachedStatus);
          }
        }
      } catch (error) {
        console.error('Error checking library status:', error);
        // Fallback to cache check
        const cachedStatus = masterLibrary.isTaskInLibrary(task.id);
        if (cachedStatus !== null) {
          setIsInLibrary(cachedStatus);
        }
      } finally {
        setIsCheckingLibraryStatus(false);
      }
    };
    
    checkLibraryStatus();
  }, [task?.id, masterLibrary]);

  // Check if this task has children
  useEffect(() => {
    if (task && task.id && Array.isArray(tasks)) {
      // Find children of this task
      const children = tasks.filter(t => t.parent_task_id === task.id);
      const childExists = children.length > 0;
      setHasChildren(childExists);
    }
  }, [task, tasks]);
  
  // ✅ FIXED: Handle Master Library Toggle - always do fresh check
  const handleToggleMasterLibrary = async () => {
    try {
      console.log('🎯 Toggling master library for task:', task.id, 'Current status:', isInLibrary);
      
      const result = await masterLibrary.toggleLibraryMembership(task.id, task, {
        onOptimisticUpdate: (taskId, newStatus) => {
          console.log('⚡ Optimistic update: Task', taskId, newStatus ? 'added to' : 'removed from', 'library');
          setIsInLibrary(newStatus); // Update local state immediately
        },
        onSuccess: (taskId, data) => {
          console.log('✅ Successfully', isInLibrary ? 'removed from' : 'added to', 'master library:', taskId);
        },
        onError: (taskId, error) => {
          console.error('❌ Failed to toggle master library:', error);
          alert(`Failed to ${isInLibrary ? 'remove from' : 'add to'} master library: ${error}`);
          // Revert optimistic update by doing fresh check
          masterLibrary.checkTaskLibraryStatus(task.id).then(result => {
            if (!result.error) {
              setIsInLibrary(result.isInLibrary);
            }
          });
        }
      });
      
      if (!result.success) {
        console.warn('Master library operation returned error:', result.error);
      }
    } catch (err) {
      console.error('Error in handleToggleMasterLibrary:', err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  // Clear library error when component unmounts or task changes
  useEffect(() => {
    return () => {
      if (libraryError && task?.id) {
        masterLibrary.clearTaskError(task.id);
      }
    };
  }, [task?.id, libraryError, masterLibrary]);
  
  // Button handlers
  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleTemplateUpdate = (updatedTaskData) => {
    onEditTask(task.id, updatedTaskData);
    setIsEditing(false);
  };

  // ✅ SIMPLIFIED: Only child copy handler (removed standalone copy)
  const handleCopyAsChildTemplate = () => {
    if (onCopyTaskAsChild) {
      // This would typically be called with a specific parent ID
      // For now, we'll just trigger the copy flow
      onCopyTaskAsChild(task, null);
    }
  };
  
  if (!task) return null;
  
  const level = getTaskLevel(task, tasks);
  const backgroundColor = getBackgroundColor(level);

  // Find parent task for displaying parent-child relationships
  const parentTask = task.parent_task_id ? tasks.find(t => t.id === task.parent_task_id) : null;
  
  // Find children for this task, sorted by position for sequential display
  const children = tasks
    .filter(t => t.parent_task_id === task.id)
    .sort((a, b) => a.position - b.position);
  
  // Edit mode
  if (isEditing) {
    return (
      <TemplateTaskForm
        initialData={task}
        parentTaskId={task.parent_task_id}
        onSubmit={handleTemplateUpdate}
        onCancel={handleCancelEdit}
        backgroundColor={backgroundColor}
        isEditing={true}
        tasks={tasks}
      />
    );
  }
  
  // Ensure arrays are valid
  const actions = Array.isArray(task.actions) ? task.actions : [];
  const resources = Array.isArray(task.resources) ? task.resources : [];
  
  // Format dates for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not set';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Get duration values
  const defaultDuration = task.default_duration || 1;
  const durationDays = task.duration_days || 1;
  
  return (
    <div className="template-details-panel" style={{
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      height: '100%',
      overflow: 'auto'
    }}>
      <div className="details-header" style={{
        backgroundColor: backgroundColor,
        color: 'white',
        padding: '16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ 
              margin: 0, 
              fontWeight: 'bold',
            }}>
              {task.title}
            </h3>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="details-content" style={{ padding: '16px' }}>
        {/* Template Type Badge */}
        <div style={{ 
          display: 'inline-block',
          backgroundColor: '#e0f2fe',
          color: '#0369a1',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '16px'
        }}>
          Template
        </div>

        {/* ✅ ENHANCED: Master Library Section with proper status */}
        <div className="master-library-section" style={{
          backgroundColor: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isCheckingLibraryStatus ? '#94a3b8' : isInLibrary ? '#10b981' : '#cbd5e1'
              }} />
              
              <div>
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '2px'
                }}>
                  Master Library
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {isCheckingLibraryStatus 
                    ? 'Checking status...'
                    : isInLibrary 
                      ? 'Available for reuse'
                      : 'Not shared'
                  }
                </div>
              </div>
            </div>
            
            {!isCheckingLibraryStatus && (
              <button
                onClick={handleToggleMasterLibrary}
                disabled={isLibraryLoading}
                style={{
                  backgroundColor: isInLibrary ? '#f3f4f6' : '#374151',
                  color: isInLibrary ? '#374151' : 'white',
                  border: isInLibrary ? '1px solid #d1d5db' : 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: isLibraryLoading ? 'not-allowed' : 'pointer',
                  opacity: isLibraryLoading ? 0.6 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {isLibraryLoading ? 'Processing...' : isInLibrary ? 'Remove' : 'Add to Library'}
              </button>
            )}
          </div>
          
          {/* ✅ ERROR: Show errors if any */}
          {libraryError && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '12px', color: '#991b1b' }}>
                {libraryError}
              </span>
              <button
                onClick={() => masterLibrary.clearTaskError(task.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991b1b',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        {/* Enhanced schedule information section */}
        <div className="schedule-info-section" style={{ 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>Schedule Details</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Default Duration */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Default Duration</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginTop: '4px',
                gap: '6px'
              }}>
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  margin: '0',
                  color: '#000'
                }}>
                  {defaultDuration} day{defaultDuration !== 1 ? 's' : ''}
                </p>
                
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  DEFAULT
                </span>
              </div>
            </div>
            
            {/* Duration Days (Calculated/Minimum) */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>
                {hasChildren ? 'Calculated Duration' : 'Minimum Duration'}
              </span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginTop: '4px',
                gap: '6px'
              }}>
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  margin: '0',
                  color: '#000'
                }}>
                  {durationDays} day{durationDays !== 1 ? 's' : ''}
                </p>
                
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: hasChildren ? '#93c5fd' : '#fbbf24',
                  color: hasChildren ? '#1e40af' : '#92400e',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  {hasChildren ? 'CALCULATED' : 'MINIMUM'}
                </span>
              </div>
              
              {/* Helper text */}
              <p style={{ 
                fontSize: '11px', 
                color: '#6b7280', 
                margin: '4px 0 0 0',
                fontStyle: 'italic'
              }}>
                {hasChildren 
                  ? 'Based on child tasks' 
                  : 'Minimum time to complete this task'
                }
              </p>
            </div>
          </div>
          
          {/* Position in parent */}
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Position</span>
            <p style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              margin: '4px 0 0 0'
            }}>
              {task.position !== undefined ? task.position + 1 : 'Not set'}
              {parentTask && <span style={{fontSize: '12px', color: '#6b7280'}}> (in sequence)</span>}
            </p>
          </div>
          
          {/* Child Tasks Timeline */}
          {hasChildren && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                Child Tasks
              </h5>
              <div style={{ 
                fontSize: '14px', 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '8px'
              }}>
                <ol style={{ 
                  margin: '0',
                  padding: '0 0 0 16px'
                }}>
                  {children.map((child, index) => {
                    const childHasChildren = tasks.some(t => t.parent_task_id === child.id);
                    const childDefaultDuration = child.default_duration || 1;
                    const childDurationDays = child.duration_days || 1;
                    
                    return (
                      <li key={child.id} style={{ marginBottom: '6px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                          borderRadius: '2px'
                        }}>
                          <span style={{ fontWeight: 'bold' }}>{child.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Show both durations if different */}
                            {childDefaultDuration !== childDurationDays ? (
                              <>
                                <span style={{ color: '#6b7280', fontSize: '11px' }}>
                                  Default: {childDefaultDuration}d
                                </span>
                                <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>
                                  {childDurationDays} day{childDurationDays !== 1 ? 's' : ''}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  backgroundColor: childHasChildren ? '#93c5fd' : '#fbbf24',
                                  color: childHasChildren ? '#1e40af' : '#92400e',
                                  borderRadius: '8px',
                                  fontWeight: 'bold'
                                }}>
                                  {childHasChildren ? 'CALC' : 'MIN'}
                                </span>
                              </>
                            ) : (
                              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                {childDurationDays} day{childDurationDays !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Show an arrow connecting tasks if not the last one */}
                        {index < children.length - 1 && (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '2px 0',
                            color: '#9ca3af'
                          }}>
                            ↓
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}
          
          {/* Parent template name if applicable */}
          {parentTask && (
            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              <span style={{ color: '#4b5563' }}>Parent Template: </span>
              <span style={{ fontWeight: 'bold' }}>{parentTask.title}</span>
            </div>
          )}
        </div>
        
        {/* Created/Modified dates */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '12px', 
          color: '#6b7280',
          marginTop: '12px'
        }}>
          {task.created_at && (
            <div>Created: {formatDisplayDate(task.created_at)}</div>
          )}
          {task.last_modified && (
            <div>Last modified: {formatDisplayDate(task.last_modified)}</div>
          )}
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Purpose:</h4>
          <p>{task.purpose || 'No purpose specified'}</p>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Description:</h4>
          <p>{task.description || 'No description specified'}</p>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Actions:</h4>
          <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
            {actions.length > 0 ? 
              actions.map((action, index) => (
                <li key={index}>{action}</li>
              )) : 
              <li>No actions specified</li>
            }
          </ul>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Resources:</h4>
          <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
            {resources.length > 0 ? 
              resources.map((resource, index) => (
                <li key={index}>{resource}</li>
              )) : 
              <li>No resources specified</li>
            }
          </ul>
        </div>
        
        {/* ✅ SIMPLIFIED: Action buttons - only show copy as child in copy mode */}
        <div className="detail-row" style={{ 
          marginTop: '24px', 
          display: 'flex', 
          gap: '12px',
          flexDirection: 'column'
        }}>
          {/* ✅ SIMPLIFIED: Show different buttons based on mode */}
          {mode === 'copy' ? (
            // Copy mode: Show only copy as child button
            <button
              onClick={handleCopyAsChildTemplate}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ marginRight: '8px' }}>Copy as Child Task</span>
              <span>📄</span>
            </button>
          ) : (
            // View mode: Show edit and add child buttons
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleEditClick}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
                  flex: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ marginRight: '8px' }}>Edit Template</span>
                <span>✎</span>
              </button>
              
              <button
                onClick={() => onAddTask(task.id)}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
                  flex: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ marginRight: '8px' }}>Add Child Template</span>
                <span>+</span>
              </button>
            </div>
          )}
          
          {/* Delete Template button (only in view mode) */}
          {mode === 'view' && (
            <button
              onClick={() => onDeleteTask(task.id)}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Delete Template
            </button>
          )}
        </div>
      </div>
      
      {/* ✅ CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TemplateDetailsPanel;