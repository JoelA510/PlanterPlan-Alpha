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

    const recalculateAncestorDates = useCallback(async (taskId, currentTasks) => {
        // With DB triggers, we might not strictly need this client-side recursion for
        // bubbling UP dates. The DB does it.
        // But we might want to keep it if the UI needs to be updated optimistically without a refetch.
        // For now, to be safe and reduce complexity, we will rely on Fetching after major updates.
        // If we see lag, we can re-introduce optimistic bubbling.
        return Promise.resolve();
    }, []);


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
                const cloneResult = await deepCloneTask(
                    formData.templateId,
                    null, // newParentId (null for root)
                    'instance', // newOrigin
                    user.id
                );

                if (cloneResult && cloneResult.new_root_id) {
                    const { data: newRoot, error: fetchError } = await supabase.from('tasks').select('*').eq('id', cloneResult.new_root_id).single();
                    if (!fetchError && newRoot) {
                        await supabase.from('tasks').update({
                            title: formData.title,
                            description: formData.description ?? newRoot.description,
                            purpose: formData.purpose ?? newRoot.purpose,
                            actions: formData.actions ?? newRoot.actions,
                            start_date: projectStartDate,
                            due_date: projectStartDate,
                        }).eq('id', newRoot.id);
                    }
                }
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
                const newTasks = await deepCloneTask(formData.templateId, parentId, origin, user.id);
                // newTasks is a summary object now with new_root_id
                if (newTasks && newTasks.new_root_id) {
                    // Update root
                    const updates = {
                        title: formData.title,
                        description: formData.description, // using user input if valid
                        days_from_start: parsedDays,
                        updated_at: new Date().toISOString(),
                    };
                    // Apply schedule logic
                    if (origin === 'instance') {
                        if (parsedDays !== null) {
                            const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
                            Object.assign(updates, schedule);
                        }
                        if (hasManualDates) {
                            updates.start_date = manualStartDate;
                            updates.due_date = manualDueDate || manualStartDate || updates.due_date || null;
                        }
                    }
                    const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', newTasks.new_root_id);
                    if (updateError) console.error("Error updating cloned root", updateError);
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
