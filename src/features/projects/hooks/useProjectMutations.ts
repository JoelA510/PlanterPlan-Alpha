import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { planter } from '@/shared/api/planterClient';
import { toIsoDate, recalculateProjectDates, nowUtcIso, DateEngineTask } from '@/shared/lib/date-engine';
import { TaskUpdate } from '@/shared/db/app.types';

export interface CreateProjectPayload {
    title: string;
    description?: string;
    start_date?: string | Date;
    templateId?: string;
}

export interface UpdateProjectPayload {
    projectId: string;
    updates: TaskUpdate;
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
                        start_date: projectStartDate ?? undefined,
                        due_date: projectStartDate ?? undefined,
                    }
                );
                if (cloneError) throw cloneError;
                const rootClone = Array.isArray(newTasks) ? newTasks[0] : newTasks;
                return rootClone;
            } else {
                const project = await planter.entities.Project.create({
                    title: formData.title,
                    description: formData.description ?? undefined,
                    start_date: projectStartDate ?? undefined,
                    creator: user.id
                });

                if (project && project.id) {
                    await planter.entities.Project.addMember(project.id, user.id, 'owner');
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
                updated_at: nowUtcIso(),
                location: updates.location,
                settings: updates.settings,
                status: updates.status,
            };

            let batchUpdates: Partial<TaskUpdate>[] = [];
            if (newStartDateStr && oldStartDate && newStartDateStr !== oldStartDate) {
                const projectTasks = await planter.entities.Task.filter({ root_id: projectId });

                batchUpdates = recalculateProjectDates(projectTasks as DateEngineTask[] || [], newStartDateStr, oldStartDate);
            }

            await planter.entities.Project.update(projectId, dbUpdates);

            if (batchUpdates && batchUpdates.length > 0) {
                const upsertPayload = batchUpdates
                    .filter((u): u is typeof u & { id: string } => !!u.id)
                    .map(u => ({ ...u, id: u.id }));
                await planter.entities.Task.upsert(upsertPayload as any);
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


