import { supabase } from '@app/supabaseClient';

// Planter API Client Adapter
// Maps the new "planter" API calls to our existing Supabase and Service layer.

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
      list: async () => {
        // Fetch projects (Root Tasks)
        // Map 'title' -> 'name', 'due_date' -> 'launch_date'
        const { data, error } = await supabase
          .from('tasks')
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .is('parent_task_id', null)
          .eq('origin', 'instance') // Ensure we don't fetch templates as projects
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      get: async (id) => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      create: async (projectData) => {
        // Map incoming projectData to task columns
        const taskPayload = {
          title: projectData.name,
          description: projectData.description,
          due_date: projectData.launch_date, // Mapping launch_date to due_date
          origin: 'instance',
          parent_task_id: null, // Root task
          status: 'planning', // Default status
          // location? No standard column, maybe notes? Skipping for now to avoid schema violation.
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert([taskPayload])
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .single();

        if (error) throw error;
        return data;
      },
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
        // Strategy A: Check profiles
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          return await planter.entities.Project.addMember(projectId, user.id, role);
        }

        // Strategy B: RPC
        const { data, error } = await supabase.rpc('invite_user_to_project', {
          p_project_id: projectId,
          p_email: email,
          p_role: role
        });
        if (error) throw error;
        return data;
      },
      filter: async (filters) => {
        let query = supabase.from('tasks')
          .select('*, name:title, launch_date:due_date, owner_id:creator')
          .is('parent_task_id', null)
          .eq('origin', 'instance');

        Object.keys(filters).forEach(key => {
          // Map id filter correctly considering mapped fields if needed, but 'id' is standard
          query = query.eq(key, filters[key]);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
    },
    Task: {
      list: async () => {
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) throw error;
        return data;
      },
      filter: async (filters) => {
        let query = supabase.from('tasks').select('*');
        Object.keys(filters).forEach(key => {
          query = query.eq(key, filters[key]);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
    },
    Phase: {
      list: async () => {
        const { data, error } = await supabase.from('phases').select('*');
        if (error) throw error;
        return data;
      },
      filter: async (filters) => {
        let query = supabase.from('phases').select('*');
        Object.keys(filters).forEach(key => {
          query = query.eq(key, filters[key]);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      get: async (id) => {
        const { data, error } = await supabase.from('phases').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      }
    },
    Milestone: {
      list: async () => {
        const { data, error } = await supabase.from('milestones').select('*');
        if (error) throw error;
        return data;
      },
      filter: async (filters) => {
        let query = supabase.from('milestones').select('*');
        Object.keys(filters).forEach(key => {
          query = query.eq(key, filters[key]);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
    },
    TeamMember: {
      list: async () => {
        const { data, error } = await supabase.from('project_members').select('*');
        if (error) throw error;
        return data;
      },
    },
  },
};

export default planter;
