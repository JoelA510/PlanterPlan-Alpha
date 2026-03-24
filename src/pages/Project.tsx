import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { DndContext, DragOverlay, pointerWithin, closestCorners, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, CollisionDetection } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { useProjectBoard } from "@/features/projects/hooks/useProjectBoard";
import { ROLES, POSITION_STEP, TASK_STATUS } from '@/shared/constants';
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

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ parentId: string; beforeTaskId: string | null } | null>(null);
    const pointerYRef = useRef<number>(0);

    useEffect(() => {
        const handler = (e: PointerEvent) => { pointerYRef.current = e.clientY; };
        window.addEventListener('pointermove', handler);
        return () => window.removeEventListener('pointermove', handler);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
        setDropIndicator(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setDropIndicator(null);
            return;
        }

        const overData = over.data.current;
        if (!overData) {
            setDropIndicator(null);
            return;
        }

        const allTasks = (tasks as TaskRow[]) || [];

        if (overData.type === 'Task') {
            const overTask = allTasks.find(t => t.id === over.id);
            if (!overTask) return;

            // Determine if pointer is in top or bottom half of the hovered task
            const overRect = over.rect;
            const overMidY = overRect.top + overRect.height / 2;
            const isAboveMidpoint = pointerYRef.current < overMidY;

            const parentId = overTask.parent_task_id || '';
            const siblings = allTasks
                .filter(t => t.parent_task_id === parentId && t.id !== active.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
            const overIndex = siblings.findIndex(t => t.id === over.id);

            if (isAboveMidpoint) {
                // Insert before this task
                setDropIndicator({ parentId, beforeTaskId: overTask.id });
            } else {
                // Insert after this task (before the next sibling, or at end)
                const nextSibling = siblings[overIndex + 1];
                setDropIndicator({
                    parentId,
                    beforeTaskId: nextSibling?.id ?? null,
                });
            }
        } else if (overData.type === 'container' && overData.parentId) {
            setDropIndicator({
                parentId: overData.parentId as string,
                beforeTaskId: null,
            });
        } else {
            setDropIndicator(null);
        }
    };

    // Collision detection: use closestCenter so the `over` target changes
    // as soon as the pointer crosses a task's center — enables drag-up
    const collisionDetection: CollisionDetection = (args) => {
        // First check pointer-within for container drops (reparenting)
        const pointerCollisions = pointerWithin(args);
        const containerHits = pointerCollisions.filter(c => {
            const container = (args.droppableContainers as any[]).find?.((dc: any) => dc.id === c.id);
            return container?.data?.current?.type === 'container';
        });

        // Use closestCenter for Task targets (reordering)
        const centerCollisions = closestCenter(args);

        // Merge: containers from pointerWithin + tasks from closestCenter
        const combined = [...containerHits];
        for (const c of centerCollisions) {
            if (!combined.some(existing => existing.id === c.id)) {
                combined.push(c);
            }
        }

        if (combined.length > 0) return combined;
        return closestCorners(args);
    };

    // Check if targetId is a descendant of taskId (prevents circular reparenting)
    const isDescendant = (taskId: string, targetId: string, allTasks: TaskRow[]): boolean => {
        const visited = new Set<string>();
        const check = (id: string): boolean => {
            if (visited.has(id)) return false;
            visited.add(id);
            const children = allTasks.filter(t => t.parent_task_id === id);
            return children.some(c => c.id === targetId || check(c.id));
        };
        return check(taskId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const savedIndicator = dropIndicator;
        setActiveDragId(null);
        setDropIndicator(null);

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const overData = over.data.current;
        if (!overData) return;

        const allTasks = (tasks as TaskRow[]) || [];
        const activeTask = allTasks.find(t => t.id === active.id);
        if (!activeTask) return;

        // Container drop with different parent: reparent
        if (overData.type === 'container' && overData.parentId) {
            const targetParentId = overData.parentId as string;
            if (targetParentId === active.id) return;
            if (activeTask.parent_task_id !== targetParentId) {
                if (isDescendant(active.id as string, targetParentId, allTasks)) return;
                handlers.handleTaskUpdate(active.id as string, { parent_task_id: targetParentId });
                const targetParent = allTasks.find(t => t.id === targetParentId);
                if (targetParent) {
                    handlers.handleToggleExpand(targetParent as TaskRow, true);
                }
                return;
            }
            // Same parent container: use dropIndicator for reorder (fall through)
        }

        // Use the dropIndicator to determine position
        // This handles both Task-on-task and same-parent container fall-through
        if (savedIndicator) {
            const targetParentId = savedIndicator.parentId;
            const siblings = allTasks
                .filter(t => t.parent_task_id === targetParentId && t.id !== active.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            let newPosition: number;

            if (savedIndicator.beforeTaskId) {
                // Insert before this task
                const beforeTask = siblings.find(t => t.id === savedIndicator.beforeTaskId);
                const beforeIndex = siblings.findIndex(t => t.id === savedIndicator.beforeTaskId);
                const prevTask = beforeIndex > 0 ? siblings[beforeIndex - 1] : null;

                if (!prevTask) {
                    newPosition = (beforeTask?.position || 0) - POSITION_STEP;
                } else {
                    newPosition = Math.round(((prevTask.position || 0) + (beforeTask?.position || 0)) / 2);
                }
            } else {
                // Insert at end
                const lastTask = siblings[siblings.length - 1];
                newPosition = (lastTask?.position || 0) + POSITION_STEP;
            }

            const updates: Record<string, unknown> = { position: newPosition };
            if (activeTask.parent_task_id !== targetParentId) {
                updates.parent_task_id = targetParentId;
            }
            handlers.handleTaskUpdate(active.id as string, updates);

            if (activeTask.parent_task_id !== targetParentId && targetParentId) {
                const targetParent = allTasks.find(t => t.id === targetParentId);
                if (targetParent) {
                    handlers.handleToggleExpand(targetParent as TaskRow, true);
                }
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
            const parentId = state.inlineAddingParentId || projectId || null;

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
        .filter((m: TaskRow) => {
            const childTasks = (tasks as TaskRow[] || []).filter(t => t.parent_task_id === m.id);
            if (childTasks.length === 0) return true;
            return childTasks.some(t => t.status !== TASK_STATUS.COMPLETED);
        })
        .sort((a: TaskRow, b: TaskRow) => (a.position || 0) - (b.position || 0));

    if (loadingProject || !project) {
        return (
            <>
                <div className="flex justify-center py-20">
                    <Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            </>
        );
    }

    const projectOrigin = (project as TaskRow)?.origin === 'template' ? 'template' : 'instance';

    return (
        <>
            <div className="flex h-full gap-8 min-w-0">
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
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
                                    onClick={() => setTaskFormState({ mode: 'create', origin: projectOrigin })}
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
                                                        onToggleExpand={handlers.handleToggleExpand}
                                                        onTaskClick={(task: TaskRow) => {
                                                            handlers.handleTaskClick(task);
                                                            setTaskFormState({ mode: 'edit', origin: projectOrigin });
                                                        }}
                                                        onInlineCommit={canEdit ? handlers.handleInlineCommit : undefined}
                                                        onInlineCancel={() => actions.setInlineAddingParentId(null)}
                                                        canEdit={canEdit}
                                                        isAddingInline={state.inlineAddingParentId === milestone.id}
                                                        dropIndicator={dropIndicator}
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

            {createPortal(
                <DragOverlay dropAnimation={null}>
                    {activeDragId && (() => {
                        const draggedTask = (tasks as TaskRow[])?.find(t => t.id === activeDragId);
                        if (!draggedTask) return null;
                        return (
                            <div className="bg-white border border-brand-200 rounded-xl px-4 py-3 shadow-xl cursor-grabbing max-w-md">
                                <p className="text-sm font-medium text-slate-900 truncate">{draggedTask.title}</p>
                            </div>
                        );
                    })()}
                </DragOverlay>,
                document.body
            )}
            </DndContext>

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
                        handleEditTask={(task) => {
                            actions.setSelectedTask(task as TaskRow);
                            setTaskFormState({ mode: 'edit', origin: projectOrigin });
                        }}
                    />
                )}
            </div>

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
