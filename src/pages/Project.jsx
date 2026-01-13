import { useState } from 'react';
import { planter } from '@shared/api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useToast } from '@shared/ui/use-toast';

import ProjectHeader from '@features/projects/components/ProjectHeader';
import PhaseCard from '@features/projects/components/PhaseCard';
import MilestoneSection from '@features/projects/components/MilestoneSection';
import AddTaskModal from '@features/projects/components/AddTaskModal';

export default function Project() {
  const { id: projectId } = useParams();

  const [selectedPhase, setSelectedPhase] = useState(null);
  const [addTaskModal, setAddTaskModal] = useState({ open: false, milestone: null });
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId
  });

  // SINGLE SOURCE OF TRUTH: Fetch all tasks for the project (Phases, Milestones, Tasks)
  const { data: projectHierarchy = [] } = useQuery({
    queryKey: ['projectHierarchy', projectId],
    queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
    enabled: !!projectId
  });

  // Derived State (In-Memory Filtering)
  const phases = projectHierarchy.filter(t => t.parent_task_id === projectId); // Phases are direct children of Project

  // Milestones are children of Phases
  const milestones = projectHierarchy.filter(t =>
    phases.some(p => p.id === t.parent_task_id)
  );

  // Tasks are children of Milestones (or Phases directly in some templates, but assuming strict hierarchy here)
  const tasks = projectHierarchy.filter(t =>
    milestones.some(m => m.id === t.parent_task_id)
  );

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => planter.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => planter.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
    }
  });

  const sortedPhases = [...phases].sort((a, b) => (a.position || 0) - (b.position || 0));
  const activePhase = selectedPhase || sortedPhases[0];
  const phaseMilestones = milestones
    .filter(m => m.parent_task_id === activePhase?.id) // Use parent_task_id for hierarchy
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
      .filter(t => t.parent_task_id === task.id)
      .map(mapTaskWithState)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  });

  const handleAddTask = async (taskData) => {
    try {
      if (!addTaskModal.milestone) return;

      await createTaskMutation.mutateAsync({
        ...taskData,
        parent_task_id: addTaskModal.milestone.id, // Task is child of Milestone
        root_id: projectId, // Project root
        status: 'not_started'
      });
      setAddTaskModal({ open: false, milestone: null });
      toast({ title: 'Task created successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
      console.error(error);
    }
  };

  if (loadingProject || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ProjectHeader
        project={project}
        tasks={tasks}
        teamMembers={teamMembers}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phase Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Phases</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sortedPhases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                tasks={tasks} // PhaseCard filters its own tasks using hierarchy now
                milestones={milestones.filter(m => m.parent_task_id === phase.id)}
                isActive={activePhase?.id === phase.id}
                onClick={() => setSelectedPhase(phase)}
              />
            ))}
          </div>
        </div>

        {/* Milestones & Tasks */}
        {activePhase && (
          <motion.div
            key={activePhase.id}
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
                    tasks={tasks.map(mapTaskWithState)} // Pass tasks with proper tree structure and state
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
      </div>

      <AddTaskModal
        open={addTaskModal.open}
        onClose={() => setAddTaskModal({ open: false, milestone: null })}
        onAdd={handleAddTask}
        milestone={addTaskModal.milestone}
        teamMembers={teamMembers}
      />
    </div>
  );
}
