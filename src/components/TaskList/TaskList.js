import React, { useEffect, useState } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskDropZone from './TaskDropZone';
import useTaskDragAndDrop from '../utils/useTaskDragAndDrop';
import { fetchAllTasks } from '../services/taskService';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks();

      if (error) throw new Error(error);
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
  
  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
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
        draggedTask={dragAndDrop.draggedTask}
        onDragOver={dragAndDrop.handleDropZoneDragOver}
        onDragLeave={dragAndDrop.handleDropZoneDragLeave}
        onDrop={dragAndDrop.handleDropZoneDrop}
        isActive={dragAndDrop.isDropZoneActive(null, 0)}
      />
    );
    
    // Add tasks with drop zones between them
    topLevelTasks.forEach((task, index) => {
      // Add the task
      taskElements.push(
        <TaskItem 
          key={task.id}
          task={task}
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
        />
      );
      
      // Add a drop zone after the task (if not the last task)
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <TaskDropZone 
            key={`dropzone-root-${index + 1}`}
            parentId={null}
            position={index + 1}
            prevTask={task}
            nextTask={topLevelTasks[index + 1]}
            draggedTask={dragAndDrop.draggedTask}
            onDragOver={dragAndDrop.handleDropZoneDragOver}
            onDragLeave={dragAndDrop.handleDropZoneDragLeave}
            onDrop={dragAndDrop.handleDropZoneDrop}
            isActive={dragAndDrop.isDropZoneActive(null, index + 1)}
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
        draggedTask={dragAndDrop.draggedTask}
        onDragOver={dragAndDrop.handleDropZoneDragOver}
        onDragLeave={dragAndDrop.handleDropZoneDragLeave}
        onDrop={dragAndDrop.handleDropZoneDrop}
        isActive={dragAndDrop.isDropZoneActive(null, topLevelTasks.length)}
      />
    );
    
    return taskElements;
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
          <p>Dragging: {dragAndDrop.draggedTask ? dragAndDrop.draggedTask.title : 'None'}</p>
          <p>Drop target: {dragAndDrop.dropTarget ? `${dragAndDrop.dropTarget.title} (${dragAndDrop.dropPosition})` : 'None'}</p>
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