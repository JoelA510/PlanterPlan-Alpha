import { useState } from 'react';
import { planter } from '@shared/api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import BudgetWidget from '@features/budget/components/BudgetWidget';
import PeopleList from '@features/people/components/PeopleList';
import AssetList from '@features/inventory/components/AssetList';
import DashboardLayout from '@layouts/DashboardLayout';
import PhaseCard from '@features/projects/components/PhaseCard';
import MilestoneSection from '@features/projects/components/MilestoneSection';
import AddTaskModal from '@features/projects/components/AddTaskModal';
import { resolveDragAssign } from '@features/projects/utils/dragUtils';

export default function Project() {
  const { id: projectId } = useParams();

  const [activeTab, setActiveTab] = useState('board');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [addTaskModal, setAddTaskModal] = useState({ open: false, milestone: null });
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [activeDragMember, setActiveDragMember] = useState(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Project Metadata
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res) => res[0]),
    enabled: !!projectId,
  });

  // 2. Fetch Project Hierarchy (Phases, Milestones, Tasks)
  const { data: projectHierarchy = [] } = useQuery({
    queryKey: ['projectHierarchy', projectId],
    queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
    enabled: !!projectId,
  });

  // Derived State
  const phases = projectHierarchy.filter((t) => t.parent_task_id === projectId);
  const milestones = projectHierarchy.filter((t) => phases.some((p) => p.id === t.parent_task_id));
  const tasks = projectHierarchy.filter((t) => milestones.some((m) => m.id === t.parent_task_id));

  // 3. Fetch Team Members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => planter.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
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

      await createTaskMutation.mutateAsync({
        ...taskData,
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

          import AssetList from '@features/inventory/components/AssetList';

          // ... (existing imports)

          // ... inside component component render ...

          {/* Tabs */}
          <div className="flex items-center space-x-1 border-b border-slate-200 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'board' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Task Board
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'people' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              People & Team
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'budget' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Budget
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'assets' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Assets
            </button>
          </div>

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
    </DashboardLayout>
  );
}
