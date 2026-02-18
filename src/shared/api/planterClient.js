import { supabase } from '@app/supabaseClient';
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
      ...createEntityClient('tasks', '*,name:title,launch_date:due_date,owner_id:creator'),
      // Override list to filter for Root Tasks (Projects)
      list: async () => {
        return retry(async () => {
          // Use Raw Fetch to bypass potential client AbortErrors
          try {
            const data = await rawSupabaseFetch(
              'tasks?select=*,name:title,launch_date:due_date,owner_id:creator&parent_task_id=is.null&origin=eq.instance&order=created_at.desc',
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
      // Override create for specific mapping
      create: async (projectData) => {
        return retry(async () => {
          // console.log('[PlanterClient] Creating project (Raw Fetch):', projectData);

          const userId = projectData.creator;

          // Extract explicit token if provided
          const explicitToken = projectData._token;
          const cleanProjectData = { ...projectData };
          delete cleanProjectData._token;

          const taskPayload = {
            title: cleanProjectData.title || cleanProjectData.name,
            description: cleanProjectData.description,
            due_date: cleanProjectData.launch_date,
            origin: 'instance',
            parent_task_id: null,
            root_id: null, // Critical for RLS "Proect" detection
            status: cleanProjectData.status || 'planning',
            creator: userId, // Required for RLS
          };

          // console.log('[PlanterClient] FINAL PAYLOAD (Tasks Table):', JSON.stringify(taskPayload, null, 2));

          const data = await rawSupabaseFetch(
            'tasks?select=*,name:title,launch_date:due_date,owner_id:creator',
            {
              method: 'POST',
              headers: { 'Prefer': 'return=representation,headers=off' }, // Return single object not array? PostgREST returns array by default.
              body: JSON.stringify(taskPayload)
            },
            explicitToken // Pass explicit token
          );

          // PostgREST returns an array for inserts. We need single object.
          return data?.[0] || data;
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
              `tasks?select=*,project_id:root_id,name:title,launch_date:due_date,owner_id:creator` +
              `&creator=eq.${encodeURIComponent(userId)}` +
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
            const query = `project_members?select=project:tasks(*,name:title,launch_date:due_date,owner_id:creator)&user_id=eq.${userId}`;

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
            'select=*,name:title,launch_date:due_date,owner_id:creator',
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
    Task: createEntityClient('tasks'),
    Phase: createEntityClient('tasks'),
    Milestone: createEntityClient('tasks'),
    TaskWithResources: createEntityClient('tasks_with_primary_resource'),
    TaskResource: createEntityClient('task_resources'),
    TeamMember: createEntityClient('project_members'),
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
