import { supabase } from '@app/supabaseClient';

// Base44 API Client Adapter
// Maps the new "base44" API calls to our existing Supabase and Service layer.

export const base44 = {
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
        // Fetch projects (PlanterPlan uses templates as projects sometimes, mapping required)
        // For now, return a dummy list if empty or fetch from tasks/projects table
        // This relies on the implementation of taskService or direct DB calls

        // Simulating Base44 project structure from existing data
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
    },
    // Add other entities as needed based on usage
  },
};

export default base44;
