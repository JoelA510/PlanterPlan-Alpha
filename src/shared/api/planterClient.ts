import { supabase } from '@/shared/db/client';
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
  TeamMemberRow
} from '@/shared/db/app.types';

const getEnv = (key: string): string => {
  let val: string | undefined;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    val = import.meta.env[key];
  }
  // @ts-expect-error - process might not exist in all environments (e.g. browser vs node)
  if (!val && typeof (process as unknown) !== 'undefined' && (process as Record<string, unknown>).env) {
    // @ts-expect-error - process.env access on unknown type
    val = (process as Record<string, unknown>).env[key] as string;
  }
  return val || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

interface EntityClient<T, TInsert, TUpdate> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  create: (payload: TInsert | TInsert[]) => Promise<T>;
  update: (id: string, payload: TUpdate) => Promise<T>;
  delete: (id: string) => Promise<boolean>;
  filter: (filters: Record<string, string | number | boolean | null>) => Promise<T[]>;
  listByCreator: (userId: string) => Promise<T[]>;
  upsert: (payload: TInsert | TInsert[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) => Promise<{ data: T | T[] | null; error: Error | null }>;
}

interface ProjectEntityClient extends EntityClient<Project, TaskInsert, TaskUpdate> {
  listByCreator: (userId: string, page?: number, pageSize?: number) => Promise<Project[]>;
  listJoined: (userId: string) => Promise<Project[]>;
  getWithStats: (projectId: string) => Promise<{ data: Project & { children: unknown[], stats: unknown }, error: Error | null }>;
  addMember: (projectId: string, userId: string, role: string) => Promise<{ data: TeamMemberRow | undefined, error: Error | null }>;
  addMemberByEmail: (projectId: string, email: string, role: string) => Promise<{ data: unknown, error: Error | null }>;
}

interface TaskEntityClient extends EntityClient<Task, TaskInsert, TaskUpdate> {
  fetchChildren: (taskId: string) => Promise<{ data: Task[] | null, error: unknown }>;
  updateStatus: (taskId: string, status: string) => Promise<{ data: Task | null, error: unknown }>;
  updateParentDates: (parentId: string | null) => Promise<void>;
  clone: (templateId: string, newParentId: string | null, newOrigin: string, userId: string, overrides?: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }>;
  addMember?: (taskId: string, userId: string, role: string) => Promise<{ data: TeamMemberRow | undefined, error: Error | null }>;
}

const createEntityClient = <T, TInsert, TUpdate>(tableName: string, select = '*'): EntityClient<T, TInsert, TUpdate> => ({
  list: async () => {
    return retry(async () => {
      const query = `${tableName}?select=${select}`;
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return (data as T[]) || [];
    });
  },
  get: async (id: string) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&id=eq.${id}`;
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return (data as T[])?.[0] || null;
    });
  },
  create: async (payload: TInsert | TInsert[]) => {
    return retry(async () => {
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' }
        }
      );
      return (data as T[])?.[0] || (data as T);
    });
  },
  update: async (id: string, payload: TUpdate) => {
    return retry(async () => {
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}&id=eq.${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' }
        }
      );
      return (data as T[])?.[0] || (data as T);
    });
  },
  delete: async (id: string) => {
    return retry(async () => {
      await rawSupabaseFetch(`${tableName}?id=eq.${id}`, { method: 'DELETE' });
      return true;
    });
  },
  filter: async (filters: Record<string, string | number | boolean | null>) => {
    return retry(async () => {
      const queryParams = [`select=${select}`];
      Object.keys(filters).forEach((key) => {
        const val = filters[key];
        if (val === null) {
          queryParams.push(`${key}=is.null`);
        } else {
          queryParams.push(`${key}=eq.${val}`);
        }
      });

      const queryString = queryParams.join('&');
      const data = await rawSupabaseFetch(`${tableName}?${queryString}`, { method: 'GET' });
      return (data as T[]) || [];
    });
  },
  listByCreator: async (userId: string) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&creator=eq.${userId}`;
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return (data as T[]) || [];
    });
  },
  upsert: async (payload: TInsert | TInsert[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) => {
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
          headers: { 'Prefer': headerStr }
        }
      );
      return { data: data as T | T[], error: null };
    });
  }
});

const getSupabaseToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch {
    // Session failure is non-critical for bypass logic
  }

  if (typeof window === 'undefined') return null;

  const bypassToken = localStorage.getItem('e2e-bypass-token');
  if (bypassToken) return bypassToken;

  try {
    const urlStr = import.meta.env.VITE_SUPABASE_URL;
    if (urlStr) {
      const url = new URL(urlStr);
      const ref = url.hostname.split('.')[0];
      const key = `sb-${ref}-auth-token`;
      const item = localStorage.getItem(key);
      if (item) {
        const session = JSON.parse(item);
        return session?.access_token;
      }
    }
  } catch { /* ignore */ }

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
    const text = await response.text();
    throw new Error(`Supabase Raw Error (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
};

export const planter = {
  auth: {
    me: async (): Promise<unknown> => {
      const token = await getSupabaseToken();
      if (!token) return null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) return null;
        const user = await response.json();
        return user;
      } catch {
        console.warn('[PlanterClient] auth.me() timed out');
        return null;
      }
    },
    signOut: async (): Promise<void> => {
      // Promise.resolve() is enough for local logout if no server-side session needs explicit termination via this wrapper
      return;
    },
    updateProfile: async (attributes: Record<string, unknown>): Promise<unknown> => {
      return retry(async () => {
        const { data, error } = await supabase.auth.updateUser({
          data: attributes,
        });
        if (error) throw error;
        return data;
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
                const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
                  headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                  const user = await response.json();
                  userId = user?.id;
                }
              } catch { /* ignore auth failure */ }
            }
          }

          if (!userId) throw new Error('User must be logged in to create a project');

          const cleanProjectData = { ...projectData };
          delete cleanProjectData._token;

          let isoLaunchDate = null;
          if (cleanProjectData.launch_date || cleanProjectData.start_date) {
            const d = new Date(cleanProjectData.launch_date || cleanProjectData.start_date);
            if (!isNaN(d.getTime())) isoLaunchDate = d.toISOString().split('T')[0];
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
      getWithStats: async (projectId: string): Promise<{ data: Project & { children: unknown[], stats: unknown }, error: Error | null }> => {
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
      listByCreator: async (userId: string, page = 1, pageSize = 20): Promise<Project[]> => {
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
                headers: { 'Range': `${from}-${to}` }
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
            const data = await rawSupabaseFetch(`tasks?select=*&origin=eq.instance&parent_task_id=is.null&project_members=not.is.null&project_members.user_id=eq.${userId}`, {
              method: 'GET'
            });
            return (data as Project[]) || [];
          } catch {
            return [];
          }
        });
      },
      filter: async (filters: Record<string, string | number | boolean | null>): Promise<Project[]> => {
        return retry(async () => {
          const queryParams = [
            'select=*',
            'parent_task_id=is.null',
            'origin=eq.instance'
          ];

          Object.keys(filters).forEach((key) => {
            const val = filters[key];
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
      addMemberByEmail: async (projectId: string, email: string, role: string): Promise<{ data: unknown, error: Error | null }> => {
        return retry(async () => {
          const data = await rawSupabaseFetch('rpc/add_project_member_by_email', {
            method: 'POST',
            body: JSON.stringify({ p_project_id: projectId, p_email: email, p_role: role })
          });
          return { data, error: null };
        });
      },
    },
    Task: {
      ...createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
      fetchChildren: async (taskId: string): Promise<{ data: Task[] | null, error: unknown }> => {
        try {
          const targetTask = await planter.entities.Task.get(taskId);
          if (!targetTask) throw new Error('Task not found');

          const projectRootId = targetTask.root_id || targetTask.id;
          const projectTasks = await planter.entities.Task.filter({ root_id: projectRootId });

          const descendants: Task[] = [];
          const queue = [taskId];
          const visited = new Set([taskId]);

          const rootTask = projectTasks.find((t) => t.id === taskId);
          if (rootTask) descendants.push(rootTask);

          while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = projectTasks.filter((t) => t.parent_task_id === currentId);

            children.forEach((child) => {
              if (!visited.has(child.id)) {
                visited.add(child.id);
                descendants.push(child);
                queue.push(child.id);
              }
            });
          }

          return { data: descendants, error: null };
        } catch (error) {
          console.error('[PlanterClient.fetchChildren] Error:', error);
          return { data: null, error };
        }
      },
      updateStatus: async (taskId: string, status: string): Promise<{ data: Task | null, error: unknown }> => {
        try {
          const data = await planter.entities.Task.update(taskId, { status } as TaskUpdate);

          if (status === 'completed') {
            const children = await planter.entities.Task.filter({ parent_task_id: taskId });
            if (children && children.length > 0) {
              await Promise.all(
                children.map((child) => (planter.entities.Task as TaskEntityClient).updateStatus(child.id, 'completed'))
              );
            }
          }
          return { data, error: null };
        } catch (error: unknown) {
          console.error('[PlanterClient.updateStatus] Error:', error);
          return { data: null, error: error instanceof Error ? error.message : error };
        }
      },
      updateParentDates: async (parentId: string | null): Promise<void> => {
        if (!parentId) return;
        try {
          const children = await planter.entities.Task.filter({ parent_task_id: parentId });

          let start_date: string | null = null;
          let due_date: string | null = null;

          if (children && children.length > 0) {
            const validStarts = children.map(t => new Date(t.start_date || '')).filter(d => !isNaN(d.getTime()));
            const validEnds = children.map(t => new Date(t.due_date || '')).filter(d => !isNaN(d.getTime()));

            if (validStarts.length > 0) {
              start_date = new Date(Math.min(...validStarts.map(d => d.getTime()))).toISOString().split('T')[0];
            }
            if (validEnds.length > 0) {
              due_date = new Date(Math.max(...validEnds.map(d => d.getTime()))).toISOString().split('T')[0];
            }
          }

          const parent = await planter.entities.Task.update(parentId, {
            start_date,
            due_date,
            updated_at: new Date().toISOString(),
          } as TaskUpdate);

          if (parent && parent.parent_task_id) {
            await (planter.entities.Task as TaskEntityClient).updateParentDates(parent.parent_task_id);
          }
        } catch (error) {
          console.error('[PlanterClient.updateParentDates] Error:', error);
        }
      },
      clone: async (templateId: string, newParentId: string | null, newOrigin: string, userId: string, overrides: Record<string, unknown> = {}): Promise<{ data: unknown, error: unknown }> => {
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

          return { data, error: null };
        } catch (error) {
          console.error('[PlanterClient.clone] Error:', error);
          return { data: null, error };
        }
      }
    },
    TaskRelationship: createEntityClient<TaskRelationshipRow, Database['public']['Tables']['task_relationships']['Insert'], Database['public']['Tables']['task_relationships']['Update']>('task_relationships'),
    Phase: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
    Milestone: createEntityClient<Task, TaskInsert, TaskUpdate>('tasks'),
    TaskWithResources: {
      ...createEntityClient<unknown, unknown, unknown>('tasks_with_primary_resource'),
      listTemplates: async ({ from = 0, limit = 25, resourceType = null as string | null } = {}): Promise<{ data: unknown[], error: Error | null }> => {
        return retry(async () => {
          const end = from + limit - 1;
          const query = `tasks_with_primary_resource?select=*&origin=eq.template&parent_task_id=is.null&order=created_at.desc${resourceType && resourceType !== 'all' ? `&resource_type=eq.${resourceType}` : ''}`;
          const data = await rawSupabaseFetch(query, {
            method: 'GET',
            headers: { 'Range': `${from}-${end}` }
          });
          return { data: (data as unknown[]) || [], error: null };
        });
      },
      searchTemplates: async ({ query, limit = 20, resourceType = null as string | null }: { query: string, limit?: number, resourceType?: string | null }): Promise<{ data: unknown[], error: Error | null }> => {
        return retry(async () => {
          const normalized = (query || '').trim().slice(0, 100);
          if (!normalized) return { data: [], error: null };

          const pattern = `"%${normalized.replace(/[\\%_]/g, (c) => `\\${c}`)}%"`;
          const endpoint = `tasks_with_primary_resource?select=*&origin=eq.template&or=(title.ilike.${pattern},description.ilike.${pattern})&order=title.asc&limit=${limit}${resourceType && resourceType !== 'all' ? `&resource_type=eq.${resourceType}` : ''}`;

          const data = await rawSupabaseFetch(endpoint, { method: 'GET' });
          return { data: (data as unknown[]) || [], error: null };
        });
      }
    },
    TaskResource: createEntityClient<TaskResourceRow, Database['public']['Tables']['task_resources']['Insert'], Database['public']['Tables']['task_resources']['Update']>('task_resources'),
    TeamMember: createEntityClient<TeamMemberRow, Database['public']['Tables']['project_members']['Insert'], Database['public']['Tables']['project_members']['Update']>('project_members'),
    Person: createEntityClient<PersonRow, Database['public']['Tables']['people']['Insert'], Database['public']['Tables']['people']['Update']>('people'),
  } as {
    Project: ProjectEntityClient;
    Task: TaskEntityClient;
    TaskRelationship: EntityClient<TaskRelationshipRow, Database['public']['Tables']['task_relationships']['Insert'], Database['public']['Tables']['task_relationships']['Update']>;
    Phase: EntityClient<Task, TaskInsert, TaskUpdate>;
    TaskWithResources: {
      listTemplates: (options?: { from?: number, limit?: number, resourceType?: string | null }) => Promise<{ data: unknown[], error: Error | null }>;
      searchTemplates: (options: { query: string, limit?: number, resourceType?: string | null }) => Promise<{ data: unknown[], error: Error | null }>;
    };
    TeamMember: EntityClient<TeamMemberRow, Database['public']['Tables']['project_members']['Insert'], Database['public']['Tables']['project_members']['Update']>;
    Person: EntityClient<PersonRow, Database['public']['Tables']['people']['Insert'], Database['public']['Tables']['people']['Update']>;
  },
  rpc: async (functionName: string, params: Record<string, unknown>): Promise<{ data: unknown, error: unknown }> => {
    return retry(async () => {
      try {
        const data = await rawSupabaseFetch(`rpc/${functionName}`, {
          method: 'POST',
          body: JSON.stringify(params),
          headers: { 'Prefer': 'return=representation' }
        });
        return { data, error: null };
      } catch (error: unknown) {
        return { data: null, error };
      }
    });
  },
};

export default planter;
