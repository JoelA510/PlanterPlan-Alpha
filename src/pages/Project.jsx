import { useState, useMemo } from 'react';
import { planter } from '@/shared/api/planterClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useToast } from '@/shared/ui/use-toast';
import { useAuth } from '@/app/contexts/AuthContext';
import { TASK_STATUS, ROLES } from '@/app/constants/index';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners
} from '@dnd-kit/core';

import ProjectHeader from '@/features/projects/components/ProjectHeader';
import ProjectTabs from '@/features/projects/components/ProjectTabs';

import { useProjectData } from '@/features/projects/hooks/useProjectData';
import PeopleList from '@/features/people/components/PeopleList';

import DashboardLayout from '@/layouts/DashboardLayout';
import PhaseCard from '@/features/projects/components/PhaseCard';
import MilestoneSection from '@/features/projects/components/MilestoneSection';
import AddTaskModal from '@/features/projects/components/AddTaskModal';
import TaskDetailsModal from '@/features/projects/components/TaskDetailsModal';
import InviteMemberModal from '@/features/projects/components/InviteMemberModal';
import { useTaskSubscription } from '@/features/tasks/hooks/useTaskSubscription';
import { resolveDragAssign } from '@/features/projects/utils/dragUtils';

export default function Project() {
  const { projectId } = useParams();

  const [activeTab, setActiveTab] = useState('board');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null); // For Task Details Modal
  const [addTaskModal, setAddTaskModal] = useState({ open: false, milestone: null });
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [activeDragMember, setActiveDragMember] = useState(null);
  // [NEW] Inline Task State
  const [inlineAddingParentId, setInlineAddingParentId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Realtime Subscription
  useTaskSubscription({
    projectId,
    refreshProjectDetails: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    }
  });

  // Data Fetching via Hook
  const { user } = useAuth();

  const {
    project,
    loadingProject,
    phases,
    milestones,
    tasks,
    teamMembers,
    projectHierarchy, // Added projectHierarchy
  } = useProjectData(projectId);

  // [NEW] RBAC Logic with Owner Fallback
  const isOwnerByProject = project?.owner_id === user?.id || project?.creator === user?.id;
  const currentMember = teamMembers?.find((m) => m.user_id === user?.id);
  const userRole = currentMember?.role || (isOwnerByProject ? ROLES.OWNER : ROLES.VIEWER);


  const canEdit = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
  const canInvite = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
  const canManageSettings = userRole === ROLES.OWNER || userRole === ROLES.ADMIN;

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => planter.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update task', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => planter.entities.Task.delete(id),
    onSuccess: () => {
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
      toast({ title: 'Task deleted', variant: 'default' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete task', description: error.message, variant: 'destructive' });
    },
  });

  const assignMemberMutation = useMutation({
    mutationFn: ({ taskId, userId }) => planter.entities.Task.addMember(taskId, userId, 'viewer'),
    onSuccess: () => {
      toast({ title: 'Member assigned to task', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    },
    onError: (err) => {
      console.error(err);
      toast({ title: 'Failed to assign member', description: err.message || 'API might be missing', variant: 'destructive' });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => planter.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    },
    onError: (error) => {
      toast({ title: 'Failed to create task', description: error.message, variant: 'destructive' });
    },
  });

  const sortedPhases = [...phases].sort((a, b) => (a.position || 0) - (b.position || 0));
  const activePhase = selectedPhase || sortedPhases[0];
  // [PERF] Memoize sorted milestones
  const projectMilestones = useMemo(() =>
    milestones?.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [],
    [milestones]
  );

  const phaseMilestones = projectMilestones
    .filter((m) => m.parent_task_id === activePhase?.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const handleTaskUpdate = (taskId, data) => {
    updateTaskMutation.mutate({ id: taskId, data });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleToggleExpand = (task, isExpanded) => {
    const newSet = new Set(expandedTaskIds);
    if (isExpanded) {
      newSet.add(task.id);
    } else {
      newSet.delete(task.id);
    }
    setExpandedTaskIds(newSet);
  };

  const mapTaskWithState = (task) => ({
    ...task,
    // Expand if user clicked expand OR if we are currently adding a child to this task
    isExpanded: expandedTaskIds.has(task.id) || inlineAddingParentId === task.id,
    isAddingInline: inlineAddingParentId === task.id,
    children: tasks
      .filter((t) => t.parent_task_id === task.id)
      .map(mapTaskWithState)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
  });

  const handleAddTask = async (taskData) => {
    try {
      if (!addTaskModal.milestone) return;

      const payload = { ...taskData };
      delete payload.milestone;
      const parentId = addTaskModal.parentTask?.id || addTaskModal.milestone?.id;

      await createTaskMutation.mutateAsync({
        ...payload,
        root_id: projectId,
        status: TASK_STATUS.TODO,
        parent_task_id: parentId,
      });

      // Auto-expand parent if adding a subtask
      if (addTaskModal.parentTask) {
        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          next.add(addTaskModal.parentTask.id);
          return next;
        });
      }

      setAddTaskModal({ open: false, milestone: null, parentTask: null });
      toast({ title: 'Task created successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Failed to create task', description: error.message, variant: 'destructive' });
      console.error(error);
    }
  };

  // [NEW] Inline Handlers
  const handleStartInlineAdd = (parentTask) => {
    // If we want to support generic "Add Task" button logic:
    // This replaces the modal for subtasks.
    setInlineAddingParentId(parentTask.id);

    // Ensure parent is expanded so input is visible
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      next.add(parentTask.id);
      return next;
    });
  };

  const handleInlineCommit = async (parentId, title) => {
    try {
      await createTaskMutation.mutateAsync({
        title,
        root_id: projectId,
        status: 'todo', // Use lowercase default or constant
        parent_task_id: parentId,
        origin: 'instance', // Explicitly set origin
        priority: 'medium', // Default
        description: '',
      });
      // Don't close immediately if we want to allow rapid entry?
      // For now, close it. User can click + again.
      // Actually best UX is keep it open? Let's close for MVP.
      setInlineAddingParentId(null);
    } catch (e) {
      console.error("Inline create failed", e);
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event) => {
    if (event.active.data.current?.type === 'User') {
      setActiveDragMember(event.active.data.current.member);
    }
  };

  const handleDragEnd = (event) => {
    setActiveDragMember(null);
    const { active, over } = event;
    const assignment = resolveDragAssign(active, over, tasks);
    if (assignment) {
      assignMemberMutation.mutate(assignment);
    }
  };

  if (loadingProject || !project) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout selectedTaskId={projectId}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ProjectHeader
          project={project}
          tasks={tasks}
          teamMembers={teamMembers}
          canInvite={canInvite}
          canManageSettings={canManageSettings}
          onInviteMember={() => setShowInviteModal(true)}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ... tabs ... */}
          <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Board Tab */}
          {activeTab === 'board' && (
            <>
              {/* Phase Selection */}
              <div className="mb-8">
                {/* ... phases grid ... */}
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Phases</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {sortedPhases.map((phase) => (
                    <div key={phase.id}>
                      <PhaseCard
                        phase={phase}
                        tasks={tasks}
                        milestones={milestones.filter((m) => m.parent_task_id === phase.id)}
                        isActive={activePhase?.id === phase.id}
                        onClick={() => setSelectedPhase(phase)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones & Tasks */}
              {activePhase && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Phase {activePhase.position}: {activePhase.title || activePhase.name}
                      </h2>
                      {activePhase.description && (
                        <p className="text-slate-600 mt-1">{activePhase.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {phaseMilestones.length === 0 ? (
                      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm p-12 text-center">
                        <p className="text-slate-500 dark:text-muted-foreground">No milestones in this phase yet</p>
                      </div>
                    ) : (
                      phaseMilestones.map((milestone) => (
                        <MilestoneSection
                          key={milestone.id}
                          milestone={milestone}
                          tasks={tasks.map(mapTaskWithState)}
                          onTaskUpdate={canEdit ? handleTaskUpdate : null}
                          onToggleExpand={handleToggleExpand}
                          onAddTask={canEdit ? (m) => setAddTaskModal({ open: true, milestone: m }) : null}
                          onAddChildTask={canEdit ? handleStartInlineAdd : null}
                          onTaskClick={handleTaskClick}
                          phase={activePhase}
                          onInlineCommit={canEdit ? handleInlineCommit : null}
                          onInlineCancel={() => setInlineAddingParentId(null)}
                          canEdit={canEdit}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* People Tab */}
          {activeTab === 'people' && (
            <PeopleList projectId={projectId} canEdit={canEdit} />
          )}

        </div>

        {/* ... drag overlay ... */}
        {createPortal(
          <DragOverlay>
            {activeDragMember && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-200 bg-brand-100 text-xs font-medium text-brand-700 shadow-xl cursor-grabbing scale-110 z-50">
                {activeDragMember.avatar_url ? (
                  <img src={activeDragMember.avatar_url} alt="member" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{(activeDragMember.first_name?.[0] || '') + (activeDragMember.last_name?.[0] || '')}</span>
                )}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <AddTaskModal
        open={addTaskModal.open}
        onClose={() => setAddTaskModal({ open: false, milestone: null, parentTask: null })}
        onAdd={handleAddTask}
        milestone={addTaskModal.milestone}
        parentTask={addTaskModal.parentTask}
        teamMembers={teamMembers}
      />

      <TaskDetailsModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onAddChildTask={() => { }}
        onEditTask={() => { }}
        onDeleteTask={(t) => {
          if (window.confirm(`Delete "${t.title || 'this task'}"? This cannot be undone.`)) {
            deleteTaskMutation.mutate(t.id);
          }
        }}
        onTaskUpdated={(id, data) => updateTaskMutation.mutate({ id, data })}
        allProjectTasks={tasks}
        canEdit={canEdit}
      />

      {showInviteModal && (
        <InviteMemberModal
          project={project}
          onClose={() => setShowInviteModal(false)}
          onInviteSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
            // The modal handles its own success toast and close delay
          }}
        />
      )}
    </DashboardLayout>
  );
}
