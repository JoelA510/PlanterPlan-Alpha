import { supabase } from '@app/supabaseClient';
import { retryOperation } from '@shared/utils/retry';

/**
 * Planter API Client Adapter
 * Maps the new "planter" API calls to our existing Supabase and Service layer.
 * This adapter pattern decouples the UI from direct Supabase calls, allowing for
 * easier testing and potential backend swaps.
 */

// Helper factory for generic CRUD operations
const createEntityClient = (tableName, select = '*') => ({
  /**
   * List all records
   * @returns {Promise<Array>}
   */
  list: async () => {
    return retryOperation(async () => {
      const { data, error } = await supabase.from(tableName).select(select);
      if (error) {
        if (error.name === 'AbortError' || error.code === '20') {
          console.warn(`PlanterClient: list(${tableName}) aborted`);
          return [];
        }
        throw error;
      }
      return data;
    });
  },
  /**
   * Get a single record by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  get: async (id) => {
    return retryOperation(async () => {
      const { data, error } = await supabase.from(tableName).select(select).eq('id', id).single();
      if (error) throw error;
      return data;
    });
  },
  /**
   * Create a new record
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  create: async (payload) => {
    return retryOperation(async () => {
      const { data, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select(select)
        .single();
      if (error) throw error;
      return data;
    });
  },
  /**
   * Update a record
   * @param {string} id
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  update: async (id, payload) => {
    return retryOperation(async () => {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select(select)
        .single();
      if (error) throw error;
      return data;
    });
  },
  /**
   * Delete a record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {
    return retryOperation(async () => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    });
  },
  /**
   * Filter records by key-value pairs
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  filter: async (filters) => {
    let query = supabase.from(tableName).select(select);
    Object.keys(filters).forEach((key) => {
      query = query.eq(key, filters[key]);
    });
    const { data, error } = await query;
    if (error) {
      if (error.name === 'AbortError' || error.code === '20') return [];
      throw error;
    }
    return data;
  },
});



export const planter = {
  auth: {
    me: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
  },
  entities: {
    Project: {
      ...createEntityClient('tasks', '*, name:title, launch_date:due_date, owner_id:creator'),
      // Override list to filter for Root Tasks (Projects)
      list: async () => {
        return retryOperation(async () => {
          const { data, error } = await supabase
            .from('tasks')
            .select('*, name:title, launch_date:due_date, owner_id:creator')
            .is('parent_task_id', null)
            .eq('origin', 'instance')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data;
        }).catch(err => {
          console.error('PlanterClient: Project.list failed after retries', err);
          return []; // Fallback to empty to prevent UI crash
        });
      },
      // Override create for specific mapping
      create: async (projectData) => {
        console.log('[PlanterClient] Creating project:', projectData);

        let userId = projectData.creator;

        // Fallback only if not provided (legacy support)
        if (!userId) {
          console.warn('[PlanterClient] No creator passed, fetching user (risky)...');
          const {
            data: { user },
          } = await supabase.auth.getUser();
          userId = user?.id;
        }

        const taskPayload = {
          title: projectData.title || projectData.name,
          description: projectData.description,
          due_date: projectData.launch_date,
          origin: 'instance',
          parent_task_id: null,
          status: projectData.status || 'planning',
          creator: userId, // Required for RLS
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert([taskPayload])
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .single();

        if (error) throw error;
        return data;
      },
      // Override filter to ensure we only get projects
      filter: async (filters) => {
        return retryOperation(async () => {
          let query = supabase
            .from('tasks')
            .select('*, name:title, launch_date:due_date, owner_id:creator')
            .is('parent_task_id', null)
            .eq('origin', 'instance');

          Object.keys(filters).forEach((key) => {
            query = query.eq(key, filters[key]);
          });
          const { data, error } = await query;
          if (error) throw error;
          return data;
        }).catch(() => []);
      },
      // Custom methods
      addMember: async (projectId, userId, role) => {
        const { data, error } = await supabase
          .from('project_members')
          .insert([{ project_id: projectId, user_id: userId, role }])
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      addMemberByEmail: async (projectId, email, role) => {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          return await planter.entities.Project.addMember(projectId, user.id, role);
        }

        const { data, error } = await supabase.rpc('invite_user_to_project', {
          p_project_id: projectId,
          p_email: email,
          p_role: role,
        });
        if (error) throw error;
        return data;
      },
    },
    Task: createEntityClient('tasks'),
    Phase: createEntityClient('tasks'),
    Milestone: createEntityClient('tasks'),
    TeamMember: createEntityClient('project_members'),
  },
};

export default planter;
