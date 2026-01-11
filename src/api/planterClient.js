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
        // Fetch projects
        const { data, error } = await supabase.from('projects').select('*');
        if (error) throw error;
        return data;
      },
      get: async (id) => {
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      },
      create: async (projectData) => {
        const { data, error } = await supabase
          .from('projects')
          .insert([projectData])
          .select()
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
        // First try to find user by email
        // Note: This relies on a 'profiles' or 'users' table being readable
        // Or an RPC function. Falling back to RPC 'invite_user_by_email' if available,
        // or just insert to project_invites if that schema exists.
        // For now, attempting direct loose lookup via rpc or generic insert.

        // Strategy A: Check profiles
        const { data: user, error: userError } = await supabase
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
    },
    // Add other entities as needed based on usage
  },
};

export default planter;
