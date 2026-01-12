import { supabase } from '@app/supabaseClient';

// Planter API Client Adapter
// Maps the new "planter" API calls to our existing Supabase and Service layer.

// Helper factory for generic CRUD operations
const createEntityClient = (tableName, select = '*') => ({
  list: async () => {
    const { data, error } = await supabase.from(tableName).select(select);
    if (error) throw error;
    return data;
  },
  get: async (id) => {
    const { data, error } = await supabase.from(tableName).select(select).eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from(tableName).insert([payload]).select(select).single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select(select).single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  filter: async (filters) => {
    let query = supabase.from(tableName).select(select);
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key]);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
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
        const { data, error } = await supabase
          .from('tasks')
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .is('parent_task_id', null)
          .eq('origin', 'instance')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      // Override create for specific mapping
      create: async (projectData) => {
        const { data: { user } } = await supabase.auth.getUser();

        const taskPayload = {
          title: projectData.name,
          description: projectData.description,
          due_date: projectData.launch_date,
          origin: 'instance',
          parent_task_id: null,
          status: 'planning',
          creator: user.id, // Required for RLS
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
        let query = supabase.from('tasks')
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .is('parent_task_id', null)
          .eq('origin', 'instance');

        Object.keys(filters).forEach(key => {
          query = query.eq(key, filters[key]);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
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
          p_role: role
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
