// src/components/TaskList/TaskList.js - FINAL INTEGRATED VERSION
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskForm from '../TaskForm/TaskForm';
import NewProjectForm from '../TaskForm/NewProjectForm';
import HTML5DragDropZone from './HTML5DragDropZone'; // ✅ NEW: Use dedicated component
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import {
  updateTaskCompletion,
  deleteTask,
  updateTaskComplete,
} from '../../services/taskService';
import TaskDetailsPanel from './TaskDetailsPanel';
import TemplateProjectCreator from '../TemplateProject/TemplateProjectCreator';
import InvitationTest from '../InvitationTest';
import SearchBar from '../Search/SearchBar';
import SearchResults from '../Search/SearchResults';
import { useSearch } from '../contexts/SearchContext';

const TaskList = () => {
  /* ------------------------- refs ------------------------- */
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);

  /* ----------------------- context ------------------------ */
  const {
    instanceTasks: tasks,
    loading,
    initialLoading,
    error,
    fetchTasks,
    setTasks,
    createTask,
    selectedLicenseId,
    userHasProjects,
    updateTaskDates,
    getTaskStartDate,
    getTaskDueDate,
    // ✅ NEW: Get optimistic update helpers from context
    handleOptimisticDragDrop,
    updateTasksOptimistic,
    recalculateDatesOptimistic,
    syncTaskPositionToDatabase,
    ...restContext
  } = useTasks();

  const { isSearchActive, filteredTasks } = useSearch();

  /* ---------------------- local state --------------------- */
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectLicenseId, setProjectLicenseId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showInvitationTest, setShowInvitationTest] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // ✅ SIMPLIFIED: Drag state for HTML5 drag and drop
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragHoverTarget, setDragHoverTarget] = useState(null);
  const [dragCount, setDragCount] = useState(0);

  /* -------------------- lifecycle hooks ------------------- */
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedLicenseId) {
      setProjectLicenseId(selectedLicenseId);
    }
  }, [selectedLicenseId]);

  /* ------------------- helper functions ------------------- */
  
  // Get all visible tasks in a flattened array respecting expansion state
  const getVisibleTasks = useMemo(() => {
    const result = [];
    
    const addTaskAndChildren = (task, level = 0) => {
      result.push({ ...task, level });
      
      if (expandedTasks[task.id]) {
        const children = tasks
          .filter(t => t.parent_task_id === task.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        
        children.forEach(child => addTaskAndChildren(child, level + 1));
      }
    };

    // Start with top-level tasks
    const topLevelTasks = tasks
      .filter(t => !t.parent_task_id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    topLevelTasks.forEach(task => addTaskAndChildren(task));
    
    return result;
  }, [tasks, expandedTasks]);

  // Check if task has children
  const hasChildren = (task) => {
    return tasks.some(t => t.parent_task_id === task.id);
  };

  // ✅ SIMPLIFIED: HTML5 Drag Handlers (now use context helpers)
  const handleDragStart = (task) => {
    // Prevent dragging top-level tasks
    if (!task.parent_task_id) {
      return false;
    }
    
    setDraggedTask(task);
    setDragHoverTarget(null);
    console.log('🎯 Drag started:', task.title);
    return true;
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragHoverTarget(null);
    console.log('🎯 Drag ended');
  };

  const handleDragOver = (task, event) => {
    if (!draggedTask || (task && task.id === draggedTask.id)) {
      setDragHoverTarget(null);
      return;
    }

    if (event === 'enter' || event === 'over') {
      if (task) {
        const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
        const targetIndex = tasks.findIndex(t => t.id === task.id);
        
        setDragHoverTarget({
          ...task,
          position: draggedIndex < targetIndex ? 'below' : 'above'
        });
      }
    } else if (event === 'leave') {
      setDragHoverTarget(null);
    }
  };

  // ✅ SIMPLIFIED: Handle dropping task onto another task (reordering)
  const handleDropOnTask = (draggedId, targetId) => {
    const draggedTaskObj = tasks.find(t => t.id === draggedId);
    const targetTask = tasks.find(t => t.id === targetId);
    
    if (!draggedTaskObj || !targetTask) return;
    
    console.log('🎯 Task dropped onto task:', {
      draggedTask: draggedTaskObj.title,
      targetTask: targetTask.title,
      sameParent: draggedTaskObj.parent_task_id === targetTask.parent_task_id
    });

    // Determine new position based on drop type
    let newParentId, newPosition;
    
    if (targetTask.parent_task_id === draggedTaskObj.parent_task_id) {
      // Same parent - reorder within same container
      newParentId = targetTask.parent_task_id;
      const siblings = tasks.filter(t => t.parent_task_id === newParentId && t.id !== draggedId)
        .sort((a, b) => a.position - b.position);
      const targetIndex = siblings.findIndex(t => t.id === targetId);
      
      const draggedCurrentIndex = tasks.filter(t => t.parent_task_id === newParentId)
        .sort((a, b) => a.position - b.position)
        .findIndex(t => t.id === draggedId);
      const targetCurrentIndex = tasks.filter(t => t.parent_task_id === newParentId)
        .sort((a, b) => a.position - b.position)
        .findIndex(t => t.id === targetId);
      
      // Calculate insert position
      const insertIndex = draggedCurrentIndex < targetCurrentIndex ? targetIndex + 1 : targetIndex;
      newPosition = (insertIndex + 1) * 1000; // Sparse positioning
    } else {
      // Different parent - move to target's parent
      newParentId = targetTask.parent_task_id;
      newPosition = targetTask.position + 500; // Insert after target
    }
    
    // ✅ USE CONTEXT HELPER: Single function call for optimistic update
    handleOptimisticDragDrop(draggedId, newParentId, newPosition, draggedTaskObj.parent_task_id);
    setDragCount(prev => prev + 1);
    setDragHoverTarget(null);
  };

  // ✅ SIMPLIFIED: Handle dropping between tasks
  const handleDropBetween = (draggedId, parentId, position) => {
    console.log('🎯 Dropped between at position:', position);
    
    const draggedTaskObj = tasks.find(t => t.id === draggedId);
    if (!draggedTaskObj) return;
    
    const newPosition = position * 1000; // Sparse positioning
    
    // ✅ USE CONTEXT HELPER: Single function call
    handleOptimisticDragDrop(draggedId, parentId, newPosition, draggedTaskObj.parent_task_id);
    setDragCount(prev => prev + 1);
    setDragHoverTarget(null);
  };

  // ✅ SIMPLIFIED: Handle dropping onto a task container (making it a child)
  const handleDropOnto = (draggedId, parentId) => {
    console.log('🎯 Dropped onto parent:', parentId);
    
    const draggedTaskObj = tasks.find(t => t.id === draggedId);
    if (!draggedTaskObj) return;
    
    // Find new position (append to end)
    const existingChildren = tasks.filter(t => t.parent_task_id === parentId);
    const newPosition = existingChildren.length > 0 ? 
      Math.max(...existingChildren.map(t => t.position || 0)) + 1000 : 1000;
    
    // ✅ USE CONTEXT HELPER: Single function call
    handleOptimisticDragDrop(draggedId, parentId, newPosition, draggedTaskObj.parent_task_id);
    setDragCount(prev => prev + 1);
    setDragHoverTarget(null);
  };

  /* ----------------------- handlers ----------------------- */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchTasks(true);
    } catch (err) {
      console.error('Error refreshing tasks:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  /* ---------- expand / select / CRUD handlers ---------- */
  const toggleExpandTask = (taskId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const selectTask = (taskId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (addingChildToTaskId && addingChildToTaskId !== taskId) {
      setAddingChildToTaskId(null);
    }
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      const res = await updateTaskCompletion(taskId, currentStatus);
      if (!res.success) throw new Error(res.error);
      if (isMountedRef.current) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_complete: !currentStatus } : t)));
      }
    } catch (err) {
      console.error('Error updating completion:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };

  /* ---------- project / template / child task helpers ---------- */
  const handleCreateNewProject = () => {
    setIsCreatingFromTemplate(false);
    setAddingChildToTaskId(null);
    setSelectedTaskId(null);
    setIsCreatingProject(true);
  };

  const handleProjectCreated = async (projectData) => {
    try {
      await fetchTasks(true);
      setSelectedTaskId(projectData.id);
      setProjectLicenseId(null);
      setIsCreatingProject(false);
    } catch (err) {
      console.error(err);
      alert(`Error refreshing data: ${err.message}`);
    }
  };

  const handleCancelProjectCreation = () => {
    setIsCreatingProject(false);
    setProjectLicenseId(null);
  };

  const handleAddChildTask = (parentId) => {
    setSelectedTaskId(parentId);
    setAddingChildToTaskId(parentId);
    setExpandedTasks((prev) => ({ ...prev, [parentId]: true }));
  };

  const handleAddChildTaskSubmit = async (taskData) => {
    try {
      const newTask = { ...taskData, origin: 'instance', is_complete: false, due_date: taskData.due_date || null };
      const res = await createTask(newTask);
      if (res.error) throw new Error(res.error);
      await fetchTasks(true);
      setAddingChildToTaskId(null);
      if (taskData.parent_task_id) {
        setExpandedTasks((prev) => ({ ...prev, [taskData.parent_task_id]: true }));
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to create task: ${err.message}`);
    }
  };

  const handleCancelAddTask = () => setAddingChildToTaskId(null);

  const handleDeleteTask = async (taskId) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const hasChildrenToDelete = tasks.some((t) => t.parent_task_id === taskId);
    let msg = hasChildrenToDelete
      ? 'This task has subtasks that will also be deleted. Continue?'
      : 'Are you sure you want to delete this task?';
    msg += ' This action cannot be undone.';
    if (!window.confirm(msg)) return;

    try {
      const res = await deleteTask(taskId, true);
      if (!res.success) throw new Error(res.error);
      const deletedIds = Array.isArray(res.deletedIds) ? res.deletedIds : [taskId];
      setTasks((prev) => prev.filter((t) => !deletedIds.includes(t.id)));
      if (deletedIds.includes(selectedTaskId)) setSelectedTaskId(null);
      const count = deletedIds.length - 1;
      alert(
        hasChildrenToDelete ? `Task and ${count} subtask${count !== 1 ? 's' : ''} deleted.` : 'Task deleted successfully'
      );
      await fetchTasks(true);
    } catch (err) {
      console.error(err);
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  const handleEditTask = async (taskId, updatedData) => {
    try {
      const res = await updateTaskComplete(taskId, updatedData);
      if (!res.success) throw new Error(res.error || 'Update failed');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...res.data } : t)));
      alert('Task updated successfully');
      await fetchTasks(true);
    } catch (err) {
      console.error(err);
      alert(`Failed to update task: ${err.message}`);
    }
  };

  const handleCreateFromTemplate = () => {
    setIsCreatingProject(false);
    setAddingChildToTaskId(null);
    setSelectedTaskId(null);
    setIsCreatingFromTemplate(true);
  };

  const handleProjectFromTemplateCreated = async (projectData) => {
    try {
      await fetchTasks(true);
      setSelectedTaskId(projectData.id);
      setIsCreatingFromTemplate(false);
    } catch (err) {
      console.error(err);
      alert(`Error refreshing data: ${err.message}`);
    }
  };

  const handleCancelTemplateProjectCreation = () => setIsCreatingFromTemplate(false);

  /* ---------------------- render helpers ------------------- */
  
  // ✅ ENHANCED: Use dedicated HTML5DragDropZone component
  const renderTasksWithHTML5DropZones = () => {
    if (getVisibleTasks.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          No projects found. Create your first project to get started!
        </div>
      );
    }

    return (
      <div style={{ minHeight: '400px' }}>
        {/* Drop zone at the very top */}
        <HTML5DragDropZone 
          type="between"
          parentId={null}
          position={0}
          level={0}
          onDropBetween={handleDropBetween}
          isDragActive={!!draggedTask}
          debugMode={process.env.NODE_ENV === 'development'}
        />
        
        {getVisibleTasks.map((task, index) => {
          const showChildDropZone = hasChildren(task) && expandedTasks[task.id];
          
          return (
            <React.Fragment key={task.id}>
              {/* The task itself */}
              <TaskItem
                task={task}
                tasks={tasks}
                level={task.level}
                expandedTasks={expandedTasks}
                toggleExpandTask={toggleExpandTask}
                selectedTaskId={selectedTaskId}
                selectTask={selectTask}
                onAddChildTask={handleAddChildTask}
                hasChildren={hasChildren(task)}
                toggleTaskCompletion={toggleTaskCompletion}
                // HTML5 drag props
                isDragging={draggedTask?.id === task.id}
                dragHoverTarget={dragHoverTarget}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDropOnTask}
              />
              
              {/* Drop zone for children (if task is expanded) */}
              {showChildDropZone && (
                <HTML5DragDropZone 
                  type="into"
                  parentId={task.id}
                  position={0}
                  level={task.level}
                  onDropInto={handleDropOnto}
                  isDragActive={!!draggedTask}
                  debugMode={process.env.NODE_ENV === 'development'}
                />
              )}

              {/* Drop zone between tasks */}
              <HTML5DragDropZone 
                type="between"
                parentId={task.parent_task_id}
                position={index + 1}
                level={task.level}
                onDropBetween={handleDropBetween}
                isDragActive={!!draggedTask}
                debugMode={process.env.NODE_ENV === 'development'}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderRightPanel = () => {
    if (showInvitationTest) return <InvitationTest />;
    if (isCreatingProject)
      return (
        <NewProjectForm
          onSuccess={handleProjectCreated}
          onCancel={handleCancelProjectCreation}
          userHasProjects={userHasProjects}
        />
      );
    if (isCreatingFromTemplate)
      return (
        <TemplateProjectCreator
          onSuccess={handleProjectFromTemplateCreated}
          onCancel={handleCancelTemplateProjectCreation}
          userHasProjects={userHasProjects}
        />
      );
    if (!selectedTaskId)
      return (
        <div
          className="empty-details-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            border: '1px dashed #d1d5db',
            padding: '24px',
          }}
        >
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p style={{ marginTop: '16px', textAlign: 'center' }}>Select a task to view its details</p>
        </div>
      );

    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return null;

    if (addingChildToTaskId === selectedTaskId) {
      return (
        <TaskForm
          parentTaskId={selectedTaskId}
          onSubmit={handleAddChildTaskSubmit}
          onCancel={handleCancelAddTask}
          backgroundColor={getBackgroundColor(getTaskLevel(task, tasks))}
          originType="instance"
        />
      );
    }

    return (
      <TaskDetailsPanel
        key={`${task.id}-${task.is_complete}`}
        task={task}
        tasks={tasks}
        toggleTaskCompletion={toggleTaskCompletion}
        onClose={() => setSelectedTaskId(null)}
        onAddChildTask={handleAddChildTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
      />
    );
  };

  /* ---------------------- search helpers ------------------- */
  const handleTaskSelectFromSearch = (task) => {
    setSelectedTaskId(task.id);
    setShowSearchResults(false);
  };
  const toggleSearchResults = () => setShowSearchResults((prev) => !prev);

  /* ------------------------- render ------------------------ */
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Debug info for development */}
      {draggedTask && process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          backgroundColor: '#ff9800', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '4px', 
          fontSize: '12px', 
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          🚀 Dragging: {draggedTask.title} | Moves: {dragCount}
        </div>
      )}
      
      <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
        {/* LEFT PANEL */}
        <div style={{ flex: '1 1 60%', marginRight: '24px', overflow: 'auto' }}>
          <SearchBar onToggleResults={toggleSearchResults} />

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Projects</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowInvitationTest((prev) => !prev)}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                🧪 Invitations
              </button>
              <div className="dropdown" style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowProjectMenu((prev) => !prev)}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  New Project <span style={{ fontSize: '10px', marginTop: '2px' }}>▼</span>
                </button>
                {showProjectMenu && (
                  <div
                    className="project-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 10,
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      width: '200px',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
                      onClick={() => {
                        handleCreateNewProject();
                        setShowProjectMenu(false);
                      }}
                    >
                      Blank Project
                    </div>
                    <div style={{ borderTop: '1px solid #e5e7eb' }} />
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
                      onClick={() => {
                        handleCreateFromTemplate();
                        setShowProjectMenu(false);
                      }}
                    >
                      From Template
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: loading || isRefreshing ? 'not-allowed' : 'pointer',
                  border: 'none',
                  opacity: loading || isRefreshing ? 0.7 : 1,
                }}
              >
                {loading || isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* SEARCH BANNER */}
          {isSearchActive && !showSearchResults && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#1e40af' }}>
                {filteredTasks.length} task{filteredTasks.length !== 1 && 's'} match your search
              </span>
              <button
                onClick={() => setShowSearchResults(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline',
                }}
              >
                View Results
              </button>
            </div>
          )}

          {/* CONDITIONAL CONTENT */}
          {initialLoading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  margin: '0 auto',
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading your projects...</p>
            </div>
          ) : error ? (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #ef4444',
                color: '#b91c1c',
                padding: '16px',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          ) : getVisibleTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              <p>No projects found. Create your first project to get started!</p>
              <button
                onClick={handleCreateNewProject}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
                  marginTop: '16px',
                }}
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div>{renderTasksWithHTML5DropZones()}</div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: '1 1 40%', minWidth: '300px', maxWidth: '500px' }}>{renderRightPanel()}</div>

        {showSearchResults && (
          <SearchResults onTaskSelect={handleTaskSelectFromSearch} onClose={() => setShowSearchResults(false)} />
        )}
      </div>
    </div>
  );
};

export default TaskList;