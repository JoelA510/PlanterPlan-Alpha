import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { planter } from '@/shared/api/planterClient';
import { toIsoDate, recalculateProjectDates } from '@/shared/lib/date-engine';

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const projectStartDate = toIsoDate(formData.start_date);
            if (!projectStartDate && !formData.templateId) {
                // Optionally validate
            }

            if (formData.templateId) {
                const { data: newTasks, error: cloneError } = (await planter.entities.Task.clone(
                    formData.templateId,
                    null,
                    'instance',
                    user.id,
                    {
                        title: formData.title,
                        description: formData.description,
                        start_date: projectStartDate || undefined,
                        due_date: projectStartDate || undefined,
                    } as any
                )) as any;
                if (cloneError) throw cloneError;
                return newTasks;
            } else {
                return await planter.entities.Project.create({
                    title: formData.title,
                    description: formData.description,
                    start_date: projectStartDate,
                    creator: user.id
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
            queryClient.invalidateQueries({ queryKey: ['allTasks'] });
        }
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ projectId, updates, oldStartDate }: { projectId: string, updates: any, oldStartDate?: string | null }) => {
            const { start_date: newStartDateStr } = updates;

            const dbUpdates = {
                title: updates.title,
                description: updates.description,
                due_date: updates.due_date,
                start_date: updates.start_date,
                updated_at: new Date().toISOString(),
                location: updates.location,
                settings: updates.settings,
            };

            let batchUpdates: any[] = [];
            if (newStartDateStr && oldStartDate && newStartDateStr !== oldStartDate) {
                const { data: projectTasks } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('root_id', projectId);

                batchUpdates = recalculateProjectDates(projectTasks || [], newStartDateStr, oldStartDate);
            }

            const { error } = await supabase
                .from('tasks')
                .update(dbUpdates)
                .eq('id', projectId);

            if (error) throw error;

            if (batchUpdates.length > 0) {
                const { error: batchError } = await supabase
                    .from('tasks')
                    .upsert(batchUpdates);
                if (batchError) console.error("Date recalc error", batchError);
            }

            return true;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['projectHierarchy', variables.projectId] });
        }
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (projectId: string) => {
            await planter.entities.Project.delete(projectId);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
            queryClient.invalidateQueries({ queryKey: ['allTasks'] });
        }
    });
}

export function useUpdateProjectStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, status }: { projectId: string, status: string }) => planter.entities.Project.update(projectId, { status }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        }
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (templateData: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            return planter.entities.Task.create({ ...templateData, creator: user?.id, origin: 'template', parent_task_id: null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
        }
    });
}

