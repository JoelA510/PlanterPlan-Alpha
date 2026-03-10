import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { DndContext, pointerWithin, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, CollisionDetection } from '@dnd-kit/core';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { useProjectBoard } from "@/features/projects/hooks/useProjectBoard";
import { ROLES, POSITION_STEP } from '@/shared/constants';
import { compareDateAsc, toIsoDate } from '@/shared/lib/date-engine';
import { constructCreatePayload, constructUpdatePayload } from '@/shared/lib/date-engine/payloadHelpers';
import { planter } from '@/shared/api/planterClient';

import { Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { useCreateTask, useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { toast } from 'sonner';
import type { TaskRow, Project as ProjectType, TaskFormData } from '@/shared/db/app.types';

import ProjectHeader from '@/features/projects/components/ProjectHeader';
import ProjectTabs from '@/features/projects/components/ProjectTabs';
import PeopleList from '@/features/people/components/PeopleList';
import PhaseCard from '@/features/projects/components/PhaseCard';
import MilestoneSection from '@/features/projects/components/MilestoneSection';
import InviteMemberModal from '@/features/projects/components/InviteMemberModal';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';
import MasterLibrarySearch from '@/features/library/components/MasterLibrarySearch';

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

    const board = useProjectBoard(projectId, (tasks as TaskRow[]) || []);
    const { state, actions, handlers, computed } = board;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Custom collision detection: prefer innermost droppable (sortable items over containers)
    const collisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            // Sort by area ascending so smallest (innermost) droppable wins
            return [...pointerCollisions].sort((a, b) => {
                const rectA = args.droppableRects.get(a.id);
                const rectB = args.droppableRects.get(b.id);
                const areaA = rectA ? rectA.width * rectA.height : Infinity;
                const areaB = rectB ? rectB.width * rectB.height : Infinity;
                return areaA - areaB;
            });
        }
        return closestCorners(args);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const overData = over.data.current;
        if (!overData) return;

        const allTasks = (tasks as TaskRow[]) || [];

        // Task-on-task drop: reorder within same parent
        if (overData.type === 'Task') {
            const overTask = allTasks.find(t => t.id === over.id);
            const activeTask = allTasks.find(t => t.id === active.id);
            if (!overTask || !activeTask) return;

            const parentId = overTask.parent_task_id;
            const siblings = allTasks
                .filter(t => t.parent_task_id === parentId && t.id !== active.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            const overIndex = siblings.findIndex(t => t.id === over.id);
            const prev = siblings[overIndex - 1];
            const next = siblings[overIndex + 1];

            let newPosition: number;
            const overPos = overTask.position || 0;
            if (!prev) {
                // Dropped before the first item
                newPosition = overPos - POSITION_STEP;
            } else if (!next) {
                // Dropped after the last item
                newPosition = overPos + POSITION_STEP;
            } else {
                // Dropped between two items — use midpoint
                newPosition = Math.round((overPos + (next.position || 0)) / 2);
            }

            const updates: Record<string, unknown> = { position: newPosition };
            if (activeTask.parent_task_id !== parentId) {
                updates.parent_task_id = parentId;
            }
            handlers.handleTaskUpdate(active.id as string, updates);
            return;
        }

        // Container drop: reparent task
        if (overData.type === 'container' && overData.parentId) {
            const task = allTasks.find(t => t.id === active.id);
            if (task && task.parent_task_id !== overData.parentId) {
                handlers.handleTaskUpdate(active.id as string, { parent_task_id: overData.parentId });
            }
        }
    };

    const queryClient = useQueryClient();
    const lastUpdateRef = useRef(0);

    // Form states restored
    const [taskFormState, setTaskFormState] = useState<any>(null);

    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    const handleTaskSubmit = async (formData: TaskFormData) => {
        try {
            const mode = taskFormState?.mode;
            const origin = taskFormState?.origin || 'instance';
            const parentId = state.inlineAddingParentId || null;

            const payloadContext = {
                origin,
                parentId,
                rootId: projectId,
                contextTasks: tasks as TaskRow[] || [],
                userId: user?.id || '',
                maxPosition: Math.max(0, ...((tasks || []) as TaskRow[]).filter(t => t.parent_task_id === parentId).map(t => t.position || 0))
            };

            if (mode === 'edit' && state.selectedTask) {
                const updatePayload = constructUpdatePayload(formData, state.selectedTask, payloadContext);
                await updateTask.mutateAsync({
                    id: state.selectedTask.id,
                    ...updatePayload,
                    root_id: projectId
                });
                setTaskFormState(null);
                toast.success('Task updated successfully');
            } else {
                const extendedFormData = formData as TaskFormData & { templateId?: string | null };
                if (extendedFormData.templateId) {
                    const hasManualDates = Boolean(formData.start_date || formData.due_date);
                    const { error } = await planter.entities.Task.clone(
                        extendedFormData.templateId,
                        parentId,
                        origin,
                        user?.id as string,
                        {
                            title: formData.title,
                            description: formData.description,
                            start_date: hasManualDates ? toIsoDate(formData.start_date as string) : undefined,
                            due_date: hasManualDates ? (toIsoDate(formData.due_date as string) || toIsoDate(formData.start_date as string)) : undefined,
                        }
                    );
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });
                } else {
                    const createPayload = constructCreatePayload(formData, payloadContext);
                    await createTask.mutateAsync({
                        ...createPayload,
                        root_id: projectId,
                        is_complete: false
                    });
                }
                setTaskFormState(null);
                actions.setInlineAddingParentId(null);
                toast.success('Task created successfully');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error('Failed to save task', { description: message });
            throw error;
        }
    };

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
            .subscribe((_, err) => {
                if (err) {
                    console.error('[Project Realtime] Channel error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, queryClient]);

    const isOwnerByProject = project?.creator === user?.id;
    const currentMember = teamMembers?.find((m: { user_id?: string }) => m.user_id === user?.id);
    const userRole = currentMember?.role || (isOwnerByProject ? ROLES.OWNER : ROLES.VIEWER);

    const canEdit = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
    const canInvite = userRole === ROLES.OWNER || userRole === ROLES.ADMIN || userRole === ROLES.EDITOR;
    const canManageSettings = userRole === ROLES.OWNER || userRole === ROLES.ADMIN;

    const sortedPhases = [...(phases || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
    const activePhase = state.selectedPhase || sortedPhases[0];

    const projectMilestones = useMemo(() =>
        ((milestones || []) as TaskRow[]).sort((a: TaskRow, b: TaskRow) => compareDateAsc(a.due_date, b.due_date)),
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
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragEnd={handleDragEnd}
            >
            <div className="flex h-full gap-8 min-w-0">
                <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-4">
                    <ProjectHeader
                        project={project as ProjectType}
                        tasks={tasks as TaskRow[]}
                        teamMembers={teamMembers as any}
                        canInvite={canInvite}
                        canManageSettings={canManageSettings}
                        onInviteMember={() => actions.setShowInviteModal(true)}
                    />

                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <ProjectTabs activeTab={state.activeTab} onTabChange={actions.setActiveTab} />

                            {canEdit && state.activeTab === 'board' && (
                                <Button
                                    onClick={() => setTaskFormState({ mode: 'create', origin: 'instance' })}
                                    className="bg-brand-500 hover:bg-brand-600 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Task
                                </Button>
                            )}
                        </div>

                        {state.activeTab === 'board' && (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Phases</h2>
                                    <div className="flex gap-4 overflow-x-auto pb-2">
                                        {sortedPhases.map((phase) => (
                                            <div key={phase.id} className="min-w-[200px] flex-1">
                                                <PhaseCard
                                                    phase={phase as TaskRow}
                                                    tasks={tasks as TaskRow[]}
                                                    milestones={(milestones || []).filter((m: any) => m.parent_task_id === phase.id) as TaskRow[]}
                                                    isActive={activePhase?.id === phase.id}
                                                    onClick={() => actions.setSelectedPhase(phase as TaskRow)}
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
                                                    Phase {(activePhase as { position?: number }).position}: {(activePhase as { title?: string }).title}
                                                </h2>
                                                {(activePhase as { description?: string }).description && (
                                                    <p className="text-slate-600 mt-1">{(activePhase as { description?: string }).description}</p>
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
                                                        tasks={(tasks as TaskRow[] || []).map(computed.mapTaskWithState) as any}
                                                        onTaskUpdate={canEdit ? (handlers.handleTaskUpdate as (id: string, updates: Partial<TaskRow>) => void) : undefined}
                                                        onAddChildTask={canEdit ? handlers.handleStartInlineAdd : undefined}
                                                        onTaskClick={handlers.handleTaskClick}
                                                        onInlineCommit={canEdit ? handlers.handleInlineCommit : undefined}
                                                        onInlineCancel={() => actions.setInlineAddingParentId(null)}
                                                        canEdit={canEdit}
                                                        isAddingInline={state.inlineAddingParentId === milestone.id}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}

                        {state.activeTab === 'people' && (
                            <PeopleList projectId={projectId as string} canEdit={canEdit} />
                        )}
                    </div>
                </div>

                {(state.selectedTask || taskFormState) && (
                    <TaskDetailsPanel
                        showForm={Boolean(taskFormState)}
                        taskFormState={taskFormState}
                        selectedTask={state.selectedTask || undefined}
                        taskBeingEdited={taskFormState?.mode === 'edit' ? state.selectedTask || undefined : undefined}
                        parentTaskForForm={state.inlineAddingParentId ? (tasks?.find(t => t.id === state.inlineAddingParentId) as TaskRow) : undefined}
                        onClose={() => {
                            actions.setSelectedTask(null);
                            setTaskFormState(null);
                            actions.setInlineAddingParentId(null);
                        }}
                        setTaskFormState={setTaskFormState}
                        handleTaskSubmit={handleTaskSubmit}
                        renderLibrarySearch={(onSelect) => (
                            <MasterLibrarySearch
                                mode="copy"
                                onSelect={onSelect}
                                label="Search master library"
                                placeholder="Start typing to copy an existing template task"
                            />
                        )}
                        onDeleteTaskWrapper={async () => { if (state.selectedTask) await (handlers.handleDeleteTask(state.selectedTask) as any); }}
                    />
                )}
            </div>

            </DndContext>

            {state.showInviteModal && (
                <InviteMemberModal
                    project={project as ProjectType}
                    onClose={() => actions.setShowInviteModal(false)}
                    onInviteSuccess={() => { }}
                />
            )}
        </>
    );
}
