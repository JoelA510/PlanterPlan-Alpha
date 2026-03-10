import { supabase } from '../db/client';
import { toIsoDate, nowUtcIso, calculateMinMaxDates } from '@/shared/lib/date-engine';
import { retry } from '../lib/retry.js';
import type { Database } from '@/shared/db/database.types';
import type {
    Project,
    Task,
    TaskInsert,
    TaskUpdate,
    TaskResourceRow,
    TaskRelationshipRow,
    PersonRow,
    TeamMemberRow,
    UserMetadata
} from '@/shared/db/app.types';
import type { User as AuthUser } from '@supabase/supabase-js';


export interface CreateProjectPayload {
    title?: string;
    name?: string;
    description?: string;
    launch_date?: string | Date;
    start_date?: string | Date;
    status?: string;
}

export class PlanterError extends Error {
    constructor(message: string, public status?: number, public metadata?: unknown) {
        super(message);
        this.name = 'PlanterError';
    }
}

export interface PlanterClient {
    auth: {
        me: () => Promise<AuthUser | null>;
        signOut: () => Promise<void>;
        updateProfile: (attributes: UserMetadata) => Promise<AuthUser>;
    };
    entities: {
        Project: ProjectEntityClient;
        Task: TaskEntityClient;
        TaskRelationship: EntityClient<TaskRelationshipRow, Database['public']['Tables']['task_relationships']['Insert'], Database['public']['Tables']['task_relationships']['Update']>;
        Phase: EntityClient<Task, TaskInsert, TaskUpdate>;
        Milestone: EntityClient<Task, TaskInsert, TaskUpdate>;
        TaskWithResources: {
            listTemplates: (options?: { from?: number, limit?: number, resourceType?: string | null, userId?: string, signal?: AbortSignal }) => Promise<{ data: Task[], error: Error | null }>;
            searchTemplates: (options: { query: string, limit?: number, resourceType?: string | null, userId?: string, signal?: AbortSignal }) => Promise<{ data: Task[], error: Error | null }>;
        };
        TaskResource: TaskResourceEntityClient;
        TeamMember: EntityClient<TeamMemberRow, Database['public']['Tables']['project_members']['Insert'], Database['public']['Tables']['project_members']['Update']>;
        Person: EntityClient<PersonRow, Database['public']['Tables']['people']['Insert'], Database['public']['Tables']['people']['Update']>;
    };
    rpc: <T = unknown, P extends object = object>(functionName: string, params: P) => Promise<{ data: T | null, error: Error | null }>;
}

interface EntityClient<T, TInsert, TUpdate> {
    list: (options?: { signal?: AbortSignal }) => Promise<T[]>;
    get: (id: string, options?: { signal?: AbortSignal }) => Promise<T | null>;
    create: (payload: TInsert | TInsert[], options?: { signal?: AbortSignal }) => Promise<T>;
    update: (id: string, payload: TUpdate, options?: { signal?: AbortSignal }) => Promise<T>;
    delete: (id: string, options?: { signal?: AbortSignal }) => Promise<boolean>;
    filter: (filters: Partial<Record<keyof T, string | number | boolean | null>>, options?: { signal?: AbortSignal }) => Promise<T[]>;
    listByCreator: (userId: string, options?: { signal?: AbortSignal }) => Promise<T[]>;
    upsert: (payload: TInsert | TInsert[], options?: { onConflict?: string; ignoreDuplicates?: boolean; signal?: AbortSignal }) => Promise<{ data: T | T[] | null; error: Error | null }>;
}

interface TaskResourceEntityClient extends EntityClient<TaskResourceRow, Database['public']['Tables']['task_resources']['Insert'], Database['public']['Tables']['task_resources']['Update']> {
    setPrimary: (taskId: string, resourceId: string | null) => Promise<void>;
}

interface ProjectEntityClient extends Omit<EntityClient<Project, TaskInsert, TaskUpdate>, 'create' | 'listByCreator'> {
    create: (projectData: CreateProjectPayload & { creator?: string; _token?: string }) => Promise<Project>;
    listByCreator: (userId: string, page?: number, pageSize?: number, options?: { signal?: AbortSignal }) => Promise<Project[]>;
    listJoined: (userId: string) => Promise<Project[]>;
    getWithStats: (projectId: string) => Promise<{ data: Project & { children: Task[], stats: { totalTasks: number; completedTasks: number; progress: number } }, error: Error | null }>;
    addMember: (projectId: string, userId: string, role: string) => Promise<{ data: TeamMemberRow | undefined, error: Error | null }>;
    addMemberByEmail: (projectId: string, email: string, role: string) => Promise<{ data: TeamMemberRow | undefined, error: Error | null }>;
}

interface TaskEntityClient extends EntityClient<Task, TaskInsert, TaskUpdate> {
    fetchChildren: (taskId: string) => Promise<{ data: Task[] | null, error: Error | null }>;
    updateStatus: (taskId: string, status: string) => Promise<{ data: Task | null, error: Error | null }>;
    updateParentDates: (parentId: string | null) => Promise<void>;
    clone: (templateId: string, newParentId: string | null, newOrigin: string, userId: string, overrides?: Partial<Pick<TaskInsert, 'title' | 'description' | 'start_date' | 'due_date'>>) => Promise<{ data: Task | null, error: Error | null }>;
    addMember?: (taskId: string, userId: string, role: string) => Promise<{ data: TeamMemberRow | undefined, error: Error | null }>;
}

// ---------------------------------------------------------------------------
// Sub-phase 3.2a — Generic Entity Client (Supabase SDK)
// ---------------------------------------------------------------------------

const createEntityClient = <T, TInsert, TUpdate>(tableName: string, select = '*'): EntityClient<T, TInsert, TUpdate> => ({
    list: async (opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).select(select);
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T[]) || [];
        });
    },
    get: async (id: string, opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).select(select).eq('id', id).maybeSingle();
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T) || null;
        });
    },
    create: async (payload: TInsert | TInsert[], opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).insert(payload as Record<string, unknown>).select(select);
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T[])?.[0] || (data as T);
        });
    },
    update: async (id: string, payload: TUpdate, opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).update(payload as Record<string, unknown>).eq('id', id).select(select);
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T[])?.[0] || (data as T);
        });
    },
    delete: async (id: string, opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).delete().eq('id', id);
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return true;
        });
    },
    filter: async (filters: Partial<Record<keyof T, string | number | boolean | null>>, opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).select(select);
            if (opts?.signal) (query as any).abortSignal(opts.signal);

            Object.entries(filters).forEach(([key, val]) => {
                if (val === null) {
                    query = query.is(key, null);
                } else {
                    query = query.eq(key, val as string | number);
                }
            });

            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T[]) || [];
        });
    },
    listByCreator: async (userId: string, opts) => {
        return retry(async () => {
            let query = supabase.from(tableName as any).select(select).eq('creator', userId);
            if (opts?.signal) (query as any).abortSignal(opts.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return (data as T[]) || [];
        });
    },
    upsert: async (payload: TInsert | TInsert[], options: { onConflict?: string; ignoreDuplicates?: boolean; signal?: AbortSignal } = {}) => {
        return retry(async () => {
            const onConflict = options.onConflict || 'id';
            let query = supabase.from(tableName as any).upsert(payload as Record<string, unknown>, {
                onConflict,
                ignoreDuplicates: options.ignoreDuplicates,
            }).select(select);
            if (options.signal) query = query.abortSignal(options.signal);
            const { data, error } = await query;
            if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
            return { data: data as T | T[], error: null };
        });
    }
});

// ---------------------------------------------------------------------------
// Sub-phase 3.2b — Specialized Project & Task methods (Supabase SDK)
// ---------------------------------------------------------------------------

export const planter: PlanterClient = {
    auth: {
        me: async (): Promise<AuthUser | null> => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    console.warn('[PlanterClient] auth.me() failed via SDK:', error);
                    return null;
                }
                return user;
            } catch (error) {
                console.warn('[PlanterClient] auth.me() threw an error:', error);
                return null;
            }
        },
        signOut: async (): Promise<void> => {
            await supabase.auth.signOut();
        },
        updateProfile: async (attributes: UserMetadata): Promise<AuthUser> => {
            return retry(async () => {
                const { data, error } = await supabase.auth.updateUser({
                    data: attributes,
                });
                if (error) throw error;
                return data.user as AuthUser;
            });
        },
    },
    entities: {
        Project: {
            ...createEntityClient<Project, TaskInsert, TaskUpdate>('tasks', '*'),
            list: async (): Promise<Project[]> => {
                return retry(async () => {
                    const { data, error } = await supabase
                        .from('tasks')
                        .select('*')
                        .is('parent_task_id', null)
                        .eq('origin', 'instance')
                        .order('created_at', { ascending: false });

                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return (data as Project[]) || [];
                });
            },
            create: async (projectData: CreateProjectPayload & { creator?: string; _token?: string }): Promise<Project> => {
                return retry(async () => {
                    let userId = projectData.creator;

                    if (!userId) {
                        try {
                            const { data: { user }, error } = await supabase.auth.getUser();
                            if (!error && user) {
                                userId = user.id;
                            } else if (error) {
                                console.warn('[PlanterClient] getUser failed during project creation:', error);
                            }
                        } catch (error) {
                            console.warn('[PlanterClient] getUser threw an exception:', error);
                        }
                    }

                    if (!userId) throw new Error('User must be logged in to create a project');

                    let isoLaunchDate = null;
                    if (projectData.launch_date || projectData.start_date) {
                        isoLaunchDate = toIsoDate(projectData.launch_date || projectData.start_date);
                    }

                    const taskPayload = {
                        title: projectData.title || projectData.name,
                        description: projectData.description,
                        start_date: isoLaunchDate,
                        due_date: isoLaunchDate,
                        origin: 'instance',
                        parent_task_id: null,
                        root_id: null,
                        status: projectData.status || 'planning',
                        creator: userId,
                        assignee_id: userId,
                    };

                    const { data, error } = await supabase
                        .from('tasks')
                        .insert(taskPayload as any)
                        .select('*');

                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    const project = Array.isArray(data) ? (data[0] as Project) : (data as unknown as Project);

                    if (!project?.id) {
                        throw new Error('Project creation failed: no ID returned from database.');
                    }

                    try {
                        const { error: rpcError } = await supabase.rpc('initialize_default_project', {
                            p_project_id: project.id,
                            p_creator_id: userId,
                        });
                        if (rpcError) throw rpcError;
                    } catch (rpcCatchError) {
                        console.error('[PlanterClient] RPC Error:', rpcCatchError);
                        try {
                            await supabase.from('tasks').delete().eq('id', project.id);
                        } catch { /* ignore deletion failure */ }
                        throw new Error('Project initialization failed. Please try again.');
                    }

                    return project;
                });
            },
            getWithStats: async (projectId: string): Promise<{ data: Project & { children: Task[], stats: { totalTasks: number; completedTasks: number; progress: number } }, error: Error | null }> => {
                return retry(async () => {
                    const { data: pData, error: pErr } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('id', projectId)
                        .maybeSingle();

                    if (pErr) throw new PlanterError(pErr.message, parseInt(pErr.code ?? '500'));
                    const project = pData as Project;
                    if (!project) throw new Error('Project not found');

                    const { data: cData, error: cErr } = await supabase
                        .from('tasks')
                        .select('id,root_id,is_complete')
                        .eq('root_id', projectId);

                    if (cErr) throw new PlanterError(cErr.message, parseInt(cErr.code ?? '500'));
                    const children = (cData as Task[]) || [];

                    const totalTasks = children.length;
                    const completedTasks = children.filter(t => t.is_complete).length;

                    return {
                        data: {
                            ...project,
                            children,
                            stats: {
                                totalTasks,
                                completedTasks,
                                progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
                            }
                        },
                        error: null
                    };
                });
            },
            listByCreator: async (userId: string, page = 1, pageSize = 20, options?: { signal?: AbortSignal }): Promise<Project[]> => {
                return retry(async () => {
                    const from = (page - 1) * pageSize;
                    const to = from + pageSize - 1;

                    let query = supabase
                        .from('tasks')
                        .select('*')
                        .eq('assignee_id', userId)
                        .is('parent_task_id', null)
                        .eq('origin', 'instance')
                        .order('created_at', { ascending: false })
                        .range(from, to);

                    if (options?.signal) query = query.abortSignal(options.signal);
                    const { data, error } = await query;
                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return (data as Project[]) || [];
                });
            },
            listJoined: async (userId: string): Promise<Project[]> => {
                return retry(async () => {
                    try {
                        const { data, error } = await supabase
                            .from('tasks')
                            .select('*, project_members!inner(*)')
                            .eq('origin', 'instance')
                            .is('parent_task_id', null)
                            .eq('project_members.user_id', userId);

                        if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                        return (data as Project[]) || [];
                    } catch {
                        return [];
                    }
                });
            },
            filter: async (filters: Partial<Record<keyof Project, string | number | boolean | null>>): Promise<Project[]> => {
                return retry(async () => {
                    let query = supabase
                        .from('tasks')
                        .select('*')
                        .is('parent_task_id', null)
                        .eq('origin', 'instance');

                    Object.entries(filters).forEach(([key, val]) => {
                        if (val === null) query = query.is(key, null);
                        else query = query.eq(key, val as string | number);
                    });

                    const { data, error } = await query;
                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return (data as Project[]) || [];
                });
            },
            addMember: async (projectId: string, userId: string, role: string): Promise<{ data: TeamMemberRow | undefined, error: Error | null }> => {
                const { data, error } = await supabase
                    .from('project_members')
                    .insert({ project_id: projectId, user_id: userId, role })
                    .select('*');

                if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                return { data: (data as TeamMemberRow[])?.[0], error: null };
            },
            addMemberByEmail: async (projectId: string, email: string, role: string): Promise<{ data: TeamMemberRow | undefined, error: Error | null }> => {
                return retry(async () => {
                    // @ts-expect-error RPC name validated at runtime
                    const { data, error } = await supabase.rpc('add_project_member_by_email', {
                        p_project_id: projectId,
                        p_email: email,
                        p_role: role,
                    });
                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return { data: data as TeamMemberRow | undefined, error: null };
                });
            },
        },

        // ---------------------------------------------------------------------------
        // Task entity
        // ---------------------------------------------------------------------------

        Task: {
            ...createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
            fetchChildren: async (taskId: string): Promise<{ data: Task[] | null, error: Error | null }> => {
                try {
                    const targetTask = await planter.entities.Task.get(taskId);
                    if (!targetTask) throw new PlanterError('Task not found', 404);

                    const projectRootId = targetTask.root_id || targetTask.id;
                    const projectTasks = await planter.entities.Task.filter({ root_id: projectRootId });

                    const childrenByParent = new Map<string, Task[]>();
                    for (const t of projectTasks) {
                        if (!t.parent_task_id) continue;
                        let list = childrenByParent.get(t.parent_task_id);
                        if (!list) {
                            list = [];
                            childrenByParent.set(t.parent_task_id, list);
                        }
                        list.push(t);
                    }

                    const descendants: Task[] = [];
                    const queue = [taskId];
                    const visited = new Set([taskId]);

                    const rootTask = projectTasks.find((t) => t.id === taskId);
                    if (rootTask) descendants.push(rootTask);

                    while (queue.length > 0) {
                        const currentId = queue.shift()!;
                        const children = childrenByParent.get(currentId) || [];

                        for (const child of children) {
                            if (!visited.has(child.id)) {
                                visited.add(child.id);
                                descendants.push(child);
                                queue.push(child.id);
                            }
                        }
                    }

                    return { data: descendants, error: null };
                } catch (error) {
                    console.error('[PlanterClient.fetchChildren] Error:', error);
                    return { data: null, error: error instanceof Error ? error : new PlanterError(String(error)) };
                }
            },
            updateStatus: async (taskId: string, status: string): Promise<{ data: Task | null, error: Error | null }> => {
                try {
                    const data = await planter.entities.Task.update(taskId, { status } as TaskUpdate);

                    if (status === 'completed') {
                        const children = await planter.entities.Task.filter({ parent_task_id: taskId });
                        if (children && children.length > 0) {
                            const LIMIT = 3;
                            for (let i = 0; i < children.length; i += LIMIT) {
                                const batch = children.slice(i, i + LIMIT);
                                await Promise.all(
                                    batch.map((child) => (planter.entities.Task as TaskEntityClient).updateStatus(child.id, 'completed'))
                                );
                            }
                        }
                    }
                    return { data, error: null };
                } catch (error: unknown) {
                    console.error('[PlanterClient.updateStatus] Error:', error);
                    return { data: null, error: error instanceof Error ? error : new PlanterError(String(error)) };
                }
            },
            updateParentDates: async (parentId: string | null): Promise<void> => {
                if (!parentId) return;
                try {
                    const children = await planter.entities.Task.filter({ parent_task_id: parentId });
                    const { start_date, due_date } = calculateMinMaxDates(children || []);

                    const parent = await planter.entities.Task.update(parentId, {
                        start_date: start_date ?? null,
                        due_date: due_date ?? null,
                        updated_at: nowUtcIso(),
                    } as TaskUpdate);

                    if (parent && parent.parent_task_id) {
                        await (planter.entities.Task as TaskEntityClient).updateParentDates(parent.parent_task_id);
                    }
                } catch (error) {
                    console.error('[PlanterClient.updateParentDates] Error:', error);
                }
            },
            clone: async (templateId: string, newParentId: string | null, newOrigin: string, userId: string, overrides: Partial<Pick<TaskInsert, 'title' | 'description' | 'start_date' | 'due_date'>> = {}): Promise<{ data: Task | null, error: Error | null }> => {
                try {
                    const rpcParams: Record<string, unknown> = {
                        p_template_id: templateId,
                        p_new_parent_id: newParentId,
                        p_new_origin: newOrigin,
                        p_user_id: userId,
                    };

                    if (overrides.title !== undefined) rpcParams.p_title = overrides.title;
                    if (overrides.description !== undefined) rpcParams.p_description = overrides.description;
                    if (overrides.start_date !== undefined) rpcParams.p_start_date = overrides.start_date;
                    if (overrides.due_date !== undefined) rpcParams.p_due_date = overrides.due_date;

                    const { data, error } = await planter.rpc('clone_project_template', rpcParams);
                    if (error) throw error;

                    return { data: data as Task, error: null };
                } catch (error) {
                    console.error('[PlanterClient.clone] Error:', error);
                    return { data: null, error: error instanceof Error ? error : new PlanterError(String(error)) };
                }
            }
        },

        // ---------------------------------------------------------------------------
        // Sub-phase 3.2c — Simple Entity Clients & Utility methods
        // ---------------------------------------------------------------------------

        TaskRelationship: createEntityClient<TaskRelationshipRow, Database['public']['Tables']['task_relationships']['Insert'], Database['public']['Tables']['task_relationships']['Update']>('task_relationships'),
        Phase: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
        Milestone: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
        TaskWithResources: {
            ...createEntityClient<unknown, unknown, unknown>('tasks_with_primary_resource'),
            listTemplates: async ({ from = 0, limit = 25, resourceType = null as string | null, userId, signal }: { from?: number, limit?: number, resourceType?: string | null, userId?: string, signal?: AbortSignal } = {}): Promise<{ data: Task[], error: Error | null }> => {
                return retry(async () => {
                    const end = from + limit - 1;
                    let query = supabase
                        .from('tasks_with_primary_resource')
                        .select('*')
                        .eq('origin', 'template')
                        .is('parent_task_id', null);

                    if (userId) query = query.eq('creator', userId);
                    if (resourceType && resourceType !== 'all') {
                        query = query.eq('resource_type', resourceType as string);
                    }
                    query = query.order('created_at', { ascending: false }).range(from, end);

                    if (signal) query = query.abortSignal(signal);

                    const { data, error } = await query;
                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return { data: (data as Task[]) || [], error: null };
                });
            },
            searchTemplates: async ({ query, limit = 20, resourceType = null as string | null, userId, signal }: { query: string, limit?: number, resourceType?: string | null, userId?: string, signal?: AbortSignal }): Promise<{ data: Task[], error: Error | null }> => {
                return retry(async () => {
                    const normalized = (query || '').trim().slice(0, 100);
                    if (!normalized) return { data: [], error: null };

                    const pattern = `%${normalized}%`;
                    let q = supabase
                        .from('tasks_with_primary_resource')
                        .select('*')
                        .eq('origin', 'template');

                    if (userId) q = q.eq('creator', userId);
                    q = q.or(`title.ilike.${pattern},description.ilike.${pattern}`);

                    if (resourceType && resourceType !== 'all') {
                        q = q.eq('resource_type', resourceType as string);
                    }
                    q = q.order('title', { ascending: true }).limit(limit);

                    if (signal) q = q.abortSignal(signal);

                    const { data, error } = await q;
                    if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                    return { data: (data as Task[]) || [], error: null };
                });
            }
        },
        TaskResource: {
            ...createEntityClient<TaskResourceRow, Database['public']['Tables']['task_resources']['Insert'], Database['public']['Tables']['task_resources']['Update']>('task_resources'),
            setPrimary: async (taskId: string, resourceId: string | null) => {
                await planter.entities.Task.update(taskId, { primary_resource_id: resourceId } as TaskUpdate);
            }
        },
        TeamMember: createEntityClient<TeamMemberRow, Database['public']['Tables']['project_members']['Insert'], Database['public']['Tables']['project_members']['Update']>('project_members'),
        Person: createEntityClient<PersonRow, Database['public']['Tables']['people']['Insert'], Database['public']['Tables']['people']['Update']>('people'),
    },

    // ---------------------------------------------------------------------------
    // RPC wrapper (Supabase SDK)
    // ---------------------------------------------------------------------------

    rpc: async <T = unknown, P extends object = object>(functionName: string, params: P): Promise<{ data: T | null, error: Error | null }> => {
        return retry(async () => {
            try {
                // @ts-expect-error Supabase rpc typing is tightly coupled to Database generics — params are validated at runtime
                const { data, error } = await supabase.rpc(functionName, params);
                if (error) throw new PlanterError(error.message, parseInt(error.code ?? '500'));
                return { data: data as T, error: null };
            } catch (error: unknown) {
                if (error instanceof PlanterError) throw error;
                return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
            }
        });
    },
};

export default planter;
