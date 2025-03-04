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
  const [activeDropZone, setActiveDropZone] = useState(null);

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
// Handle drag over
  

  // Handle drag leave
  const handleDragLeave = (e) => {
    // Only clear if we're leaving the actual drop target, not its children
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Handle drag end
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
    setActiveDropZone(null); // Add this line
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
  
  // Clear any active drop zone
  setActiveDropZone(null);
  
  // Get the mouse position within the task header
  const headerRect = e.currentTarget.getBoundingClientRect();
  const mouseY = e.clientY - headerRect.top;
  const headerHeight = headerRect.height;
  
  // Only handle the "into" position here
  // Top and bottom areas are now handled by drop zones
  if (mouseY >= headerHeight * 0.25 && mouseY <= headerHeight * 0.75) {
    setDropTarget(targetTask);
    setDropPosition('into');
  } else {
    setDropTarget(null);
    setDropPosition(null);
  }
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
      // Case 2: Dropping BETWEEN tasks (after the target task)
      else if (dropPosition === 'between-after') {
        // If target has an ID, it's a task; otherwise, it's the root
        newParentId = targetTask.parent_task_id;
        
        // Get siblings at the target level (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id)
          .filter(t => t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Find the target's index among its siblings
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        
        // For between-after, position is after the target
        newPosition = targetIndex + 1;
      }
      // Case 3: Dropping BETWEEN tasks (before the target task)
      else if (dropPosition === 'between-before') {
        newParentId = targetTask.parent_task_id;
        
        // Get siblings at the target level (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id)
          .filter(t => t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Find the target's index among its siblings
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        
        // For between-before, position is at the target
        newPosition = targetIndex >= 0 ? targetIndex : 0;
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

  // Render a task and its children with drop zones between them
  // Render a task and its children with drop zones
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
  
  // Render children with drop zones
  let childrenContent = null;
  
  if (isExpanded && hasChildren) {
    const childrenWithDropZones = [];
    
    // Add a drop zone at the beginning (position 0)
    childrenWithDropZones.push(
      <TaskDropZone 
        key={`dropzone-${task.id}-0`}
        parentId={task.id}
        position={0}
        prevTask={null}
        nextTask={children[0]}
        draggedTask={draggedTask}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        isActive={isDropZoneActive(task.id, 0)}
      />
    );
    
    // Add children with drop zones between them
    children.forEach((child, index) => {
      // Add the child
      childrenWithDropZones.push(renderTask(child, [...parentTasks, task]));
      
      // Add a drop zone after the child (if not the last child)
      if (index < children.length - 1) {
        childrenWithDropZones.push(
          <TaskDropZone 
            key={`dropzone-${task.id}-${index + 1}`}
            parentId={task.id}
            position={index + 1}
            prevTask={child}
            nextTask={children[index + 1]}
            draggedTask={draggedTask}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
            isActive={isDropZoneActive(task.id, index + 1)}
          />
        );
      }
    });
    
    // Add a final drop zone at the end
    childrenWithDropZones.push(
      <TaskDropZone 
        key={`dropzone-${task.id}-${children.length}`}
        parentId={task.id}
        position={children.length}
        prevTask={children[children.length - 1]}
        nextTask={null}
        draggedTask={draggedTask}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        isActive={isDropZoneActive(task.id, children.length)}
      />
    );
    
    childrenContent = (
      <div style={{ 
        paddingLeft: '24px',
        paddingTop: '0'
      }}>
        {childrenWithDropZones}
      </div>
    );
  }
  
  return (
    <div 
      key={task.id}
      id={`task-${task.id}`}
      className={`task-container ${isBeingDragged ? 'being-dragged' : ''}`}
    >
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
      
      {/* Children with drop zones */}
      {childrenContent}
    </div>
  );
};

  // Render top-level tasks with drop zones between them
const renderTopLevelTasks = () => {
  const topLevelTasks = tasks
    .filter(task => !task.parent_task_id)
    .sort((a, b) => a.position - b.position);
  
  if (topLevelTasks.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        color: '#6b7280'
      }}>
        No tasks found. Create your first task to get started!
      </div>
    );
  }
  
  const taskElements = [];
  
  // Add a drop zone at the beginning (position 0)
  taskElements.push(
    <TaskDropZone 
      key="dropzone-root-0"
      parentId={null}
      position={0}
      prevTask={null}
      nextTask={topLevelTasks[0]}
      draggedTask={draggedTask}
      onDragOver={handleDropZoneDragOver}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={handleDropZoneDrop}
      isActive={isDropZoneActive(null, 0)}
    />
  );
  
  // Add tasks with drop zones between them
  topLevelTasks.forEach((task, index) => {
    // Add the task
    taskElements.push(renderTask(task));
    
    // Add a drop zone after the task (if not the last task)
    if (index < topLevelTasks.length - 1) {
      taskElements.push(
        <TaskDropZone 
          key={`dropzone-root-${index + 1}`}
          parentId={null}
          position={index + 1}
          prevTask={task}
          nextTask={topLevelTasks[index + 1]}
          draggedTask={draggedTask}
          onDragOver={handleDropZoneDragOver}
          onDragLeave={handleDropZoneDragLeave}
          onDrop={handleDropZoneDrop}
          isActive={isDropZoneActive(null, index + 1)}
        />
      );
    }
  });
  
  // Add a final drop zone at the end
  taskElements.push(
    <TaskDropZone 
      key={`dropzone-root-${topLevelTasks.length}`}
      parentId={null}
      position={topLevelTasks.length}
      prevTask={topLevelTasks[topLevelTasks.length - 1]}
      nextTask={null}
      draggedTask={draggedTask}
      onDragOver={handleDropZoneDragOver}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={handleDropZoneDrop}
      isActive={isDropZoneActive(null, topLevelTasks.length)}
    />
  );
  
  return taskElements;
};

  // New TaskDropZone component
  const TaskDropZone = ({ parentId, position, prevTask, nextTask, 
      draggedTask, onDragOver, onDragLeave, onDrop, isActive }) => {
    return (
      <div 
        className={`task-drop-zone ${isActive ? 'active' : ''}`}
        onDragOver={(e) => onDragOver(e, parentId, position, prevTask, nextTask)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, parentId, position)}
      >
        <div className="indicator"></div>
      </div>
    );
  };

  // Helper function to check if a drop zone is active
  const isDropZoneActive = (parentId, position) => {
    return activeDropZone && 
          activeDropZone.parentId === parentId && 
          activeDropZone.position === position;
  };

  // Handler for dragging over a drop zone
  const handleDropZoneDragOver = (e, parentId, position, prevTask, nextTask) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Don't allow dropping between a task and itself
    if ((prevTask && draggedTask.id === prevTask.id) || 
        (nextTask && draggedTask.id === nextTask.id)) {
      return;
    }
    
    // Don't allow dragging a task into its own descendant's container
    if (prevTask) {
      let current = prevTask;
      while (current && current.parent_task_id) {
        if (current.parent_task_id === draggedTask.id) {
          return; // Prevent dropping into descendant
        }
        current = tasks.find(t => t.id === current.parent_task_id);
      }
    }
    
    if (nextTask) {
      let current = nextTask;
      while (current && current.parent_task_id) {
        if (current.parent_task_id === draggedTask.id) {
          return; // Prevent dropping into descendant
        }
        current = tasks.find(t => t.id === current.parent_task_id);
      }
    }
    
    // Set the active drop zone
    setActiveDropZone({ parentId, position });
    
    // Reset the task drop target (we're not dropping onto a task)
    setDropTarget(null);
    setDropPosition(null);
  };

  // Handler for leaving a drop zone
  const handleDropZoneDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setActiveDropZone(null);
    }
  };

// Handler for dropping on a drop zone
// const handleDropZoneDrop = async (e, parentId, position) => {
//   e.preventDefault();
  
//   if (!draggedTask || !activeDropZone) return;
  
//   try {
//     // Calculate the new position
//     const newParentId = parentId;
//     const newPosition = position;
    
//     // Track whether we're changing parents
//     const oldParentId = draggedTask.parent_task_id;
//     const isSameParent = oldParentId === newParentId;
    
//     // Optimistically update the frontend state
//     setTasks(prevTasks => {
//       // Create a deep copy to work with
//       const updatedTasks = prevTasks.map(t => ({...t}));
      
//       // 1. Handle old parent container (update positions of remaining tasks)
//       if (!isSameParent) {
//         const oldSiblings = updatedTasks
//           .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
//           .sort((a, b) => a.position - b.position);
          
//         // Normalize positions after removing the dragged task
//         oldSiblings.forEach((task, index) => {
//           task.position = index;
//         });
//       }
      
//       // 2. Handle new parent container (make space for dragged task)
//       const newSiblings = updatedTasks
//         .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
//         .sort((a, b) => a.position - b.position);
      
//       // Shift positions for tasks after the insertion point
//       newSiblings.forEach(task => {
//         if (task.position >= newPosition) {
//           task.position += 1;
//         }
//       });
      
//       // 3. Update the dragged task
//       const taskToUpdate = updatedTasks.find(t => t.id === draggedTask.id);
//       if (taskToUpdate) {
//         taskToUpdate.parent_task_id = newParentId;
//         taskToUpdate.position = newPosition;
//       }
      
//       return updatedTasks;
//     });
    
//     // Update the database
//     // 1. Update the dragged task in Supabase
//     const { error: updateError } = await supabase
//       .from('tasks')
//       .update({
//         parent_task_id: newParentId,
//         position: newPosition
//       })
//       .eq('id', draggedTask.id);
      
//     if (updateError) throw updateError;
    
//     // 2. Update positions in old parent container (if we changed parents)
//     if (!isSameParent) {
//       const oldSiblings = tasks
//         .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
//         .sort((a, b) => a.position - b.position);
        
//       for (let i = 0; i < oldSiblings.length; i++) {
//         if (oldSiblings[i].position !== i) {
//           await supabase
//             .from('tasks')
//             .update({ position: i })
//             .eq('id', oldSiblings[i].id);
//         }
//       }
//     }
    
//     // 3. Update positions in new parent container
//     const newSiblings = tasks
//       .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
//       .sort((a, b) => a.position - b.position);
    
//     for (let i = 0; i < newSiblings.length; i++) {
//       // Calculate the correct position (accounting for the insertion)
//       let correctPosition = i;
//       if (i >= newPosition) correctPosition = i + 1;
      
//       if (newSiblings[i].position !== correctPosition) {
//         await supabase
//           .from('tasks')
//           .update({ position: correctPosition })
//           .eq('id', newSiblings[i].id);
//       }
//     }
    
//   } catch (err) {
//     console.error('Error updating task positions:', err);
//     alert('Failed to update task position. Please try again.');
//     fetchTasks();
//   } finally {
//     // Reset drag state
//     setDraggedTask(null);
//     setActiveDropZone(null);
//     setDropTarget(null);
//     setDropPosition(null);
//   }
// };

  // Handler for dropping on a drop zone
  const handleDropZoneDrop = async (e, parentId, position) => {
    e.preventDefault();
    
    if (!draggedTask || !activeDropZone) return;
    
    try {
      // Calculate the new position
      const newParentId = parentId;
      const newPosition = position;
      
      // Track whether we're changing parents
      const oldParentId = draggedTask.parent_task_id;
      const isSameParent = oldParentId === newParentId;
      
      // Optimistically update the frontend state
      setTasks(prevTasks => {
        // Create a deep copy to work with
        const updatedTasks = prevTasks.map(t => ({...t}));
        
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
      
      // Update the database
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
    fetchTasks();
  } finally {
    // Reset drag state
    setDraggedTask(null);
    setActiveDropZone(null);
    setDropTarget(null);
    setDropPosition(null);
  }
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