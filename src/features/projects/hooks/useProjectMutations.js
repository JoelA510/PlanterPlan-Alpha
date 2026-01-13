import { useCallback } from 'react';
import { useState } from 'react';
import { supabase } from '@app/supabaseClient';
import { useAuth } from '@app/contexts/AuthContext';
import { useToast } from '@app/contexts/ToastContext';
import { deepCloneTask } from '@features/tasks/services/taskService';
import { toIsoDate } from '@shared/lib/date-engine';

export const useProjectMutations = ({
    tasks,
    fetchTasks,
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const createProject = useCallback(
        async (formData) => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');

                // Use tasks provided in props/args
                const instanceTasks = tasks.filter((t) => t.origin === 'instance' && !t.parent_task_id);
                const maxPosition =
                    instanceTasks.length > 0 ? Math.max(...instanceTasks.map((t) => t.position ?? 0)) : 0;
                const projectStartDate = toIsoDate(formData.start_date);
                if (!projectStartDate) throw new Error('A valid project start date is required');

                if (formData.templateId) {
                    const { data: newTasks, error: cloneError } = await deepCloneTask(
                        formData.templateId,
                        null,
                        'instance',
                        user.id,
                        {
                            title: formData.title,
                            description: formData.description,
                            start_date: projectStartDate,
                            due_date: projectStartDate,
                        }
                    );
                    if (cloneError) throw cloneError;
                    await fetchTasks();
                    return newTasks;
                } else {
                    const { data, error: insertError } = await supabase
                        .from('tasks')
                        .insert([
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
                        ])
                        .select()
                        .single();
                    if (insertError) throw insertError;
                    await fetchTasks();
                    return data;
                }
            } catch (error) {
                console.error('Error creating project:', error);
                throw error;
            }
        },
        [tasks, fetchTasks]
    );

    return {
        createProject,
    };
};
