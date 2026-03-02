import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { planter } from '@/shared/api/planterClient';
import { toIsoDate, recalculateProjectDates } from '@/shared/lib/date-engine';
import { TaskInsert, TaskUpdate } from '@/shared/db/app.types';

export interface CreateProjectPayload {
    title: string;
    description?: string;
    start_date?: string | Date;
    templateId?: string;
}

export interface UpdateProjectPayload {
    projectId: string;
    updates: Partial<TaskUpdate> & { title?: string; description?: string; start_date?: string; due_date?: string; location?: string; settings?: Record<string, unknown> };
    oldStartDate?: string | null;
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: CreateProjectPayload) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const projectStartDate = toIsoDate(formData.start_date);

            if (formData.templateId) {
                const { data: newTasks, error: cloneError } = await planter.entities.Task.clone(
                    formData.templateId,
                    null,
                    'instance',
                    user.id,
                    {
                        title: formData.title,
                        description: formData.description,
                        start_date: projectStartDate || undefined,
                        due_date: projectStartDate || undefined,
                    }
                );
                if (cloneError) throw cloneError;
                return newTasks;
            } else {
                const project = await planter.entities.Project.create({
                    title: formData.title,
                    description: formData.description,
                    start_date: projectStartDate,
                    creator: user.id
                });

                if (project && (project as any).id) {
                    await planter.projects.addMember((project as any).id, user.id, 'owner');
                }

                return project;
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
        mutationFn: async ({ projectId, updates, oldStartDate }: UpdateProjectPayload) => {
            const { start_date: newStartDateStr } = updates;

            const dbUpdates: TaskUpdate = {
                title: updates.title,
                description: updates.description,
                due_date: updates.due_date,
                start_date: updates.start_date,
                updated_at: new Date().toISOString(),
                location: updates.location,
                settings: updates.settings,
            } as TaskUpdate;

            let batchUpdates: Partial<TaskUpdate>[] = [];
            if (newStartDateStr && oldStartDate && newStartDateStr !== oldStartDate) {
                const { data: projectTasks } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('root_id', projectId);

                batchUpdates = recalculateProjectDates(projectTasks || [], newStartDateStr, oldStartDate);
            }

            await planter.entities.Project.update(projectId, dbUpdates);

            if (batchUpdates.length > 0) {
                await planter.entities.Task.upsert(batchUpdates);
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
        mutationFn: async (templateData: TaskInsert) => {
            const { data: { user } } = await supabase.auth.getUser();
            return planter.entities.Task.create({ ...templateData, creator: user?.id, origin: 'template', parent_task_id: null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProjects'] });
        }
    });
}

