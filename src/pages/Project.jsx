import { useState } from 'react';
import { planter } from '@shared/api/planterClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useToast } from '@shared/ui/use-toast';
import { TASK_STATUS } from '@app/constants/index';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners
} from '@dnd-kit/core';

import ProjectHeader from '@features/projects/components/ProjectHeader';
import ProjectTabs from '@features/projects/components/ProjectTabs';
import BudgetWidget from '@features/budget/components/BudgetWidget';
import { useProjectData } from '@features/projects/hooks/useProjectData';
import PeopleList from '@features/people/components/PeopleList';
import AssetList from '@features/inventory/components/AssetList';
import DashboardLayout from '@layouts/DashboardLayout';
import PhaseCard from '@features/projects/components/PhaseCard';
import MilestoneSection from '@features/projects/components/MilestoneSection';
import AddTaskModal from '@features/projects/components/AddTaskModal';
import TaskDetailsModal from '@features/projects/components/TaskDetailsModal';
import { useTaskSubscription } from '@features/tasks/hooks/useTaskSubscription';
import { resolveDragAssign } from '@features/projects/utils/dragUtils';

export default function Project() {
  const { id: projectId } = useParams();

  const [activeTab, setActiveTab] = useState('board');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null); // For Task Details Modal
  const [addTaskModal, setAddTaskModal] = useState({ open: false, milestone: null });
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [activeDragMember, setActiveDragMember] = useState(null);

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
  const {
    project,
    loadingProject,
    phases,
    milestones,
    tasks,
    teamMembers,
  } = useProjectData(projectId);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => planter.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => planter.entities.Task.delete(id),
    onSuccess: () => {
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
      toast({ title: 'Task deleted', variant: 'default' });
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
      toast({ title: 'Failed to assign member', description: 'API might be missing', variant: 'destructive' });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => planter.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    },
  });

  const sortedPhases = [...phases].sort((a, b) => (a.position || 0) - (b.position || 0));
  const activePhase = selectedPhase || sortedPhases[0];
  const phaseMilestones = milestones
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
    isExpanded: expandedTaskIds.has(task.id),
    children: tasks
      .filter((t) => t.parent_task_id === task.id)
      .map(mapTaskWithState)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
  });

  const handleAddTask = async (taskData) => {
    try {
      if (!addTaskModal.milestone) return;

      const { milestone, ...payload } = taskData;
      await createTaskMutation.mutateAsync({
        ...payload,
        parent_task_id: addTaskModal.milestone.id,
        root_id: projectId,
        status: TASK_STATUS.TODO,
      });
      setAddTaskModal({ open: false, milestone: null });
      toast({ title: 'Task created successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
      console.error(error);
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
        <ProjectHeader project={project} tasks={tasks} teamMembers={teamMembers} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">



          {/* Tabs */}
          {/* Tabs */}
          <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Board Tab */}
          {activeTab === 'board' && (
            // ... board content ...
            <>
              {/* Phase Selection */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Phases</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {sortedPhases.map((phase) => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      tasks={tasks}
                      milestones={milestones.filter((m) => m.parent_task_id === phase.id)}
                      isActive={activePhase?.id === phase.id}
                      onClick={() => setSelectedPhase(phase)}
                    />
                  ))}
                </div>
              </div>

              {/* Milestones & Tasks */}
              {activePhase && (
                <motion.div
                  // ... (rest of board content)
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
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                        <p className="text-slate-500">No milestones in this phase yet</p>
                      </div>
                    ) : (
                      phaseMilestones.map((milestone) => (
                        <MilestoneSection
                          key={milestone.id}
                          milestone={milestone}
                          tasks={tasks.map(mapTaskWithState)}
                          onTaskUpdate={handleTaskUpdate}
                          onToggleExpand={handleToggleExpand}
                          onAddTask={(m) => setAddTaskModal({ open: true, milestone: m })}
                          onTaskClick={handleTaskClick}
                          phase={activePhase}
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
            <PeopleList projectId={projectId} />
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div className="max-w-xl">
              <BudgetWidget projectId={projectId} />
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <AssetList projectId={projectId} />
          )}
        </div>

        {/* Drag Overlay for feedback */}
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
        onClose={() => setAddTaskModal({ open: false, milestone: null })}
        onAdd={handleAddTask}
        milestone={addTaskModal.milestone}
        teamMembers={teamMembers}
      />

      <TaskDetailsModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onAddChildTask={() => { }} // Not implemented yet inside details
        onEditTask={() => { }} // Managed inside details view logic or parent
        onDeleteTask={(t) => deleteTaskMutation.mutate(t.id)}
        onTaskUpdated={(id, data) => updateTaskMutation.mutate({ id, data })}
        allProjectTasks={tasks}
      />
    </DashboardLayout>
  );
}
