import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    deepCloneTask,
    getTasksForUser,
} from '../services/taskService';
import { getJoinedProjects } from '../services/projectService';
import { calculateScheduleFromOffset, toIsoDate } from '../utils/dateUtils';
import { POSITION_STEP } from '../services/positionService';

export const useTaskOperations = () => {
    const [tasks, setTasks] = useState([]);
    const [joinedProjects, setJoinedProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joinedError, setJoinedError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const isMountedRef = useRef(false);

    // --- Helpers ---

    // Note: Date recalculation is now largely handled by DB triggers (Phase 1),
    // but we still have client-side logic for "Schedule Offset" (days_from_start).
    // We will keep `recalculateAncestorDates` for now as a fallback or for optimistic UI if needed,
    // OR we can rely on re-fetching.
    // The original implementation had a recursive client-side update.
    // Given we added DB triggers, the DB is the source of truth for "Rolling up" start/due dates.
    // However, `days_from_start` logic (shifting children) is still useful.




    const fetchTasks = useCallback(async () => {
        if (!isMountedRef.current) return [];

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!isMountedRef.current) return [];

            if (!user) {
                setError('User not authenticated');
                setTasks([]);
                return [];
            }
            setCurrentUserId(user.id);

            const data = await getTasksForUser(user.id);

            if (!isMountedRef.current) return [];

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
            if (!isMountedRef.current) return [];
            setError('Failed to fetch tasks');
            return [];
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, []);

    const createProject = useCallback(async (formData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const instanceTasks = tasks.filter((t) => t.origin === 'instance' && !t.parent_task_id);
            const maxPosition = instanceTasks.length > 0 ? Math.max(...instanceTasks.map((t) => t.position ?? 0)) : 0;
            const projectStartDate = toIsoDate(formData.start_date);

            if (!projectStartDate) throw new Error('A valid project start date is required');

            // If a template was selected, perform a deep clone (RPC)
            if (formData.templateId) {
                await deepCloneTask(
                    formData.templateId,
                    null, // newParentId (null for root)
                    'instance', // newOrigin
                    user.id,
                    {
                        title: formData.title,
                        description: formData.description,
                        // Note: purpose/actions are usually specific to the template or cleared. 
                        // The RPC preserves them from template unless we add overrides for them too.
                        // Current RPC update only added title/desc/dates.
                        // If we needed to override purpose/actions/notes we'd need more params.
                        // Assuming acceptable behavior for now based on PR description "Atomic Deep Clone".
                        start_date: projectStartDate,
                        due_date: projectStartDate,
                    }
                );
                // No need to fetch/update root anymore.
            } else {
                const { error: insertError } = await supabase.from('tasks').insert([
                    {
                        title: formData.title,
                        description: formData.description ?? null,
                        purpose: formData.purpose ?? null,
                        actions: formData.actions ?? null,
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
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }, [tasks, fetchTasks]);

    const createTaskOrUpdate = useCallback(async (formData, formState) => {
        // Wraps both create and update logic for tasks
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const origin = formState.origin || 'instance';
            const parentId = formState.parentId ?? null;
            const daysVal = formData.days_from_start;
            const parsedDays = (daysVal === '' || daysVal === null || daysVal === undefined) ? null : Number(daysVal);

            if (parsedDays !== null && Number.isNaN(parsedDays)) throw new Error('Invalid days_from_start');

            const manualStartDate = toIsoDate(formData.start_date);
            const manualDueDate = toIsoDate(formData.due_date);
            const hasManualDates = Boolean(manualStartDate || manualDueDate);

            // --- EDIT MODE ---
            if (formState.mode === 'edit' && formState.taskId) {
                let scheduleUpdates = {};
                if (origin === 'instance') {
                    if (parsedDays !== null) {
                        scheduleUpdates = calculateScheduleFromOffset(tasks, formState.parentId, parsedDays);
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
                    days_from_start: parsedDays,
                    updated_at: new Date().toISOString(),
                    ...scheduleUpdates,
                };

                const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', formState.taskId);
                if (updateError) throw updateError;

                await fetchTasks();
                return;
            }

            // --- CREATE MODE ---
            const siblings = tasks.filter((task) => {
                return task.origin === origin && (task.parent_task_id || null) === parentId;
            });
            const maxPosition = siblings.length > 0 ? Math.max(...siblings.map((task) => task.position ?? 0)) : 0;

            const insertPayload = {
                title: formData.title,
                description: formData.description ?? null,
                notes: formData.notes ?? null,
                purpose: formData.purpose ?? null,
                actions: formData.actions ?? null,
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
                    insertPayload.due_date = manualDueDate || manualStartDate || insertPayload.due_date || null;
                }
            }

            if (formData.templateId) {
                // Deep clone (RPC)
                const newTasks = await deepCloneTask(
                    formData.templateId,
                    parentId,
                    origin,
                    user.id,
                    // Subtasks created from template usually inherit the template's relative schedule 
                    // or if days_from_start is set we might want to apply it?
                    // The 'updates' below handled it.
                    {
                        title: formData.title,
                        description: formData.description,
                        start_date: hasManualDates ? manualStartDate : null,
                        due_date: hasManualDates ? (manualDueDate || manualStartDate) : null
                    }
                );

                // newTasks is a summary object now with new_root_id.
                // We still need to apply 'days_from_start' logic if it wasn't passed to RPC.
                // The updated RPC *doesn't* take 'days_from_start' override yet (only title/desc/dates).
                // So if we have days_from_start, we STILL need to update.
                // However, for Manual Dates, we passed them.

                if (newTasks && newTasks.new_root_id && (parsedDays !== null || (origin === 'instance' && parsedDays !== null))) {
                    const updates = {
                        days_from_start: parsedDays,
                        updated_at: new Date().toISOString(),
                    };

                    if (origin === 'instance' && parsedDays !== null) {
                        const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
                        Object.assign(updates, schedule);
                    }
                    // Manual dates handled by RPC override above.

                    const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', newTasks.new_root_id);
                    if (updateError) console.error("Error updating cloned root schedule", updateError);
                }

            } else {
                const { error: insertError } = await supabase.from('tasks').insert([insertPayload]);
                if (insertError) throw insertError;
            }

            await fetchTasks();

        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    }, [tasks, fetchTasks]);

    const deleteTask = useCallback(async (task) => {
        try {
            const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
            if (deleteError) throw deleteError;
            await fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }, [fetchTasks]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchTasks();
        return () => { isMountedRef.current = false; };
    }, [fetchTasks]);

    return {
        tasks,
        setTasks,
        joinedProjects,
        loading,
        error,
        joinedError,
        currentUserId,
        fetchTasks,
        createProject,
        createTaskOrUpdate,
        deleteTask
    };
};
