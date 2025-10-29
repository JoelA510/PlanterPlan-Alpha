// src/components/TaskList/TaskList.js - Enhanced version with member projects
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskForm from '../TaskForm/TaskForm';
import NewProjectForm from '../TaskForm/NewProjectForm';
import HTML5DragDropZone from './HTML5DragDropZone';
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import {
  updateTaskCompletion,
  deleteTask,
  updateTaskComplete,
} from '../../services/taskService';
import TaskDetailsPanel from './TaskDetailsPanel';
import TemplateProjectCreator from '../TemplateProject/TemplateProjectCreator';
import Invitations from '../Invitations';
import SearchBar from '../Search/SearchBar';
import SearchResults from '../Search/SearchResults';
import { useSearch } from '../contexts/SearchContext';
import { calculateHTML5DropPosition } from '../../utils/sparsePositioning';

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
    handleOptimisticDragDrop,
    updateTasksOptimistic,
    recalculateDatesOptimistic,
    syncTaskPositionToDatabase,
    // ✅ NEW: Member project context
    memberProjects,
    memberProjectTasks,
    memberProjectsLoading,
    memberProjectsError,
    fetchAllProjectsAndTasks,
    getUserRole,
    canUserEdit,
    canUserManageTeam,
    ...restContext
  } = useTasks();

  const { hasQuery: isSearchActive, results: searchResults } = useSearch();

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

  // ✅ NEW: State for managing sections
  const [expandedSections, setExpandedSections] = useState({
    ownedProjects: true,
    memberProjects: true
  });

  // ✅ NEW: State for selected project context
  const [selectedProjectContext, setSelectedProjectContext] = useState(null); // 'owned' or 'member'

  // Drag state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragHoverTarget, setDragHoverTarget] = useState(null);

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
  
  // ✅ NEW: Get all tasks for a specific context (owned vs member)
  const getTasksForContext = (context) => {
    return context === 'member' ? memberProjectTasks : tasks;
  };

  // ✅ NEW: Get visible tasks for a specific context
  const getVisibleTasksForContext = (context) => {
    const contextTasks = getTasksForContext(context);
    const result = [];
    
    const addTaskAndChildren = (task, level = 0) => {
      result.push({ ...task, level, context });
      
      if (expandedTasks[task.id]) {
        const children = contextTasks
          .filter(t => t.parent_task_id === task.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        
        children.forEach(child => addTaskAndChildren(child, level + 1));
      }
    };

    // Start with top-level tasks
    const topLevelTasks = contextTasks
      .filter(t => !t.parent_task_id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    topLevelTasks.forEach(task => addTaskAndChildren(task));
    
    return result;
  };

  // Get all visible tasks in a flattened array respecting expansion state
  const getVisibleTasks = useMemo(() => {
    return getVisibleTasksForContext('owned');
  }, [tasks, expandedTasks]);

  // ✅ NEW: Get all visible member project tasks
  const getVisibleMemberTasks = useMemo(() => {
    return getVisibleTasksForContext('member');
  }, [memberProjectTasks, expandedTasks]);

  // Check if task has children
  const hasChildren = (task, context = 'owned') => {
    const contextTasks = getTasksForContext(context);
    return contextTasks.some(t => t.parent_task_id === task.id);
  };

  // ✅ NEW: Check user permissions for a task
  const getUserPermissions = (task) => {
    // For owned projects, user has full permissions
    if (tasks.some(t => t.id === task.id)) {
      return {
        canEdit: true,
        canDelete: true,
        canManageTeam: true,
        role: 'owner'
      };
    }

    // For member projects, check role
    const rootProject = findRootProject(task, memberProjectTasks);
    if (rootProject) {
      const role = getUserRole(rootProject.id);
      return {
        canEdit: canUserEdit(rootProject.id),
        canDelete: false, // Members typically can't delete
        canManageTeam: canUserManageTeam(rootProject.id),
        role: role
      };
    }

    return {
      canEdit: false,
      canDelete: false,
      canManageTeam: false,
      role: null
    };
  };

  // ✅ NEW: Find root project for a task
  const findRootProject = (task, taskList) => {
    let current = task;
    while (current.parent_task_id) {
      current = taskList.find(t => t.id === current.parent_task_id);
      if (!current) break;
    }
    return current;
  };

  // ✅ ENHANCED: Determine context for a task
  const getTaskContext = (taskId) => {
    if (tasks.some(t => t.id === taskId)) return 'owned';
    if (memberProjectTasks.some(t => t.id === taskId)) return 'member';
    return null;
  };

  // ✅ ENHANCED: Drag handlers with context awareness
  const handleDragStart = (task) => {
    const context = getTaskContext(task.id);
    const permissions = getUserPermissions(task);
    
    // Prevent dragging if user doesn't have edit permissions
    if (!permissions.canEdit) {
      console.log('🚫 Cannot drag task - insufficient permissions:', task.title);
      return false;
    }
    
    // Prevent dragging top-level tasks
    if (!task.parent_task_id) {
      console.log('🚫 Cannot drag top-level task:', task.title);
      return false;
    }
    
    if (task.isLocked || task.isArchived) {
      console.log('🚫 Cannot drag locked/archived task:', task.title);
      return false;
    }
    
    setDraggedTask({ ...task, context });
    setDragHoverTarget(null);
    setSelectedProjectContext(context);
    console.log('🎯 Drag started:', task.title, 'in context:', context);
    return true;
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragHoverTarget(null);
    setSelectedProjectContext(null);
    console.log('🎯 Drag ended');
  };

  const handleDragOver = (task, event) => {
    if (!draggedTask || (task && task.id === draggedTask.id)) {
      setDragHoverTarget(null);
      return;
    }

    // ✅ NEW: Ensure drag stays within the same context
    const taskContext = getTaskContext(task.id);
    if (taskContext !== draggedTask.context) {
      setDragHoverTarget(null);
      return;
    }

    if (event === 'enter' || event === 'over') {
      if (task) {
        const contextTasks = getTasksForContext(draggedTask.context);
        const draggedIndex = contextTasks.findIndex(t => t.id === draggedTask.id);
        const targetIndex = contextTasks.findIndex(t => t.id === task.id);
        
        setDragHoverTarget({
          ...task,
          position: draggedIndex < targetIndex ? 'below' : 'above'
        });
      }
    } else if (event === 'leave') {
      setDragHoverTarget(null);
    }
  };

  // ✅ ENHANCED: Drop handlers with context awareness
  const handleDropOnTask = (draggedId, targetId) => {
    const contextTasks = getTasksForContext(draggedTask.context);
    const draggedTaskObj = contextTasks.find(t => t.id === draggedId);
    const targetTask = contextTasks.find(t => t.id === targetId);
    
    if (!draggedTaskObj || !targetTask) return;
    
    console.log('🎯 Task dropped onto task:', {
      draggedTask: draggedTaskObj.title,
      targetTask: targetTask.title,
      context: draggedTask.context
    });

    const dropInfo = {
      type: 'onto',
      targetTaskId: targetId,
      draggedId: draggedId
    };
    
    const positionResult = calculateHTML5DropPosition(dropInfo, contextTasks);
    
    if (!positionResult.success) {
      console.error('❌ Invalid drop operation:', positionResult.reason);
      return;
    }
    
    handleOptimisticDragDrop(
      draggedId, 
      positionResult.newParentId, 
      positionResult.newPosition, 
      draggedTaskObj.parent_task_id
    );
    
    setDragHoverTarget(null);
  };

  const handleDropBetween = (draggedId, parentId, position) => {
    console.log('🎯 Dropped between at position:', position);
    
    const contextTasks = getTasksForContext(draggedTask.context);
    const draggedTaskObj = contextTasks.find(t => t.id === draggedId);
    if (!draggedTaskObj) return;
    
    const dropInfo = {
      type: 'between',
      parentId: parentId,
      position: position,
      draggedId: draggedId
    };
    
    const positionResult = calculateHTML5DropPosition(dropInfo, contextTasks);
    
    if (!positionResult.success) {
      console.error('❌ Invalid drop operation:', positionResult.reason);
      return;
    }
    
    handleOptimisticDragDrop(
      draggedId, 
      positionResult.newParentId, 
      positionResult.newPosition, 
      draggedTaskObj.parent_task_id
    );
    
    setDragHoverTarget(null);
  };

  const handleDropInto = (draggedId, parentId) => {
    console.log('🎯 Dropped into parent:', parentId);
    
    const contextTasks = getTasksForContext(draggedTask.context);
    const draggedTaskObj = contextTasks.find(t => t.id === draggedId);
    if (!draggedTaskObj) return;
    
    const dropInfo = {
      type: 'into',
      parentId: parentId,
      draggedId: draggedId
    };
    
    const positionResult = calculateHTML5DropPosition(dropInfo, contextTasks);
    
    if (!positionResult.success) {
      console.error('❌ Invalid drop operation:', positionResult.reason);
      return;
    }
    
    handleOptimisticDragDrop(
      draggedId, 
      positionResult.newParentId, 
      positionResult.newPosition, 
      draggedTaskObj.parent_task_id
    );
    
    setDragHoverTarget(null);
  };

  /* ----------------------- handlers ----------------------- */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchAllProjectsAndTasks(true);
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

  // ✅ NEW: Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const selectTask = (taskId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (addingChildToTaskId && addingChildToTaskId !== taskId) {
      setAddingChildToTaskId(null);
    }
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  // ✅ ENHANCED: Toggle task completion with context awareness
  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const context = getTaskContext(taskId);
    const permissions = getUserPermissions(
      [...tasks, ...memberProjectTasks].find(t => t.id === taskId)
    );
    
    if (!permissions.canEdit) {
      alert('You do not have permission to modify this task.');
      return;
    }
    
    try {
      const res = await updateTaskCompletion(taskId, currentStatus);
      if (!res.success) throw new Error(res.error);
      
      if (isMountedRef.current) {
        if (context === 'owned') {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_complete: !currentStatus } : t)));
        } else {
          // Update member project tasks state if you have it managed separately
          // This might need integration with your member project state management
        }
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
      await fetchAllProjectsAndTasks(true);
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
      await fetchAllProjectsAndTasks(true);
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

  // ✅ ENHANCED: Delete task with permission check
  const handleDeleteTask = async (taskId) => {
    const task = [...tasks, ...memberProjectTasks].find((t) => t.id === taskId);
    if (!task) return;
    
    const permissions = getUserPermissions(task);
    if (!permissions.canDelete) {
      alert('You do not have permission to delete this task.');
      return;
    }
    
    const contextTasks = getTasksForContext(getTaskContext(taskId));
    const hasChildrenToDelete = contextTasks.some((t) => t.parent_task_id === taskId);
    let msg = hasChildrenToDelete
      ? 'This task has subtasks that will also be deleted. Continue?'
      : 'Are you sure you want to delete this task?';
    msg += ' This action cannot be undone.';
    if (!window.confirm(msg)) return;

    try {
      const res = await deleteTask(taskId, true);
      if (!res.success) throw new Error(res.error);
      
      const deletedIds = Array.isArray(res.deletedIds) ? res.deletedIds : [taskId];
      
      // Update appropriate task list based on context
      const context = getTaskContext(taskId);
      if (context === 'owned') {
        setTasks((prev) => prev.filter((t) => !deletedIds.includes(t.id)));
      }
      
      if (deletedIds.includes(selectedTaskId)) setSelectedTaskId(null);
      const count = deletedIds.length - 1;
      alert(
        hasChildrenToDelete ? `Task and ${count} subtask${count !== 1 ? 's' : ''} deleted.` : 'Task deleted successfully'
      );
      await fetchAllProjectsAndTasks(true);
    } catch (err) {
      console.error(err);
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Edit task with permission check
  const handleEditTask = async (taskId, updatedData) => {
    const task = [...tasks, ...memberProjectTasks].find((t) => t.id === taskId);
    if (!task) return;
    
    const permissions = getUserPermissions(task);
    if (!permissions.canEdit) {
      alert('You do not have permission to edit this task.');
      return;
    }
    
    try {
      const res = await updateTaskComplete(taskId, updatedData);
      if (!res.success) throw new Error(res.error || 'Update failed');
      
      // Update appropriate task list based on context
      const context = getTaskContext(taskId);
      if (context === 'owned') {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...res.data } : t)));
      }
      
      alert('Task updated successfully');
      await fetchAllProjectsAndTasks(true);
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
      await fetchAllProjectsAndTasks(true);
      setSelectedTaskId(projectData.id);
      setIsCreatingFromTemplate(false);
    } catch (err) {
      console.error(err);
      alert(`Error refreshing data: ${err.message}`);
    }
  };

  const handleCancelTemplateProjectCreation = () => setIsCreatingFromTemplate(false);

  /* ---------------------- render helpers ------------------- */
  
  // ✅ NEW: Render tasks with drop zones for a specific context
  const renderTasksWithHTML5DropZones = (visibleTasks, context = 'owned') => {
    if (visibleTasks.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          {context === 'member' 
            ? "You haven't joined any projects yet."
            : "No projects found. Create your first project to get started!"
          }
        </div>
      );
    }

    return (
      <div style={{ minHeight: '200px' }}>
        {/* Drop zone at the very top */}
        <HTML5DragDropZone 
          type="between"
          parentId={null}
          position={0}
          level={0}
          onDropBetween={handleDropBetween}
          isDragActive={!!draggedTask && draggedTask.context === context}
          debugMode={process.env.NODE_ENV === 'development'}
        />
        
        {visibleTasks.map((task, index) => {
          const showChildDropZone = hasChildren(task, context) && expandedTasks[task.id];
          const permissions = getUserPermissions(task);
          
          return (
            <React.Fragment key={task.id}>
              {/* The task itself */}
              <TaskItem
                task={task}
                tasks={getTasksForContext(context)}
                level={task.level}
                expandedTasks={expandedTasks}
                toggleExpandTask={toggleExpandTask}
                selectedTaskId={selectedTaskId}
                selectTask={selectTask}
                onAddChildTask={permissions.canEdit ? handleAddChildTask : null}
                hasChildren={hasChildren(task, context)}
                toggleTaskCompletion={toggleTaskCompletion}
                // HTML5 drag props
                isDragging={draggedTask?.id === task.id}
                dragHoverTarget={dragHoverTarget}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDropOnTask}
                // ✅ NEW: Permission props
                canEdit={permissions.canEdit}
                canDelete={permissions.canDelete}
                userRole={permissions.role}
              />
              
              {/* Drop zone for children (if task is expanded) */}
              {showChildDropZone && (
                <HTML5DragDropZone 
                  type="into"
                  parentId={task.id}
                  position={0}
                  level={task.level}
                  onDropInto={handleDropInto}
                  isDragActive={!!draggedTask && draggedTask.context === context}
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
                isDragActive={!!draggedTask && draggedTask.context === context}
                debugMode={process.env.NODE_ENV === 'development'}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ✅ NEW: Render member projects section
  const renderMemberProjectsSection = () => {
    if (memberProjectsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            margin: '0 auto',
            border: '2px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>Loading member projects...</p>
        </div>
      );
    }

    if (memberProjectsError) {
      return (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {memberProjectsError}
        </div>
      );
    }

    if (memberProjects.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#6b7280',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          You haven't been invited to any projects yet.
        </div>
      );
    }

    return (
      <div>
        {/* Member projects summary */}
        <div style={{ 
          marginBottom: '16px', 
          fontSize: '14px', 
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {memberProjects.length} project{memberProjects.length !== 1 ? 's' : ''} • {' '}
            {memberProjectTasks.length} task{memberProjectTasks.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {memberProjects.map(mp => {
              const roleColors = {
                owner: '#dc2626',
                full_user: '#059669', 
                limited_user: '#d97706',
                coach: '#7c3aed'
              };
              return (
                <span 
                  key={mp.id}
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: `${roleColors[mp.role]}20`,
                    color: roleColors[mp.role],
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  {mp.role.replace('_', ' ').toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* Member project tasks */}
        {renderTasksWithHTML5DropZones(getVisibleMemberTasks, 'member')}
      </div>
    );
  };

  const renderRightPanel = () => {
    if (showInvitationTest) return <Invitations />;
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

    const task = [...tasks, ...memberProjectTasks].find((t) => t.id === selectedTaskId);
    if (!task) return null;

    if (addingChildToTaskId === selectedTaskId) {
      const parentStartDate = getTaskStartDate(selectedTaskId);
      return (
        <TaskForm
          parentTaskId={selectedTaskId}
          parentStartDate={parentStartDate}
          onSubmit={handleAddChildTaskSubmit}
          onCancel={handleCancelAddTask}
          backgroundColor={getBackgroundColor(getTaskLevel(task, [...tasks, ...memberProjectTasks]))}
          originType="instance"
        />
      );
    }

    return (
      <TaskDetailsPanel
        key={`${task.id}-${task.is_complete}`}
        task={task}
        tasks={[...tasks, ...memberProjectTasks]}
        toggleTaskCompletion={toggleTaskCompletion}
        onClose={() => setSelectedTaskId(null)}
        onAddChildTask={handleAddChildTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
        // ✅ NEW: Pass user permissions
        userPermissions={getUserPermissions(task)}
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
      {/* Debug panel */}
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
          🚀 Dragging: {draggedTask.title}
          <br />
          📍 Context: {draggedTask.context}
          <br />
          🎯 Target: {dragHoverTarget?.title || 'none'}
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
                disabled={loading || isRefreshing || memberProjectsLoading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: loading || isRefreshing || memberProjectsLoading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  opacity: loading || isRefreshing || memberProjectsLoading ? 0.7 : 1,
                }}
              >
                {loading || isRefreshing || memberProjectsLoading ? 'Refreshing...' : 'Refresh'}
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
                {searchResults.length} task{searchResults.length !== 1 && 's'} match your search
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
          {(loading && !tasks.length) ? (
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
          ) : (
            <div>
              {/* ✅ NEW: OWNED PROJECTS SECTION */}
              <div style={{ marginBottom: '32px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSection('ownedProjects')}
                >
                  <span style={{ 
                    marginRight: '8px',
                    fontSize: '18px',
                    transition: 'transform 0.2s ease',
                    transform: expandedSections.ownedProjects ? 'rotate(90deg)' : 'rotate(0deg)'
                  }}>
                    ▶
                  </span>
                  <h2 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold', 
                    margin: 0,
                    color: '#374151'
                  }}>
                    My Projects
                  </h2>
                  <span style={{ 
                    marginLeft: '12px',
                    fontSize: '14px',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {getVisibleTasks.length}
                  </span>
                </div>
                
                {expandedSections.ownedProjects && (
                  getVisibleTasks.length === 0 ? (
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
                    renderTasksWithHTML5DropZones(getVisibleTasks, 'owned')
                  )
                )}
              </div>

              {/* ✅ NEW: MEMBER PROJECTS SECTION */}
              <div>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSection('memberProjects')}
                >
                  <span style={{ 
                    marginRight: '8px',
                    fontSize: '18px',
                    transition: 'transform 0.2s ease',
                    transform: expandedSections.memberProjects ? 'rotate(90deg)' : 'rotate(0deg)'
                  }}>
                    ▶
                  </span>
                  <h2 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold', 
                    margin: 0,
                    color: '#374151'
                  }}>
                    Shared Projects
                  </h2>
                  <span style={{ 
                    marginLeft: '12px',
                    fontSize: '14px',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {memberProjects.length}
                  </span>
                  {memberProjectsLoading && (
                    <div style={{
                      marginLeft: '8px',
                      width: '16px',
                      height: '16px',
                      border: '2px solid #e5e7eb',
                      borderTopColor: '#3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                </div>
                
                {expandedSections.memberProjects && renderMemberProjectsSection()}
              </div>
            </div>
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