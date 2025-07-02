// src/components/TaskList/TaskList.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskForm from '../TaskForm/TaskForm';
import NewProjectForm from '../TaskForm/NewProjectForm';
import DndContextProvider from '../dnd/DndContextProvider';
import SortableTaskWrapper from '../dnd/SortableTaskWrapper';
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import {
  updateTaskCompletion,
  deleteTask,
  updateTaskComplete,
  updateTaskPosition,
} from '../../services/taskService';
import TaskDetailsPanel from './TaskDetailsPanel';
import TemplateProjectCreator from '../TemplateProject/TemplateProjectCreator';
import InvitationTest from '../InvitationTest';
import SearchBar from '../Search/SearchBar';
import SearchResults from '../Search/SearchResults';
import { useSearch } from '../contexts/SearchContext';

// Drop Zone Component
const DropZone = ({ type, parentId, position, onDragOver, onDrop, isActive }) => {
  const dropData = {
    type, // 'between' or 'into'
    parentId,
    position
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDrop(dropData);
  };

  if (type === 'between') {
    return (
      <div 
        className={`drop-zone-between ${isActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          height: '4px',
          margin: '2px 0',
          borderRadius: '2px',
          backgroundColor: isActive ? '#3b82f6' : 'transparent',
          transition: 'background-color 0.2s ease'
        }}
      />
    );
  }

  if (type === 'into') {
    return (
      <div 
        className={`drop-zone-into ${isActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          minHeight: '20px',
          margin: '4px 0 4px 24px',
          border: isActive ? '2px dashed #3b82f6' : '2px dashed transparent',
          borderRadius: '4px',
          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#6b7280',
          transition: 'all 0.2s ease'
        }}
      >
        {isActive ? 'Drop here to add as child' : 'Drop zone'}
      </div>
    );
  }

  return null;
};

const TaskList = () => {
  /* ------------------------- refs ------------------------- */
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);
  const [activeDropZone, setActiveDropZone] = useState(null);

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

  // Simple move operations
  const moveTaskBetween = async (taskId, parentId, position) => {
    try {
      console.log('moveTaskBetween called:', { taskId, parentId, position });
      
      // Get siblings in the target parent (excluding the task being moved)
      const siblings = tasks
        .filter(t => t.parent_task_id === parentId && t.id !== taskId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      console.log('Siblings:', siblings.map(s => ({ id: s.id, title: s.title, position: s.position })));
      
      // Calculate the correct position based on where we're inserting
      let newPosition;
      if (position === 0) {
        // Insert at the beginning
        newPosition = siblings.length > 0 ? (siblings[0].position || 0) - 1000 : 1000;
      } else if (position >= siblings.length) {
        // Insert at the end
        newPosition = siblings.length > 0 ? (siblings[siblings.length - 1].position || 0) + 1000 : 1000;
      } else {
        // Insert between existing tasks
        const prevPosition = siblings[position - 1]?.position || 0;
        const nextPosition = siblings[position]?.position || (prevPosition + 2000);
        newPosition = prevPosition + ((nextPosition - prevPosition) / 2);
      }
      
      console.log('Calculated new position:', newPosition);
      
      const result = await updateTaskPosition(taskId, parentId, newPosition);
      console.log('updateTaskPosition result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return { success: true, data: result };
    } catch (err) {
      console.error('Error moving task between:', err);
      return { success: false, error: err.message };
    }
  };

  const moveTaskInto = async (taskId, parentId) => {
    try {
      console.log('moveTaskInto called:', { taskId, parentId });
      
      // Find how many children the parent already has (excluding the task being moved)
      const existingChildren = tasks.filter(t => t.parent_task_id === parentId && t.id !== taskId);
      const maxPosition = existingChildren.length > 0 
        ? Math.max(...existingChildren.map(t => t.position || 0))
        : 0;
      const newPosition = maxPosition + 1000;
      
      console.log('Existing children count:', existingChildren.length);
      console.log('Calculated position for new child:', newPosition);
      
      const result = await updateTaskPosition(taskId, parentId, newPosition);
      console.log('updateTaskPosition result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Expand the parent so user can see the moved task
      setExpandedTasks(prev => ({ ...prev, [parentId]: true }));
      
      return { success: true, data: result };
    } catch (err) {
      console.error('Error moving task into:', err);
      return { success: false, error: err.message };
    }
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

  /**
   * New simplified drag handler using drop zones
   */
  const handleDragEnd = async ({ active, over }) => {
    console.log('=== DRAG END DEBUG ===');
    console.log('Active:', active);
    console.log('Over:', over);
    console.log('Over data:', over?.data?.current);
    
    if (!over) {
      console.log('No drop target');
      setActiveDropZone(null);
      return;
    }

    // Check if dropping on a drop zone or a task
    const dropData = over.data.current;
    console.log('Drop data type:', dropData?.type);

    if (!dropData) {
      console.log('No drop data available - this might be a drop zone without proper data');
      setActiveDropZone(null);
      return;
    }

    try {
      let result;
      
      if (dropData.type === 'between') {
        console.log('=== BETWEEN DROP ===');
        console.log('Moving task between siblings:', { taskId: active.id, parentId: dropData.parentId, position: dropData.position });
        result = await moveTaskBetween(active.id, dropData.parentId, dropData.position);
        
      } else if (dropData.type === 'into') {
        console.log('=== INTO DROP ===');
        console.log('Moving task into parent:', { taskId: active.id, parentId: dropData.parentId });
        result = await moveTaskInto(active.id, dropData.parentId);
        
      } else if (dropData.type === 'task') {
        console.log('=== TASK DROP ===');
        console.log('Dropped on task, treating as reorder/move');
        const draggedTask = tasks.find(t => t.id === active.id);
        const targetTask = tasks.find(t => t.id === over.id);
        
        console.log('Dragged task:', draggedTask ? { id: draggedTask.id, title: draggedTask.title, parent: draggedTask.parent_task_id } : 'NOT FOUND');
        console.log('Target task:', targetTask ? { id: targetTask.id, title: targetTask.title, parent: targetTask.parent_task_id } : 'NOT FOUND');
        
        if (draggedTask && targetTask) {
          if (draggedTask.parent_task_id === targetTask.parent_task_id) {
            console.log('=== SAME PARENT REORDER ===');
            // Same parent logic (existing code)
            const allSiblings = tasks
              .filter(t => t.parent_task_id === draggedTask.parent_task_id)
              .sort((a, b) => (a.position || 0) - (b.position || 0));
            
            const siblingsWithoutDragged = allSiblings.filter(t => t.id !== active.id);
            const draggedCurrentIndex = allSiblings.findIndex(t => t.id === active.id);
            const targetCurrentIndex = allSiblings.findIndex(t => t.id === over.id);
            const targetIndexInNewArray = siblingsWithoutDragged.findIndex(t => t.id === over.id);
            const movingUp = draggedCurrentIndex > targetCurrentIndex;
            
            let insertPosition = movingUp ? targetIndexInNewArray : targetIndexInNewArray + 1;
            console.log('Same parent calculated position:', insertPosition);
            result = await moveTaskBetween(active.id, draggedTask.parent_task_id, insertPosition);
            
          } else {
            console.log('=== CROSS MILESTONE MOVE ===');
            console.log('From parent:', draggedTask.parent_task_id, 'To parent:', targetTask.parent_task_id);
            
            // Different parents - move to new parent as sibling of target
            const targetSiblings = tasks
              .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== active.id)
              .sort((a, b) => (a.position || 0) - (b.position || 0));
            
            const targetIndexInSiblings = targetSiblings.findIndex(t => t.id === over.id);
            const insertPosition = targetIndexInSiblings + 1;
            
            console.log('Cross-milestone details:', {
              targetSiblings: targetSiblings.map(s => ({ id: s.id, title: s.title, position: s.position })),
              targetIndexInSiblings,
              insertPosition
            });
            
            result = await moveTaskBetween(active.id, targetTask.parent_task_id, insertPosition);
          }
        } else {
          console.log('ERROR: Could not find dragged or target task');
          setActiveDropZone(null);
          return;
        }
        
      } else {
        console.log('Unknown drop type:', dropData.type);
        console.log('Full dropData object:', dropData);
        setActiveDropZone(null);
        return;
      }

      console.log('Move operation result:', result);

      if (result && result.success) {
        console.log('Move successful, refreshing tasks');
        await fetchTasks(true);
      } else {
        console.error('Move failed:', result);
        alert(`Failed to move task: ${result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in drag handler:', err);
      alert(`Failed to move task: ${err.message}`);
    } finally {
      setActiveDropZone(null);
    }
  };

  const handleDragStart = ({ active }) => {
    // Optional: Could set some visual state here
  };

  const handleDropZoneInteraction = (dropData) => {
    setActiveDropZone(dropData);
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
  
  const renderTasksWithDropZones = () => {
    if (getVisibleTasks.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          No projects found. Create your first project to get started!
        </div>
      );
    }

    return (
      <DndContextProvider 
        items={getVisibleTasks.map((t) => t.id)} 
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        {getVisibleTasks.map((task, index) => {
          const isFirstChild = index > 0 && 
            getVisibleTasks[index - 1].level < task.level;
          const isLastChild = index < getVisibleTasks.length - 1 && 
            getVisibleTasks[index + 1].level < task.level;
          
          return (
            <React.Fragment key={task.id}>
              {/* Drop zone above task (for "between" drops) */}
              <DropZone
                type="between"
                parentId={task.parent_task_id}
                position={index}
                isActive={activeDropZone?.type === 'between' && 
                         activeDropZone?.parentId === task.parent_task_id && 
                         activeDropZone?.position === index}
                onDrop={handleDropZoneInteraction}
              />

              {/* The task itself */}
              <SortableTaskWrapper taskId={task.id}>
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
                />
              </SortableTaskWrapper>

              {/* Drop zone for "into" drops (if task is expanded and has or can have children) */}
              {hasChildren(task) && expandedTasks[task.id] && (
                <DropZone
                  type="into"
                  parentId={task.id}
                  position={0}
                  isActive={activeDropZone?.type === 'into' && 
                           activeDropZone?.parentId === task.id}
                  onDrop={handleDropZoneInteraction}
                />
              )}

              {/* Final drop zone at the very end */}
              {index === getVisibleTasks.length - 1 && (
                <DropZone
                  type="between"
                  parentId={task.parent_task_id}
                  position={index + 1}
                  isActive={activeDropZone?.type === 'between' && 
                           activeDropZone?.parentId === task.parent_task_id && 
                           activeDropZone?.position === index + 1}
                  onDrop={handleDropZoneInteraction}
                />
              )}
            </React.Fragment>
          );
        })}
      </DndContextProvider>
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
          <div>{renderTasksWithDropZones()}</div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: '1 1 40%', minWidth: '300px', maxWidth: '500px' }}>{renderRightPanel()}</div>

      {showSearchResults && (
        <SearchResults onTaskSelect={handleTaskSelectFromSearch} onClose={() => setShowSearchResults(false)} />
      )}
    </div>
  );
};

export default TaskList;