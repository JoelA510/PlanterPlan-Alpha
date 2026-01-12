import React, { useState } from 'react';
import { planter } from '@/api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

import ProjectHeader from '@features/projects/components/ProjectHeader';
import PhaseCard from '@features/projects/components/PhaseCard';
import MilestoneSection from '@features/projects/components/MilestoneSection';
import AddTaskModal from '@features/projects/components/AddTaskModal';

export default function Project() {
  const { id: projectId } = useParams();

  const [selectedPhase, setSelectedPhase] = useState(null);
  const [addTaskModal, setAddTaskModal] = useState({ open: false, milestone: null });

  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', projectId],
    queryFn: () => planter.entities.Phase.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => planter.entities.Milestone.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => planter.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => planter.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => planter.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => planter.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
  const activePhase = selectedPhase || sortedPhases[0];
  const phaseMilestones = milestones
    .filter(m => m.phase_id === activePhase?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleTaskUpdate = (taskId, data) => {
    updateTaskMutation.mutate({ id: taskId, data });
  };

  const handleAddTask = async (taskData) => {
    await createTaskMutation.mutateAsync({
      ...taskData,
      milestone_id: addTaskModal.milestone.id,
      phase_id: activePhase.id,
      project_id: projectId,
      status: 'not_started'
    });
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
                tasks={tasks}
                milestones={milestones.filter(m => m.phase_id === phase.id)}
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
                  Phase {activePhase.order}: {activePhase.name}
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
                    tasks={tasks}
                    onTaskUpdate={handleTaskUpdate}
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
