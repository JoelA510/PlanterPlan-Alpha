import { useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { useProjectBoard } from "@/features/projects/hooks/useProjectBoard";
import { ROLES, TASK_STATUS } from '@/app/constants';
import { compareDateAsc } from '@/shared/lib/date-engine';

// Mock Types
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import ProjectHeader from '@/features/projects/components/ProjectHeader';
import ProjectTabs from '@/features/projects/components/ProjectTabs';
import PeopleList from '@/features/people/components/PeopleList';
import PhaseCard from '@/features/projects/components/PhaseCard';
import MilestoneSection from '@/features/projects/components/MilestoneSection';
import InviteMemberModal from '@/features/projects/components/InviteMemberModal';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';

import type { TaskRow, TeamMemberRow } from '@/shared/db/app.types';

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const {
    project,
    loadingProject,
    phases,
    milestones,
    tasks,
    teamMembers,
  } = useProjectData(projectId);

  const board = useProjectBoard(projectId, tasks || []);
  const { state, actions, handlers, computed } = board;

  const queryClient = useQueryClient();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-tasks:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: RealtimePostgresChangesPayload<TaskRow>) => {
          const now = Date.now();
          // Debounce bursts (e.g. cascade updates)
          if (now - lastUpdateRef.current < 500) return;
          lastUpdateRef.current = now;

          // Note: payload.old is only fully populated if replica identity is set to full on the DB.
          // Usually payload.new is what we care about for INSERT/UPDATE. We cast appropriately.
          const newRecord = payload.new as TaskRow | undefined;
          const oldRecord = payload.old as TaskRow | undefined;
          const record = newRecord || oldRecord;

          if (!record) return;

          // We only care if:
          // 1. It IS the project itself
          // 2. Its root_id matches the project
          // 3. Its parent_task_id matches the project (Direct child)
          const isRelevant =
            record.id === projectId ||
            record.root_id === projectId ||
            record.parent_task_id === projectId;

          if (isRelevant) {
            // Invalidate specific project hierarchy queries
            queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });

            // If it changed metadata that affects the header (name, dates), refresh project too
            if (record.id === projectId || !record.root_id) {
              queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[Project Realtime] Channel error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  const isOwnerByProject = project?.creator === user?.id;
  const currentMember = teamMembers?.find((m: TeamMemberRow) => m.user_id === user?.id);
  const userRole = currentMember?.role || (isOwnerByProject ? ROLES.OWNER : ROLES.VIEWER);

  const canEdit = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
  const canInvite = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
  const canManageSettings = userRole === ROLES.OWNER || userRole === ROLES.ADMIN;

  const sortedPhases = [...(phases || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  const activePhase = state.selectedPhase || sortedPhases[0];

  const projectMilestones = useMemo(() =>
    (milestones || []).sort((a: TaskRow, b: TaskRow) => compareDateAsc(a.due_date, b.due_date)),
    [milestones]
  );

  const phaseMilestones = projectMilestones
    .filter((m: TaskRow) => m.parent_task_id === activePhase?.id)
    .sort((a: TaskRow, b: TaskRow) => (a.position || 0) - (b.position || 0));

  if (loadingProject || !project) {
    return (
      <>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex h-full gap-8">
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-4">
          <ProjectHeader
            project={project}
            tasks={tasks}
            teamMembers={teamMembers}
            canInvite={canInvite}
            canManageSettings={canManageSettings}
            onInviteMember={() => actions.setShowInviteModal(true)}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProjectTabs activeTab={state.activeTab} onTabChange={actions.setActiveTab} />

            {state.activeTab === 'board' && (
              <>
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Phases</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {sortedPhases.map((phase) => (
                      <div key={phase.id}>
                        <PhaseCard
                          phase={phase}
                          tasks={tasks}
                          milestones={milestones.filter((m: TaskRow) => m.parent_task_id === phase.id)}
                          isActive={activePhase?.id === phase.id}
                          onClick={() => actions.setSelectedPhase(phase)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {activePhase && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Phase {activePhase.position}: {activePhase.title}
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
                        phaseMilestones.map((milestone: TaskRow) => (
                          <MilestoneSection
                            key={milestone.id}
                            milestone={milestone}
                            tasks={(tasks || []).map(computed.mapTaskWithState)}
                            onTaskUpdate={canEdit ? handlers.handleTaskUpdate : undefined}
                            onToggleExpand={handlers.handleToggleExpand}
                            onAddChildTask={canEdit ? handlers.handleStartInlineAdd : undefined}
                            onTaskClick={handlers.handleTaskClick}
                            phase={activePhase}
                            onInlineCommit={canEdit ? handlers.handleInlineCommit : undefined}
                            onInlineCancel={() => actions.setInlineAddingParentId(null)}
                            canEdit={canEdit}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {state.activeTab === 'people' && (
              <PeopleList projectId={projectId} canEdit={canEdit} />
            )}
          </div>
        </div>

        {state.selectedTask && (
          <TaskDetailsPanel
            showForm={false}
            selectedTask={state.selectedTask}
            onClose={() => actions.setSelectedTask(null)}
            onDeleteTaskWrapper={async () => handlers.handleDeleteTask(state.selectedTask!)}
          />
        )}
      </div>

      {state.showInviteModal && (
        <InviteMemberModal
          project={project}
          onClose={() => actions.setShowInviteModal(false)}
          onInviteSuccess={() => { }}
        />
      )}
    </>
  );
}
