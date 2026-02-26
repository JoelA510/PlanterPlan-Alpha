import { supabase } from '@/shared/db/client';
import { retry } from '../lib/retry.js';

const getEnv = (key) => {
  let val;
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


// NOTE: Internal supabase client removed. All ops use rawSupabaseFetch.

/**
 * Planter API Client Adapter
 * Maps the new "planter" API calls to our existing Supabase and Service layer.
 * This adapter pattern decouples the UI from direct Supabase calls, allowing for
 * easier testing and potential backend swaps.
 */

// Helper factory for generic CRUD operations
// Helper factory for generic CRUD operations using Raw Fetch
const createEntityClient = (tableName, select = '*') => ({
  /**
   * List all records
   * @returns {Promise<Array>}
   */
  list: async () => {
    return retry(async () => {
      // select=* needs to be URL encoded or safe?
      // simple select string usually works.
      const query = `${tableName}?select=${select}`;
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return data || [];
    });
  },
  /**
   * Get a single record by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  get: async (id) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&id=eq.${id}`;
      // PostgREST returns array. We want single. 
      // We can use validation header 'Accept: application/vnd.pgrst.object+json' 
      // or just [0] client side. Client side is safer fallback.
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return data?.[0] || null;
    });
  },
  /**
   * Create a new record
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  create: async (payload) => {
    return retry(async () => {
      console.log(`[PlanterClient] Creating ${tableName} (Raw Fetch):`, payload);
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' }
        }
      );
      // PostgREST return array for inserts
      return data?.[0] || data;
    });
  },
  /**
   * Update a record
   * @param {string} id
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  update: async (id, payload) => {
    return retry(async () => {
      const data = await rawSupabaseFetch(
        `${tableName}?select=${select}&id=eq.${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { 'Prefer': 'return=representation' }
        }
      );
      return data?.[0] || data;
    });
  },
  /**
   * Delete a record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {
    return retry(async () => {
      await rawSupabaseFetch(`${tableName}?id=eq.${id}`, { method: 'DELETE' });
      return true;
    });
  },
  /**
   * Filter records by key-value pairs
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  filter: async (filters) => {
    return retry(async () => {
      let queryParams = [`select=${select}`];
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
      return data || [];
    });
  },
  /**
   * List records by creator
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  listByCreator: async (userId) => {
    return retry(async () => {
      const query = `${tableName}?select=${select}&creator=eq.${userId}`;
      const data = await rawSupabaseFetch(query, { method: 'GET' });
      return data || [];
    });
  },
  /**
   * Upsert records (Insert or Update)
   * @param {Object|Array} payload - Single object or array of objects
   * @param {Object} options - { onConflict: 'id', ignoreDuplicates: false }
   * @returns {Promise<any>}
   */
  upsert: async (payload, options = {}) => {
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
      return { data, error: null };
    });
  }
});



// Helper to get token from Supabase auth session (primary) or deterministic localStorage (fallback)
const getSupabaseToken = async () => {
  // Primary: use official Supabase client session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (e) {
    console.warn('[PlanterClient] getSession() failed, falling back to localStorage', e);
  }

  // Fallback: Deterministic localStorage lookup
  if (typeof window === 'undefined') return null;

  // 0. E2E Bypass Token (Explicit)
  const bypassToken = localStorage.getItem('e2e-bypass-token');
  if (bypassToken) return bypassToken;

  // 1. Try generic "sb-<ref>-auth-token" pattern if URL is standard
  try {
    const urlStr = import.meta.env.VITE_SUPABASE_URL; // e.g. https://xyz.supabase.co
    if (urlStr) {
      const url = new URL(urlStr);
      const ref = url.hostname.split('.')[0]; // xyz
      const key = `sb-${ref}-auth-token`;
      const item = localStorage.getItem(key);
      if (item) {
        const session = JSON.parse(item);
        return session?.access_token;
      }
    }
  } catch (e) { /* ignore */ }

  // 2. Legacy scan (Limit loop if absolutely necessary, but prefer strict)
  return null;
};

// Raw Fetch Wrapper for robustness against Supabase Client AbortErrors
const rawSupabaseFetch = async (endpoint, options = {}, explicitToken = null) => {
  const token = explicitToken || await getSupabaseToken();
  if (!token) throw new Error('No auth token available for raw fetch');

  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation', // Default to returning data
    ...options.headers
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
    // Auth should be handled by the main supabase client / AuthContext.
    // We provide placeholder me() to not break existing calls, but implementation usually handled by Context.
    me: async () => {
      // console.warn('[PlanterClient] auth.me() called - falling back to direct fetch'); // Removed: This is now the primary method.
      const token = await getSupabaseToken();
      if (!token) return null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
    signOut: async () => {
      // console.warn('[PlanterClient] signOut called - cannot sign out via Raw Fetch. Use AuthContext.');
      // Returns empty promise
      return Promise.resolve();
    },
    updateProfile: async (attributes) => {
      return retry(async () => {
        // Use official SDK for safe metadata updates
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
      ...createEntityClient('tasks', '*'),
      // Override list to filter for Root Tasks (Projects)
      list: async () => {
        return retry(async () => {
          // Use Raw Fetch to bypass potential client AbortErrors
          try {
            const data = await rawSupabaseFetch(
              'tasks?select=*&parent_task_id=is.null&origin=eq.instance&order=created_at.desc',
              { method: 'GET' }
            );
            return data;
          } catch (err) {
            console.error('[PlanterClient] Raw Fetch List failed:', err);
            // Fallback to client if raw fails? No, client is definitely broken.
            throw err;
          }
        });
      },
      // Override create for specific mapping and default initialization
      create: async (projectData) => {
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
              } catch (e) { }
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
            name: cleanProjectData.title || cleanProjectData.name,
            description: cleanProjectData.description,
            launch_date: isoLaunchDate,
            origin: 'instance',
            parent_task_id: null,
            root_id: null, // Critical for RLS "Project" detection
            status: cleanProjectData.status || 'planning',
            owner_id: userId, // Required for RLS
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

          const project = data?.[0] || data;

          if (!project?.id) {
            throw new Error('Project creation failed: no ID returned from database.');
          }

          // 2. Initialize default structure via Server-Side RPC
          try {
            await rawSupabaseFetch('rpc/initialize_default_project', {
              method: 'POST',
              body: JSON.stringify({ p_project_id: project.id, p_creator_id: userId })
            }, explicitToken);
          } catch (error) {
            console.error('[PlanterClient] RPC Error:', error);
            try {
              await rawSupabaseFetch(`tasks?id=eq.${project.id}`, { method: 'DELETE' }, explicitToken);
            } catch (r) { }
            throw new Error('Project initialization failed. Please try again.');
          }

          return project;
        });
      },
      // Get project with computed stats
      getWithStats: async (projectId) => {
        return retry(async () => {
          const projectQuery = `tasks?select=*&id=eq.${projectId}`;
          const pData = await rawSupabaseFetch(projectQuery, { method: 'GET' });
          const project = pData?.[0];

          if (!project) throw new Error('Project not found');

          const cData = await rawSupabaseFetch(`tasks?select=id,root_id,is_complete&root_id=eq.${projectId}`, { method: 'GET' });
          const children = cData || [];

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
      // Safe list by creator (Raw Fetch)
      listByCreator: async (userId, page = 1, pageSize = 20) => {
        return retry(async () => {
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          try {
            // Optimization: Server-side filtering using 'creator' column
            // We only fetch what we need.
            const query =
              `tasks?select=*,project_id:root_id` +
              `&owner_id=eq.${encodeURIComponent(userId)}` +
              `&parent_task_id=is.null&origin=eq.instance&order=created_at.desc`;

            const data = await rawSupabaseFetch(
              query,
              {
                method: 'GET',
                headers: { 'Range': `${from}-${to}` }
              }
            );

            return data || [];
          } catch (err) {
            console.error('[PlanterClient] listByCreator failed:', err);
            // Propagate error to let React Query / UI handle it
            throw err;
          }
        });
      },
      // Safe list joined projects (Raw Fetch)
      listJoined: async (userId) => {
        return retry(async () => {
          try {
            // PostgREST join syntax: select=project:tasks(*)
            // Note: We need to match the fields selected in getUserProjects/list
            const query = `project_members?select=project:tasks(*)&user_id=eq.${userId}`;

            const data = await rawSupabaseFetch(query, { method: 'GET' });

            // Map structure to match expected format (flatten project)
            return (data || [])
              .map(item => item.project)
              .filter(p => p !== null);

          } catch (err) {
            console.error('[PlanterClient] listJoined failed:', err);
            return [];
          }
        });
      },
      // Override filter to ensure we only get projects
      filter: async (filters) => {
        return retry(async () => {
          // Manual query build for raw fetch
          let queryParams = [
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
          return data || [];
        });
      },
      // Custom methods
      addMember: async (projectId, userId, role) => {
        // INSERT into project_members
        const data = await rawSupabaseFetch(
          'project_members?select=*',
          {
            method: 'POST',
            body: JSON.stringify({ project_id: projectId, user_id: userId, role }),
            headers: { 'Prefer': 'return=representation' }
          }
        );
        return { data: data?.[0], error: null };
      },
      addMemberByEmail: async (projectId, email, role) => {
        // 1. RPC call for invite (handles both existing and new users logic)
        // RPC via Raw Fetch: POST /rpc/function_name
        const data = await rawSupabaseFetch('rpc/invite_user_to_project', {
          method: 'POST',
          body: JSON.stringify({
            p_project_id: projectId,
            p_email: email,
            p_role: role,
          })
        });
        return { data, error: null };
      },
    },
    Task: {
      ...createEntityClient('tasks'),
      fetchChildren: async (taskId) => {
        try {
          const targetTask = await planter.entities.TaskWithResources.get(taskId);
          if (!targetTask) throw new Error('Task not found');

          const projectRootId = targetTask.root_id || targetTask.id;
          const projectTasks = await planter.entities.TaskWithResources.filter({ root_id: projectRootId });

          const descendants = [];
          const queue = [taskId];
          const visited = new Set([taskId]);

          const rootTask = projectTasks.find((t) => t.id === taskId);
          if (rootTask) descendants.push(rootTask);

          while (queue.length > 0) {
            const currentId = queue.shift();
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
      updateStatus: async (taskId, status) => {
        try {
          const data = await planter.entities.Task.update(taskId, { status });

          if (status === 'completed') {
            const children = await planter.entities.Task.filter({ parent_task_id: taskId });
            if (children && children.length > 0) {
              await Promise.all(
                children.map((child) => planter.entities.Task.updateStatus(child.id, 'completed'))
              );
            }
          }
          return { data, error: null };
        } catch (error) {
          console.error('[PlanterClient.updateStatus] Error:', error);
          return { data: null, error: error?.message || error };
        }
      },
      updateParentDates: async (parentId) => {
        if (!parentId) return;
        try {
          const children = await planter.entities.Task.filter({ parent_task_id: parentId });

          let start_date = null;
          let due_date = null;

          if (children && children.length > 0) {
            const validStarts = children.map(t => new Date(t.start_date)).filter(d => !isNaN(d.getTime()));
            const validEnds = children.map(t => new Date(t.due_date)).filter(d => !isNaN(d.getTime()));

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
          });

          if (parent && parent.parent_task_id) {
            await planter.entities.Task.updateParentDates(parent.parent_task_id);
          }
        } catch (error) {
          console.error('[PlanterClient.updateParentDates] Error:', error);
        }
      },
      clone: async (templateId, newParentId, newOrigin, userId, overrides = {}) => {
        try {
          const rpcParams = {
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
    TaskRelationship: createEntityClient('task_relationships'),
    Phase: createEntityClient('tasks'),
    Milestone: createEntityClient('tasks'),
    TaskWithResources: {
      ...createEntityClient('tasks_with_primary_resource'),
      listTemplates: async ({ from = 0, limit = 25, resourceType = null } = {}) => {
        return retry(async () => {
          const end = from + limit - 1;
          let query = `tasks_with_primary_resource?select=*&origin=eq.template&parent_task_id=is.null&order=created_at.desc`;
          if (resourceType && resourceType !== 'all') {
            query += `&resource_type=eq.${resourceType}`;
          }
          const data = await rawSupabaseFetch(query, {
            method: 'GET',
            headers: { 'Range': `${from}-${end}` }
          });
          return { data: data || [], error: null };
        });
      },
      searchTemplates: async ({ query, limit = 20, resourceType = null } = {}) => {
        return retry(async () => {
          const normalized = (query || '').trim().slice(0, 100);
          if (!normalized) return { data: [], error: null };

          const pattern = `"%${normalized.replace(/[\\%_]/g, (c) => `\\${c}`)}%"`;
          let endpoint = `tasks_with_primary_resource?select=*&origin=eq.template&or=(name.ilike.${pattern},description.ilike.${pattern})&order=name.asc&limit=${limit}`;

          if (resourceType && resourceType !== 'all') {
            endpoint += `&resource_type=eq.${resourceType}`;
          }

          const data = await rawSupabaseFetch(endpoint, { method: 'GET' });
          return { data: data || [], error: null };
        });
      }
    },
    TaskResource: createEntityClient('task_resources'),
    TeamMember: createEntityClient('project_members'),
    Person: createEntityClient('people'),
  },
  /**
   * Execute a remote procedure call (RPC)
   * @param {string} functionName
   * @param {Object} params
   * @returns {Promise<{data: any, error: any}>}
   */
  rpc: async (functionName, params) => {
    return retry(async () => {
      try {
        const data = await rawSupabaseFetch(`rpc/${functionName}`, {
          method: 'POST',
          body: JSON.stringify(params),
          headers: { 'Prefer': 'return=representation' } // Or params? RPC uses body for params.
        });
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    });
  },
};


export default planter;
