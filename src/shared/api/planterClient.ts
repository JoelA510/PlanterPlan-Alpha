import { supabase } from '../db/client';
import { toIsoDate, nowUtcIso, calculateMinMaxDates, DateEngineTask } from '@/shared/lib/date-engine';
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
      listTemplates: (options?: { from?: number, limit?: number, resourceType?: string | null, signal?: AbortSignal }) => Promise<{ data: Task[], error: Error | null }>;
      searchTemplates: (options: { query: string, limit?: number, resourceType?: string | null, signal?: AbortSignal }) => Promise<{ data: Task[], error: Error | null }>;
    };
    TaskResource: TaskResourceEntityClient;
    TeamMember: EntityClient<TeamMemberRow, Database['public']['Tables']['project_members']['Insert'], Database['public']['Tables']['project_members']['Update']>;
    Person: EntityClient<PersonRow, Database['public']['Tables']['people']['Insert'], Database['public']['Tables']['people']['Update']>;
  };
  rpc: <T = unknown, P extends object = object>(functionName: string, params: P) => Promise<{ data: T | null, error: Error | null }>;
}

const getEnv = (key: string): string => {
  let val: string | undefined;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    val = import.meta.env[key];
  }
  if (!val && typeof process !== 'undefined' && process.env) {
    val = process.env[key];
  }
  return val || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

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

const createEntityClient = <T, TInsert, TUpdate>(tableName: string, select = '*'): EntityClient<T, TInsert, TUpdate> => ({
  list: async (opts) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}`;
      const data = await rawSupabaseFetch(query, { method: 'GET', signal: opts?.signal });
      return (data as T[]) || [];
    });
  },
  get: async (id: string, opts) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&id=eq.${id}`;
      const data = await rawSupabaseFetch(query, { method: 'GET', signal: opts?.signal });
      return (data as T[])?.[0] || null;
    });
  },
  create: async (payload: TInsert | TInsert[], opts) => {
    return retry(async () => {
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' },
          signal: opts?.signal
        }
      );
      return (data as T[])?.[0] || (data as T);
    });
  },
  update: async (id: string, payload: TUpdate, opts) => {
    return retry(async () => {
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}&id=eq.${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' },
          signal: opts?.signal
        }
      );
      return (data as T[])?.[0] || (data as T);
    });
  },
  delete: async (id: string, opts) => {
    return retry(async () => {
      await rawSupabaseFetch(`${tableName}?id=eq.${id}`, { method: 'DELETE', signal: opts?.signal });
      return true;
    });
  },
  filter: async (filters: Partial<Record<keyof T, string | number | boolean | null>>, opts) => {
    return retry(async () => {
      const queryParams = [`select=${select}`];
      Object.keys(filters).forEach((key) => {
        const val = filters[key as keyof typeof filters];
        if (val === null) {
          queryParams.push(`${encodeURIComponent(key)}=is.null`);
        } else {
          queryParams.push(`${encodeURIComponent(key)}=eq.${encodeURIComponent(String(val))}`);
        }
      });

      const queryString = queryParams.join('&');
      const data = await rawSupabaseFetch(`${tableName}?${queryString}`, { method: 'GET', signal: opts?.signal });
      return (data as T[]) || [];
    });
  },
  listByCreator: async (userId: string, opts) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&creator=eq.${encodeURIComponent(userId)}`;
      const data = await rawSupabaseFetch(query, { method: 'GET', signal: opts?.signal });
      return (data as T[]) || [];
    });
  },
  upsert: async (payload: TInsert | TInsert[], options: { onConflict?: string; ignoreDuplicates?: boolean; signal?: AbortSignal } = {}) => {
    return retry(async () => {
      const onConflict = options.onConflict || 'id';
      const preferHeaders = ['return=representation'];
      if (options.ignoreDuplicates) preferHeaders.push('resolution=ignore-duplicates');
      else preferHeaders.push(`resolution=merge-duplicates`);

      const headerStr = preferHeaders.join(',');

      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}&on_conflict=${onConflict}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Prefer': headerStr },
          signal: options.signal
        }
      );
      return { data: data as T | T[], error: null };
    });
  }
});

const getSupabaseToken = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[PlanterClient] Failed to get session token via SDK:', error);
    }
    if (session?.access_token) return session.access_token;
  } catch (error) {
    console.warn('[PlanterClient] Session retrieval crashed:', error);
  }

  return null;
};

const rawSupabaseFetch = async (endpoint: string, options: RequestInit = {}, explicitToken: string | null = null): Promise<unknown> => {
  const token = explicitToken || await getSupabaseToken();
  if (!token) throw new Error('No auth token available for raw fetch');

  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers as Record<string, string>
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let metadata;
    try {
      metadata = await response.json();
    } catch {
      metadata = await response.text();
    }
    throw new PlanterError(
      `Request failed with status ${response.status}: ${metadata?.message || metadata?.error || 'Unknown error'}`,
      response.status,
      metadata
    );
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
};

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
      // Promise.resolve() is enough for local logout if no server-side session needs explicit termination via this wrapper
      return;
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
          try {
            const data = await rawSupabaseFetch(
              'tasks?select=*&parent_task_id=is.null&origin=eq.instance&order=created_at.desc',
              { method: 'GET' }
            );
            return (data as Project[]) || [];
          } catch (err) {
            console.error('[PlanterClient] Raw Fetch List failed:', err);
            throw err;
          }
        });
      },
      create: async (projectData: CreateProjectPayload & { creator?: string; _token?: string }): Promise<Project> => {
        return retry(async () => {
          let userId = projectData.creator;
          const explicitToken = projectData._token;

          if (!userId) {
            const token = explicitToken || await getSupabaseToken();
            if (token) {
              try {
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (!error && user) {
                  userId = user.id;
                } else if (error) {
                  console.warn('[PlanterClient] getUser failed during project creation:', error);
                }
              } catch (error) { 
                console.warn('[PlanterClient] getUser threw an exception:', error);
              }
            }
          }

          if (!userId) throw new Error('User must be logged in to create a project');

          const cleanProjectData = { ...projectData };
          delete cleanProjectData._token;

          let isoLaunchDate = null;
          if (cleanProjectData.launch_date || cleanProjectData.start_date) {
            isoLaunchDate = toIsoDate(cleanProjectData.launch_date || cleanProjectData.start_date);
          }

          const taskPayload = {
            title: cleanProjectData.title || cleanProjectData.name,
            description: cleanProjectData.description,
            due_date: isoLaunchDate,
            origin: 'instance',
            parent_task_id: null,
            root_id: null,
            status: cleanProjectData.status || 'planning',
            assignee_id: userId,
          };

          const data = await rawSupabaseFetch(
            'tasks?select=*',
            {
              method: 'POST',
              headers: { 'Prefer': 'return=representation,headers=off' },
              body: JSON.stringify(taskPayload)
            },
            explicitToken
          );

          const project = (data as Project[])?.[0] || (data as Project);

          if (!project?.id) {
            throw new Error('Project creation failed: no ID returned from database.');
          }

          try {
            await rawSupabaseFetch('rpc/initialize_default_project', {
              method: 'POST',
              body: JSON.stringify({ p_project_id: project.id, p_creator_id: userId })
            }, explicitToken);
          } catch (error) {
            console.error('[PlanterClient] RPC Error:', error);
            try {
              await rawSupabaseFetch(`tasks?id=eq.${project.id}`, { method: 'DELETE' }, explicitToken);
            } catch { /* ignore deletion failure */ }
            throw new Error('Project initialization failed. Please try again.');
          }

          return project;
        });
      },
      getWithStats: async (projectId: string): Promise<{ data: Project & { children: Task[], stats: { totalTasks: number; completedTasks: number; progress: number } }, error: Error | null }> => {
        return retry(async () => {
          const projectQuery = `tasks?select=*&id=eq.${projectId}`;
          const pData = await rawSupabaseFetch(projectQuery, { method: 'GET' });
          const project = (pData as Project[])?.[0];

          if (!project) throw new Error('Project not found');

          const cData = await rawSupabaseFetch(`tasks?select=id,root_id,is_complete&root_id=eq.${projectId}`, { method: 'GET' });
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

          try {
            const query =
              `tasks?select=*,project_id:root_id` +
              `&assignee_id=eq.${encodeURIComponent(userId)}` +
              `&parent_task_id=is.null&origin=eq.instance&order=created_at.desc`;

            const data = await rawSupabaseFetch(
              query,
              {
                method: 'GET',
                headers: { 'Range': `${from}-${to}` },
                signal: options?.signal
              }
            );

            return (data as Project[]) || [];
          } catch (err) {
            console.error('[PlanterClient] listByCreator failed:', err);
            throw err;
          }
        });
      },
      listJoined: async (userId: string): Promise<Project[]> => {
        return retry(async () => {
          try {
            const data = await rawSupabaseFetch(`tasks?select=*,project_members!inner(*)&origin=eq.instance&parent_task_id=is.null&project_members.user_id=eq.${userId}`, {
              method: 'GET'
            });
            return (data as Project[]) || [];
          } catch {
            return [];
          }
        });
      },
      filter: async (filters: Partial<Record<keyof Project, string | number | boolean | null>>): Promise<Project[]> => {
        return retry(async () => {
          const queryParams = [
            'select=*',
            'parent_task_id=is.null',
            'origin=eq.instance'
          ];

          Object.keys(filters).forEach((key) => {
            const val = filters[key as keyof typeof filters];
            if (val === null) queryParams.push(`${key}=is.null`);
            else queryParams.push(`${key}=eq.${val}`);
          });

          const queryString = queryParams.join('&');
          const data = await rawSupabaseFetch(`tasks?${queryString}`, { method: 'GET' });
          return (data as Project[]) || [];
        });
      },
      addMember: async (projectId: string, userId: string, role: string): Promise<{ data: TeamMemberRow | undefined, error: Error | null }> => {
        const data = await rawSupabaseFetch(
          'project_members?select=*',
          {
            method: 'POST',
            body: JSON.stringify({ project_id: projectId, user_id: userId, role }),
            headers: { 'Prefer': 'return=representation' }
          }
        );
        return { data: (data as TeamMemberRow[])?.[0], error: null };
      },
      addMemberByEmail: async (projectId: string, email: string, role: string): Promise<{ data: TeamMemberRow | undefined, error: Error | null }> => {
        return retry(async () => {
          const data = await rawSupabaseFetch('rpc/add_project_member_by_email', {
            method: 'POST',
            body: JSON.stringify({ p_project_id: projectId, p_email: email, p_role: role })
          });
          return { data: data as TeamMemberRow | undefined, error: null };
        });
      },
    },
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
          const { start_date, due_date } = calculateMinMaxDates((children || []) as unknown as DateEngineTask[]);

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
    TaskRelationship: createEntityClient<TaskRelationshipRow, Database['public']['Tables']['task_relationships']['Insert'], Database['public']['Tables']['task_relationships']['Update']>('task_relationships'),
    Phase: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
    Milestone: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
    TaskWithResources: {
      ...createEntityClient<unknown, unknown, unknown>('tasks_with_primary_resource'),
      listTemplates: async ({ from = 0, limit = 25, resourceType = null as string | null, signal }: { from?: number, limit?: number, resourceType?: string | null, signal?: AbortSignal } = {}): Promise<{ data: Task[], error: Error | null }> => {
        return retry(async () => {
          const end = from + limit - 1;
          const query = `tasks_with_primary_resource?select=*&origin=eq.template&parent_task_id=is.null&order=created_at.desc${resourceType && resourceType !== 'all' ? `&resource_type=eq.${encodeURIComponent(resourceType)}` : ''}`;
          const data = await rawSupabaseFetch(query, {
            method: 'GET',
            headers: { 'Range': `${from}-${end}` },
            signal
          });
          return { data: (data as Task[]) || [], error: null };
        });
      },
      searchTemplates: async ({ query, limit = 20, resourceType = null as string | null, signal }: { query: string, limit?: number, resourceType?: string | null, signal?: AbortSignal }): Promise<{ data: Task[], error: Error | null }> => {
        return retry(async () => {
          const normalized = (query || '').trim().slice(0, 100);
          if (!normalized) return { data: [], error: null };

          const pattern = `"%${normalized.replace(/[\\%_]/g, (c) => `\\${c}`)}%"`;
          const endpoint = `tasks_with_primary_resource?select=*&origin=eq.template&or=(title.ilike.${pattern},description.ilike.${pattern})&order=title.asc&limit=${limit}${resourceType && resourceType !== 'all' ? `&resource_type=eq.${encodeURIComponent(resourceType)}` : ''}`;

          const data = await rawSupabaseFetch(endpoint, { method: 'GET', signal });
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
  rpc: async <T = unknown, P extends object = object>(functionName: string, params: P): Promise<{ data: T | null, error: Error | null }> => {
    return retry(async () => {
      try {
        const data = await rawSupabaseFetch(`rpc/${functionName}`, {
          method: 'POST',
          body: JSON.stringify(params),
          headers: { 'Prefer': 'return=representation' }
        });
        return { data: data as T, error: null };
      } catch (error: unknown) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    });
  },
};

export default planter;
