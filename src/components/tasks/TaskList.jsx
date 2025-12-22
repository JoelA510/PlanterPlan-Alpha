import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from './TaskDetailsView';
import MasterLibraryList from './MasterLibraryList';
import InviteMemberModal from './InviteMemberModal';
import { calculateScheduleFromOffset, toIsoDate } from '../../utils/dateUtils';
import { deepCloneTask, getTasksForUser } from '../../services/taskService';
import { getJoinedProjects } from '../../services/projectService';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskItem, { SortableTaskItem } from './TaskItem';
import {
  calculateNewPosition,
  updateTaskPosition,
  renormalizePositions,
  POSITION_STEP,
} from '../../services/positionService';

const buildTaskHierarchy = (tasks) => {
  const taskMap = {};
  const rootTasks = [];

  tasks.forEach((task) => {
    taskMap[task.id] = { ...task, children: [] };
  });

  tasks.forEach((task) => {
    if (task.parent_task_id && taskMap[task.parent_task_id]) {
      taskMap[task.parent_task_id].children.push(taskMap[task.id]);
    } else {
      rootTasks.push(taskMap[task.id]);
    }
  });

  // Sort children for every task to ensure deterministic rendering order
  Object.values(taskMap).forEach((task) => {
    task.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  return rootTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};

const separateTasksByOrigin = (tasks) => {
  const instanceTasks = tasks.filter((task) => task.origin === 'instance');
  const templateTasks = tasks.filter((task) => task.origin === 'template');

  return {
    instanceTasks: buildTaskHierarchy(instanceTasks),
    templateTasks: buildTaskHierarchy(templateTasks),
  };
};

const calculateDropTarget = (allTasks, active, over, activeOrigin) => {
  const activeId = active.id;
  const overId = over.id;
  const activeTask = allTasks.find((t) => t.id === activeId);
  if (!activeTask) return { isValid: false };

  // 1. Determine new parent and origin based on drop target ID
  let newParentId = null;
  let targetOrigin = null;
  const overData = over.data?.current || {};

  if (overData.type === 'container') {
    // Dropped into an empty container
    newParentId = overData.parentId; // This might be a task ID or null (for root)
    targetOrigin = overData.origin;

    // Safety check: verify parent exists if it's not a root drop
    if (newParentId && !allTasks.find((t) => t.id === newParentId)) {
      console.warn(`Drop target parent ${newParentId} not found`);
      return { isValid: false };
    }
  } else {
    // Dropping onto another task item directly
    const overTask = allTasks.find((t) => t.id === overId);
    if (overTask) {
      newParentId = overTask.parent_task_id ?? null;
      targetOrigin = overTask.origin;
    } else {
      return { isValid: false };
    }
  }

  // 1b. Circular Ancestry Check (Grandfather Paradox)
  // If we are reparenting (newParentId is not null), we must ensure
  // that the new parent is not a descendant of the active task.
  if (newParentId) {
    let ancestorId = newParentId;
    while (ancestorId) {
      if (ancestorId === activeId) {
        console.warn('Cannot drop a parent into its own child (Circular dependency detected)');
        return { isValid: false };
      }
      const currentAncestorId = ancestorId;
      const ancestor = allTasks.find((t) => t.id === currentAncestorId);
      ancestorId = ancestor ? ancestor.parent_task_id : null;
    }
  }

  // 2. Validate Origin
  if (activeOrigin !== targetOrigin) {
    return { isValid: false };
  }

  // 3. Filter & Sort Siblings
  const siblings = allTasks
    .filter((t) => (t.parent_task_id ?? null) === newParentId && t.origin === activeOrigin)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const activeIndex = siblings.findIndex((t) => t.id === activeId);
  const overIndex = siblings.findIndex((t) => t.id === overId);

  // 4. Determine prev/next neighbors
  let prevTask, nextTask;

  const isContainerDrop = overData.type === 'container'; // removed unused vars

  if (isContainerDrop) {
    // Dropped into container -> Append to end logic
    if (siblings.length > 0) {
      prevTask = siblings[siblings.length - 1];
      nextTask = null;
    } else {
      prevTask = null;
      nextTask = null;
    }
  } else if (activeIndex !== -1 && activeIndex < overIndex) {
    // Reordering in same list: Dragging DOWN
    prevTask = siblings[overIndex];
    nextTask = siblings[overIndex + 1];
  } else {
    // Dragging UP or Reparenting onto a task
    prevTask = siblings[overIndex - 1];
    nextTask = siblings[overIndex];
  }

  const prevPos = prevTask ? (prevTask.position ?? 0) : 0;
  const nextPos = nextTask ? (nextTask.position ?? 0) : null;

  // 5. Calculate New Position
  const newPos = calculateNewPosition(prevPos, nextPos);

  return { isValid: true, newPos, newParentId };
};

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [joinedError, setJoinedError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isMountedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { setNodeRef: setInstanceRootRef } = useDroppable({
    id: 'drop-root-instance',
    data: { type: 'container', parentId: null, origin: 'instance' },
  });

  const { setNodeRef: setTemplateRootRef } = useDroppable({
    id: 'drop-root-template',
    data: { type: 'container', parentId: null, origin: 'template' },
  });

  const getTaskById = useCallback(
    (taskId) => {
      if (taskId === null || taskId === undefined) {
        return null;
      }
      return tasks.find((task) => task.id === taskId) || null;
    },
    [tasks]
  );

  const fetchTasks = useCallback(async () => {
    if (!isMountedRef.current) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMountedRef.current) {
        return [];
      }

      if (!user) {
        setError('User not authenticated');
        setTasks([]);
        return [];
      }
      setCurrentUserId(user.id);

      const data = await getTasksForUser(user.id);

      if (!isMountedRef.current) {
        return [];
      }

      const nextTasks = data || [];
      setTasks(nextTasks);

      // Fetch joined projects
      const { data: joinedData, error: joinedProjectError } = await getJoinedProjects(user.id);
      if (isMountedRef.current) {
        if (joinedProjectError) {
          setJoinedError('Failed to load joined projects');
        }
        setJoinedProjects(joinedData || []);
      }

      return nextTasks;
    } catch (err) {
      if (!isMountedRef.current) {
        return [];
      }
      setError('Failed to fetch tasks');
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event) => {
      try {
        const { active, over } = event;

        if (!over || active.id === over.id) {
          return;
        }

        const activeTask = tasks.find((t) => t.id === active.id);
        if (!activeTask) return;

        // Attempt 1: Calculate Position
        let result = calculateDropTarget(tasks, active, over, activeTask.origin);

        if (!result.isValid) {
          return;
        }

        let { newPos, newParentId } = result;

        // Retry Logic: Renormalization
        if (newPos === null) {
          console.log('Collision detected. Renormalizing...');
          const renormalizedSiblings = await renormalizePositions(
            newParentId,
            activeTask.origin,
            currentUserId
          );

          // Merge renormalized tasks into current state locally
          const siblingsMap = new Map(renormalizedSiblings.map((t) => [t.id, t]));
          const freshTasks = tasks.map((t) => siblingsMap.get(t.id) || t);

          // Attempt 2: Re-calculate with fresh data
          result = calculateDropTarget(freshTasks, active, over, activeTask.origin);

          if (!result.isValid || result.newPos === null) {
            console.error('Failed to calculate position even after renormalization.');
            return;
          }

          newPos = result.newPos;
          newParentId = result.newParentId;

          // IMPORTANT: Use freshTasks for the optimistic update to ensure consistency
          setTasks(() =>
            freshTasks.map((t) => {
              if (t.id === active.id) {
                return { ...t, position: newPos, parent_task_id: newParentId };
              }
              return t;
            })
          );
        } else {
          // Standard optimistic update uses existing state
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id === active.id) {
                return { ...t, position: newPos, parent_task_id: newParentId };
              }
              return t;
            })
          );
        }

        try {
          await updateTaskPosition(active.id, newPos, newParentId);
        } catch (e) {
          console.error('Failed to persist move', e);
          fetchTasks();
        }
      } catch (globalError) {
        console.error('Unexpected error in handleDragEnd:', globalError);
        fetchTasks();
      }
    },
    [tasks, fetchTasks, currentUserId]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchTasks();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTasks]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const latest = tasks.find((task) => task.id === selectedTask.id);

    if (latest && latest !== selectedTask) {
      setSelectedTask(latest);
    }
  }, [tasks, selectedTask]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setTaskFormState(null);
  };

  const handleAddChildTask = (parentTask) => {
    setTaskFormState({
      mode: 'create',
      origin: parentTask.origin,
      parentId: parentTask.id,
    });
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleCreateTemplateRoot = () => {
    setTaskFormState({
      mode: 'create',
      origin: 'template',
      parentId: null,
    });
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleEditTask = (task) => {
    setTaskFormState({
      mode: 'edit',
      origin: task.origin,
      parentId: task.parent_task_id || null,
      taskId: task.id,
    });
    setShowForm(false);
    setSelectedTask(task);
  };

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}" and its subtasks? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);

      if (deleteError) throw deleteError;

      let latestTasks = await fetchTasks();

      if (task.origin === 'instance' && task.parent_task_id) {
        await recalculateAncestorDates(task.parent_task_id, latestTasks);
        await fetchTasks();
      }

      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }

      if (taskFormState?.taskId === task.id) {
        setTaskFormState(null);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const handleOpenInvite = (project) => {
    setInviteModalProject(project);
  };

  const handleCreateProject = async (formData) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const instanceTasks = tasks.filter((t) => t.origin === 'instance' && !t.parent_task_id);
      const maxPosition =
        instanceTasks.length > 0 ? Math.max(...instanceTasks.map((t) => t.position ?? 0)) : 0;

      const projectStartDate = toIsoDate(formData.start_date);

      if (!projectStartDate) {
        throw new Error('A valid project start date is required');
      }

      // If a template was selected, perform a deep clone
      if (formData.templateId) {
        const newTasks = await deepCloneTask(
          formData.templateId,
          null, // newParentId (null for root)
          'instance', // newOrigin
          user.id
        );

        // Find the new root task (the one with no parent)
        const newRoot = newTasks.find((t) => !t.parent_task_id);

        if (newRoot) {
          // Update the root task with the form's title and start date
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              title: formData.title,
              description: formData.description ?? newRoot.description,
              purpose: formData.purpose ?? newRoot.purpose,
              actions: formData.actions ?? newRoot.actions,
              resources: formData.resources ?? newRoot.resources,
              notes: formData.notes ?? newRoot.notes,
              start_date: projectStartDate,
              due_date: projectStartDate, // Default due date to start date for now
            })
            .eq('id', newRoot.id);

          if (updateError) {
            console.error('Error updating cloned root task:', updateError);
          }
        }
      } else {
        const { error: insertError } = await supabase.from('tasks').insert([
          {
            title: formData.title,
            description: formData.description ?? null,
            purpose: formData.purpose ?? null,
            actions: formData.actions ?? null,
            resources: formData.resources ?? null,
            notes: formData.notes ?? null,
            days_from_start: null,
            origin: 'instance',
            creator: user.id,
            parent_task_id: null,
            position: maxPosition + 1000,
            is_complete: false,
            start_date: projectStartDate,
            due_date: projectStartDate,
          },
        ]);

        if (insertError) throw insertError;
      }

      await fetchTasks();
      setShowForm(false);
      setSelectedTask(null);
      setTaskFormState(null);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const handleSubmitTask = async (formData) => {
    if (!taskFormState) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const origin = taskFormState.origin || 'instance';
      const parentId = taskFormState.parentId ?? null;
      const daysVal = formData.days_from_start;
      const parsedDays =
        daysVal === '' || daysVal === null || daysVal === undefined ? null : Number(daysVal);

      if (parsedDays !== null && Number.isNaN(parsedDays)) {
        throw new Error('Invalid days_from_start');
      }

      const manualStartDate = toIsoDate(formData.start_date);
      const manualDueDate = toIsoDate(formData.due_date);
      const hasManualDates = Boolean(manualStartDate || manualDueDate);

      if (taskFormState.mode === 'edit' && taskFormState.taskId) {
        let scheduleUpdates = {};

        if (origin === 'instance') {
          if (parsedDays !== null) {
            scheduleUpdates = calculateScheduleFromOffset(
              tasks,
              taskFormState.parentId,
              parsedDays
            );
          }

          if (hasManualDates) {
            scheduleUpdates = {
              start_date: manualStartDate,
              due_date: manualDueDate || manualStartDate || scheduleUpdates.due_date || null,
            };
          }

          if (!hasManualDates && parsedDays === null) {
            scheduleUpdates = {};
          }
        }

        const updates = {
          title: formData.title,
          description: formData.description ?? null,
          notes: formData.notes ?? null,
          purpose: formData.purpose ?? null,
          actions: formData.actions ?? null,
          resources: formData.resources ?? null,
          days_from_start: parsedDays,
          updated_at: new Date().toISOString(),
          ...scheduleUpdates,
        };

        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskFormState.taskId);

        if (updateError) throw updateError;

        let latestTasks = await fetchTasks();

        if (origin === 'instance' && taskFormState.parentId) {
          await recalculateAncestorDates(taskFormState.parentId, latestTasks);
          latestTasks = await fetchTasks();
        }

        const nextSelected = latestTasks.find((task) => task.id === taskFormState.taskId) || null;
        setSelectedTask(nextSelected);
        setTaskFormState(null);
        return;
      }

      const siblings = tasks.filter((task) => {
        const sameOrigin = task.origin === origin;
        const sameParent = (task.parent_task_id || null) === parentId;
        return sameOrigin && sameParent;
      });

      const maxPosition =
        siblings.length > 0 ? Math.max(...siblings.map((task) => task.position ?? 0)) : 0;

      const insertPayload = {
        title: formData.title,
        description: formData.description ?? null,
        notes: formData.notes ?? null,
        purpose: formData.purpose ?? null,
        actions: formData.actions ?? null,
        resources: formData.resources ?? null,
        days_from_start: parsedDays,
        origin,
        creator: user.id,
        parent_task_id: parentId,
        position: maxPosition + POSITION_STEP,
        is_complete: false,
      };

      if (origin === 'instance') {
        if (parsedDays !== null) {
          const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
          Object.assign(insertPayload, schedule);
        }

        if (hasManualDates) {
          insertPayload.start_date = manualStartDate;
          insertPayload.due_date =
            manualDueDate || manualStartDate || insertPayload.due_date || null;
        }
      }

      if (formData.templateId) {
        // Deep clone the template
        const newTasks = await deepCloneTask(formData.templateId, parentId, origin, user.id);

        // Find the new root task
        const newRoot = newTasks.find((t) => t.parent_task_id === parentId);

        if (newRoot) {
          // Update the root task with form details
          const updates = {
            title: formData.title,
            description: formData.description ?? newRoot.description,
            notes: formData.notes ?? newRoot.notes,
            purpose: formData.purpose ?? newRoot.purpose,
            actions: formData.actions ?? newRoot.actions,
            resources: formData.resources ?? newRoot.resources,
            days_from_start: parsedDays,
            updated_at: new Date().toISOString(),
          };

          if (origin === 'instance') {
            // Apply schedule logic to the cloned root
            if (parsedDays !== null) {
              const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
              Object.assign(updates, schedule);
            }
            if (hasManualDates) {
              updates.start_date = manualStartDate;
              updates.due_date = manualDueDate || manualStartDate || updates.due_date || null;
            }
          }

          const { error: updateError } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', newRoot.id);

          if (updateError) console.error('Error updating cloned subtask root:', updateError);
        }
      } else {
        // Normal single task insert
        const { error: insertError } = await supabase.from('tasks').insert([insertPayload]);
        if (insertError) throw insertError;
      }

      let latestTasks = await fetchTasks();

      if (origin === 'instance' && parentId) {
        await recalculateAncestorDates(parentId, latestTasks);
        latestTasks = await fetchTasks();
      }

      setTaskFormState(null);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  };

  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

  const parentTaskForForm = taskFormState?.parentId ? getTaskById(taskFormState.parentId) : null;
  const taskBeingEdited =
    taskFormState?.mode === 'edit' && taskFormState.taskId
      ? getTaskById(taskFormState.taskId)
      : null;
  const isTaskFormOpen = Boolean(taskFormState);

  const panelTitle = useMemo(() => {
    if (showForm) {
      return 'New Project';
    }

    if (taskFormState) {
      if (taskFormState.mode === 'edit') {
        return taskBeingEdited ? `Edit ${taskBeingEdited.title}` : 'Edit Task';
      }

      if (taskFormState.origin === 'template') {
        return parentTaskForForm
          ? `New Template Task in ${parentTaskForForm.title}`
          : 'New Template Task';
      }

      return parentTaskForForm ? `New Task in ${parentTaskForForm.title}` : 'New Task';
    }

    if (selectedTask) {
      return selectedTask.title;
    }

    return 'Details';
  }, [showForm, taskFormState, taskBeingEdited, parentTaskForForm, selectedTask]);

  const recalculateAncestorDates = async (taskId, currentTasks) => {
    if (!taskId) {
      return;
    }

    const source = currentTasks ?? tasks;
    const parent = source.find((task) => task.id === taskId);

    if (!parent || parent.origin !== 'instance') {
      return;
    }

    const children = source.filter(
      (task) => task.parent_task_id === parent.id && task.origin === parent.origin
    );

    if (children.length === 0) {
      return;
    }

    const parseDates = (values) =>
      values
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));

    const childStartDates = parseDates(children.map((child) => child.start_date));
    const childDueDates = parseDates(children.map((child) => child.due_date));

    const updates = {};

    if (childStartDates.length > 0) {
      const minTime = Math.min(...childStartDates.map((date) => date.getTime()));
      updates.start_date = new Date(minTime).toISOString();
    }

    if (childDueDates.length > 0) {
      const maxTime = Math.max(...childDueDates.map((date) => date.getTime()));
      updates.due_date = new Date(maxTime).toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', parent.id);

      if (updateError) {
        throw updateError;
      }

      if (updates.start_date) {
        parent.start_date = updates.start_date;
      }
      if (updates.due_date) {
        parent.due_date = updates.due_date;
      }
    }

    if (parent.parent_task_id) {
      await recalculateAncestorDates(parent.parent_task_id, source);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-slate-600 font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 font-semibold">Error loading projects</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="split-layout">
        <div className="task-list-area">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Dashboard</h1>
          </div>

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Joined Projects</h2>
                <span className="section-count">{joinedProjects.length}</span>
              </div>
            </div>
            {joinedError ? (
              <div className="text-sm text-red-600 px-4 py-8 border border-red-200 bg-red-50 rounded-lg">
                {joinedError}
              </div>
            ) : joinedProjects.length > 0 ? (
              <div className="task-cards-container">
                {joinedProjects.map((project) => (
                  <TaskItem
                    key={project.id}
                    task={project}
                    level={0}
                    onTaskClick={handleTaskClick}
                    selectedTaskId={selectedTask?.id}
                    onAddChildTask={undefined}
                    onInviteMember={
                      project.membership_role === 'owner' || project.creator === currentUserId
                        ? handleOpenInvite
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg">
                You haven't joined any projects yet.
              </div>
            )}
          </div>

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Projects</h2>
                <span className="section-count">{instanceTasks.length}</span>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setSelectedTask(null);
                  setTaskFormState(null);
                }}
                className="btn-new-item"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
                </svg>
                New Project
              </button>
            </div>
            {instanceTasks.length > 0 ? (
              <SortableContext
                items={instanceTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
                id="root-instance"
              >
                <div ref={setInstanceRootRef} className="task-cards-container">
                  {instanceTasks.map((project) => (
                    <SortableTaskItem
                      key={project.id}
                      task={project}
                      level={0}
                      onTaskClick={handleTaskClick}
                      selectedTaskId={selectedTask?.id}
                      onAddChildTask={handleAddChildTask}
                      onInviteMember={handleOpenInvite}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div
                ref={setInstanceRootRef}
                className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg"
              >
                No active projects yet. Use "New Project" to get started.
              </div>
            )}
          </div>

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Templates</h2>
                <span className="section-count">{templateTasks.length}</span>
              </div>
              <button onClick={handleCreateTemplateRoot} className="btn-new-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
                </svg>
                New Template
              </button>
            </div>
            {templateTasks.length > 0 ? (
              <SortableContext
                items={templateTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
                id="root-template"
              >
                <div ref={setTemplateRootRef} className="task-cards-container">
                  {templateTasks.map((template) => (
                    <SortableTaskItem
                      key={template.id}
                      task={template}
                      level={0}
                      onTaskClick={handleTaskClick}
                      selectedTaskId={selectedTask?.id}
                      onAddChildTask={handleAddChildTask}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div
                ref={setTemplateRootRef}
                className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg"
              >
                No templates yet. Use "New Template" to start building your reusable library.
              </div>
            )}
          </div>

          <MasterLibraryList />
        </div>

        <div className="permanent-side-panel">
          <div className="panel-header">
            <h2 className="panel-title">{panelTitle}</h2>
            {showForm && (
              <button onClick={() => setShowForm(false)} className="panel-header-btn">
                Hide Form
              </button>
            )}
            {isTaskFormOpen && (
              <button onClick={() => setTaskFormState(null)} className="panel-header-btn">
                Cancel
              </button>
            )}
            {selectedTask && !showForm && !isTaskFormOpen && (
              <button onClick={() => setSelectedTask(null)} className="panel-header-btn">
                Close
              </button>
            )}
          </div>
          <div className="panel-content">
            {showForm ? (
              <NewProjectForm onSubmit={handleCreateProject} onCancel={() => setShowForm(false)} />
            ) : isTaskFormOpen ? (
              <NewTaskForm
                parentTask={parentTaskForForm}
                initialTask={taskBeingEdited}
                origin={taskFormState?.origin}
                enableLibrarySearch={taskFormState?.mode !== 'edit'}
                submitLabel={taskFormState?.mode === 'edit' ? 'Save Changes' : 'Add Task'}
                onSubmit={handleSubmitTask}
                onCancel={() => setTaskFormState(null)}
              />
            ) : selectedTask ? (
              <TaskDetailsView
                task={selectedTask}
                onAddChildTask={handleAddChildTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <div className="empty-panel-state">
                <div className="empty-panel-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="empty-panel-title">No Selection</h3>
                <p className="empty-panel-text">
                  Click "New Project" to create a project, or select a task to view its details.
                </p>
              </div>
            )}
          </div>
        </div>
        {inviteModalProject && (
          <InviteMemberModal
            project={inviteModalProject}
            onClose={() => setInviteModalProject(null)}
            onInviteSuccess={() => {
              // Maybe show a toast?
              alert('Invitation sent!');
              setInviteModalProject(null);
            }}
          />
        )}
      </div>
    </DndContext>
  );
};

export default TaskList;
