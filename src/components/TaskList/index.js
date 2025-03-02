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
  // Handle drop
const handleDrop = async (e, targetTask) => {
    e.preventDefault();
  
    // Validate essential data is present
    if (!draggedTask || !dropTarget || !dropPosition) {
      return;
    }
  
    try {
      // Calculate the new parent ID and position
      let newParentId, newPosition;
  
      // Case 1: Dropping INTO a task (making it a child)
      if (dropPosition === 'into') {
        newParentId = targetTask.id;
        
        // Count existing children to place at the end
        const childrenCount = tasks.filter(t => t.parent_task_id === targetTask.id && t.id !== draggedTask.id).length;
        newPosition = childrenCount;
      } 
      // Case 2: Dropping BEFORE or AFTER a task (making it a sibling)
      else {
        newParentId = targetTask.parent_task_id;
        
        // Get siblings at the target level (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id)
          .filter(t => t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Find the target's index among its siblings
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        
        // Set position based on whether it's before or after
        if (dropPosition === 'before') {
          newPosition = targetIndex >= 0 ? targetIndex : 0;
        } else { // 'after'
          newPosition = targetIndex + 1;
        }
      }
  
      // Track whether we're changing parents
      const oldParentId = draggedTask.parent_task_id;
      const isSameParent = oldParentId === newParentId;
  
      // Store original positions for rollback if needed
      const originalTasks = [...tasks];
      
      // STEP 1: Optimistically update the frontend state first
      setTasks(prevTasks => {
        // Create a deep copy to work with
        const updatedTasks = prevTasks.map(t => ({...t}));
        
        // We only need to update the dragged task itself
        // Its children will automatically follow because they reference the parent by ID
        
        // 1. Handle old parent container (update positions of remaining tasks)
        if (!isSameParent) {
          const oldSiblings = updatedTasks
            .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
            .sort((a, b) => a.position - b.position);
            
          // Normalize positions after removing the dragged task
          oldSiblings.forEach((task, index) => {
            task.position = index;
          });
        }
        
        // 2. Handle new parent container (make space for dragged task)
        const newSiblings = updatedTasks
          .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Shift positions for tasks after the insertion point
        newSiblings.forEach(task => {
          if (task.position >= newPosition) {
            task.position += 1;
          }
        });
        
        // 3. Update the dragged task
        const taskToUpdate = updatedTasks.find(t => t.id === draggedTask.id);
        if (taskToUpdate) {
          taskToUpdate.parent_task_id = newParentId;
          taskToUpdate.position = newPosition;
        }
        
        return updatedTasks;
      });
      
      // STEP 2: Update the database
      
      // 1. Update the dragged task in Supabase
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          parent_task_id: newParentId,
          position: newPosition
        })
        .eq('id', draggedTask.id);
        
      if (updateError) throw updateError;
      
      // 2. Update positions in old parent container (if we changed parents)
      if (!isSameParent) {
        const oldSiblings = tasks
          .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
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
      
      // 3. Update positions in new parent container
      const newSiblings = tasks
        .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < newSiblings.length; i++) {
        // Calculate the correct position (accounting for the insertion)
        let correctPosition = i;
        if (i >= newPosition) correctPosition = i + 1;
        
        if (newSiblings[i].position !== correctPosition) {
          await supabase
            .from('tasks')
            .update({ position: correctPosition })
            .eq('id', newSiblings[i].id);
        }
      }
      
    } catch (err) {
      console.error('Error updating task positions:', err);
      alert('Failed to update task position. Please try again.');
      
      // Revert to the original state in case of error
      fetchTasks();
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