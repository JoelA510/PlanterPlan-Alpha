import { supabase } from '../supabaseClient';

export const getJoinedProjects = async (userId, client = supabase) => {
  try {
    // 1. Get project IDs where the user is a member
    const { data: memberships, error: memberError } = await client
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const projectIds = memberships.map((m) => m.project_id);

    // 2. Fetch the actual project tasks
    const { data: projects, error: projectError } = await client
      .from('tasks')
      .select('*')
      .in('id', projectIds)
      .order('updated_at', { ascending: false });

    if (projectError) throw projectError;

    // 3. Merge role info into the project objects for UI display
    const joinedProjects = projects.map((project) => {
      const membership = memberships.find((m) => m.project_id === project.id);
      return {
        ...project,
        membership_role: membership?.role || 'viewer',
      };
    });

    return { data: joinedProjects, error: null };
  } catch (error) {
    console.error('[projectService.getJoinedProjects] Error:', error);
    return { data: null, error };
  }
};

export const inviteMember = async (projectId, userId, role = 'viewer', client = supabase) => {
  try {
    // Check if membership already exists?
    // Depending on RLS and constraints, we might just upsert or insert.
    // Let's assume insert.
    const { data, error } = await client
      .from('project_members')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[projectService.inviteMember] Error:', error);
    return { data: null, error };
  }
};
