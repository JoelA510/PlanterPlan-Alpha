import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './TaskList.css'; // We'll create this file for any additional CSS

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before', 'after', 'into'

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          purpose,
          type,
          origin,
          published,
          creator,
          created_at,
          last_modified,
          parent_task_id,
          position,
          is_complete,
          due_date,
          task_lead
        `)
        .order('position', { ascending: true });

      if (error) throw error;
      console.log('Fetched tasks:', data);
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandTask = (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_complete: !currentStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, is_complete: !currentStatus } 
            : task
        )
      );
    } catch (err) {
      console.error('Error updating task completion:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Get background color based on nesting level
  const getBackgroundColor = (level) => {
    const colors = [
      '#6b7280', // Gray for top level (level 0)
      '#1e40af', // Dark blue (level 1)
      '#2563eb', // Medium blue (level 2)
      '#3b82f6', // Blue (level 3)
      '#60a5fa', // Light blue (level 4)
      '#93c5fd'  // Lighter blue (level 5+)
    ];
    
    if (level === 0) return colors[0];
    return level < colors.length ? colors[level] : colors[colors.length - 1];
  };
  
  // Determine the nesting level of a task
  const getTaskLevel = (task) => {
    if (!task.parent_task_id) return 0;
    
    let level = 1;
    let parentId = task.parent_task_id;
    
    while (parentId) {
      level++;
      const parent = tasks.find(t => t.id === parentId);
      parentId = parent?.parent_task_id;
    }
    
    return level;
  };

  // Handle drag start
  const handleDragStart = (e, task) => {
    // Prevent top-level tasks from being dragged
    if (!task.parent_task_id) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTask(task);
    
    // Auto-expand tasks to make it easier to drop
    tasks.forEach(t => {
      if (t.id !== task.id && tasks.some(child => child.parent_task_id === t.id)) {
        setExpandedTasks(prev => ({
          ...prev, 
          [t.id]: true
        }));
      }
    });
    
    // Add some delay to allow the drag image to be set
    setTimeout(() => {
      // Hide the original element during drag
      const taskElement = document.getElementById(`task-${task.id}`);
      if (taskElement) {
        taskElement.style.opacity = '0.4';
      }
    }, 0);
  };

  // Handle drag over
  const handleDragOver = (e, targetTask) => {
    e.preventDefault();
    
    if (!draggedTask || draggedTask.id === targetTask.id) {
      return;
    }
    
    // Prevent dragging a task into its own descendant
    let current = targetTask;
    while (current.parent_task_id) {
      if (current.parent_task_id === draggedTask.id) {
        return; // Prevent dropping into descendant
      }
      current = tasks.find(t => t.id === current.parent_task_id);
    }
    
    // Get the mouse position within the task header
    const headerRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - headerRect.top;
    const headerHeight = headerRect.height;
    
    // Determine drop position based on mouse position
    // Top 25% - Before, Middle 50% - Into, Bottom 25% - After
    let position;
    if (mouseY < headerHeight * 0.25) {
      position = 'before';
    } else if (mouseY > headerHeight * 0.75) {
      position = 'after';
    } else {
      position = 'into';
    }
    
    // Special rule: If the target is top-level and the dragged task isn't, force 'into'
    if (!targetTask.parent_task_id && draggedTask.parent_task_id && position !== 'into') {
      position = 'into';
    }
    
    setDropTarget(targetTask);
    setDropPosition(position);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    // Only clear if we're leaving the actual drop target, not its children
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    // Restore visibility
    const taskElement = document.getElementById(`task-${draggedTask.id}`);
    if (taskElement) {
      taskElement.style.opacity = '1';
    }
    
    setDraggedTask(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  // Handle drop
  const handleDrop = async (e, targetTask) => {
    e.preventDefault();
    
    // Get the dragged task ID
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    
    if (!draggedTaskId || !draggedTask || !dropTarget || !dropPosition) {
      return;
    }
    
    try {
      const draggedTaskObj = tasks.find(t => t.id === draggedTaskId);
      const targetTaskObj = tasks.find(t => t.id === targetTask.id);
      
      if (!draggedTaskObj || !targetTaskObj) {
        return;
      }
      
      // Calculate the old and new parent IDs and positions
      const oldParentId = draggedTaskObj.parent_task_id;
      let newParentId, newPosition;
      
      if (dropPosition === 'into') {
        // Dropping INTO a task - task becomes a child of the target
        newParentId = targetTaskObj.id;
        
        // Position at the end of the target's children
        const targetChildren = tasks
          .filter(t => t.parent_task_id === targetTaskObj.id)
          .filter(t => t.id !== draggedTaskObj.id)
          .sort((a, b) => a.position - b.position);
        
        newPosition = targetChildren.length;
      } else {
        // Dropping BEFORE or AFTER - task becomes a sibling of the target
        newParentId = targetTaskObj.parent_task_id;
        
        // Get all siblings in the container (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTaskObj.parent_task_id)
          .filter(t => t.id !== draggedTaskObj.id)
          .sort((a, b) => a.position - b.position);
        
        const targetIndex = siblings.findIndex(t => t.id === targetTaskObj.id);
        newPosition = dropPosition === 'before' ? targetIndex : targetIndex + 1;
      }
      
      console.log('Moving task:', {
        task: draggedTaskObj.title,
        from: oldParentId,
        to: newParentId,
        position: newPosition,
        dropPosition
      });
      
      // Update the dragged task in the database
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          parent_task_id: newParentId,
          position: newPosition
        })
        .eq('id', draggedTaskObj.id);
      
      if (updateError) throw updateError;
      
      // Update positions of all affected tasks
      
      // 1. Update siblings in the old parent container
      if (oldParentId !== newParentId) {
        const oldSiblings = tasks
          .filter(t => t.parent_task_id === oldParentId)
          .filter(t => t.id !== draggedTaskObj.id)
          .sort((a, b) => a.position - b.position);
        
        for (let i = 0; i < oldSiblings.length; i++) {
          if (oldSiblings[i].position !== i) {
            await supabase
              .from('tasks')
              .update({ position: i })
              .eq('id', oldSiblings[i].id);
          }
        }
      }
      
      // 2. Update siblings in the new parent container
      const newSiblings = tasks
        .filter(t => t.parent_task_id === newParentId)
        .filter(t => t.id !== draggedTaskObj.id)
        .sort((a, b) => a.position - b.position);
      
      // Insert at new position and adjust other positions
      for (let i = 0; i < newSiblings.length; i++) {
        let adjustedPosition = i;
        if (i >= newPosition) {
          adjustedPosition = i + 1;
        }
        
        if (newSiblings[i].position !== adjustedPosition) {
          await supabase
            .from('tasks')
            .update({ position: adjustedPosition })
            .eq('id', newSiblings[i].id);
        }
      }
      
      // Refresh task list
      fetchTasks();
    } catch (err) {
      console.error('Error handling task drop:', err);
      alert('Failed to update task position. Please try again.');
    } finally {
      // Reset drag state
      setDraggedTask(null);
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Render a task and its children
  const renderTask = (task, parentTasks = []) => {
    const isExpanded = expandedTasks[task.id];
    const hasChildren = tasks.some(t => t.parent_task_id === task.id);
    const children = tasks
      .filter(t => t.parent_task_id === task.id)
      .sort((a, b) => a.position - b.position);
    
    const level = getTaskLevel(task);
    const isTopLevel = !task.parent_task_id;
    const backgroundColor = getBackgroundColor(level);
    
    // Determine if this task is the current drop target
    const isDropTarget = dropTarget && dropTarget.id === task.id;
    const isBeingDragged = draggedTask && draggedTask.id === task.id;
    
    return (
      <div 
        key={task.id}
        id={`task-${task.id}`}
        className={`task-container ${isBeingDragged ? 'being-dragged' : ''}`}
        style={{
          marginBottom: '12px',
          opacity: isBeingDragged ? 0.4 : 1
        }}
      >
        {/* Drop indicator for 'before' position */}
        {isDropTarget && dropPosition === 'before' && (
          <div className="drop-indicator before" style={{
            height: '3px',
            backgroundColor: '#3b82f6',
            position: 'absolute',
            left: 0,
            right: 0,
            top: '-2px',
            zIndex: 10
          }}></div>
        )}
        
        {/* Task header - main draggable/droppable area */}
        <div 
          className={`task-header ${isDropTarget && dropPosition === 'into' ? 'drop-target-into' : ''}`}
          draggable={!isTopLevel}
          onDragStart={(e) => handleDragStart(e, task)}
          onDragOver={(e) => handleDragOver(e, task)}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, task)}
          style={{
            backgroundColor,
            color: 'white',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
            position: 'relative',
            cursor: isTopLevel ? 'default' : 'grab',
            transform: isDropTarget && dropPosition === 'into' ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s ease',
            boxShadow: isDropTarget && dropPosition === 'into' ? '0 0 8px rgba(37, 99, 235, 0.3)' : 'none',
            border: isDropTarget && dropPosition === 'into' ? '2px dashed #3b82f6' : 'none',
            borderRadius: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {!isTopLevel && (
              <span style={{ marginRight: '8px' }}>☰</span>
            )}
            <input 
              type="checkbox"
              checked={task.is_complete || false}
              onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
              style={{ marginRight: '12px' }}
            />
            <span style={{ 
              textDecoration: task.is_complete ? 'line-through' : 'none',
              opacity: task.is_complete ? 0.7 : 1
            }}>
              {task.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '12px' }}>Due: {formatDate(task.due_date)}</span>
            <button 
              onClick={(e) => toggleExpandTask(task.id, e)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0 4px'
              }}
            >
              {isExpanded ? '▼' : '►'}
            </button>
          </div>
        </div>
        
        {/* Drop indicator for 'after' position */}
        {isDropTarget && dropPosition === 'after' && (
          <div className="drop-indicator after" style={{
            height: '3px',
            backgroundColor: '#3b82f6',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '-2px',
            zIndex: 10
          }}></div>
        )}
        
        {/* Children container */}
        {isExpanded && hasChildren && (
          <div style={{ 
            paddingLeft: '24px',
            paddingTop: '8px'
          }}>
            {children.map(child => renderTask(child, [...parentTasks, task]))}
          </div>
        )}
      </div>
    );
  };

  // Render top-level tasks
  const renderTopLevelTasks = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => a.position - b.position);
      
    return topLevelTasks.map(task => renderTask(task));
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Tasks</h1>
        <button 
          onClick={fetchTasks}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          Loading...
        </div>
      ) : error ? (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          No tasks found. Create your first task to get started!
        </div>
      ) : (
        <div>{renderTopLevelTasks()}</div>
      )}
      
      {/* Debug section */}
      <details style={{ 
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px'
      }}>
        <summary style={{ 
          cursor: 'pointer',
          color: '#3b82f6',
          fontWeight: '500'
        }}>
          Debug Information
        </summary>
        <div style={{ marginTop: '8px' }}>
          <p>Total tasks: {tasks.length}</p>
          <p>Top-level tasks: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Dragging: {draggedTask ? draggedTask.title : 'None'}</p>
          <p>Drop target: {dropTarget ? `${dropTarget.title} (${dropPosition})` : 'None'}</p>
          <details>
            <summary>Task Positions</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(
                tasks.map(t => ({ 
                  id: t.id, 
                  title: t.title,
                  position: t.position, 
                  parent: t.parent_task_id 
                })), 
                null, 
                2
              )}
            </pre>
          </details>
        </div>
      </details>
    </div>
  );
};

export default TaskList;