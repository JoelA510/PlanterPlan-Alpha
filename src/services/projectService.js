import { supabase } from '../supabaseClient';
import { ROLES } from '../constants';

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

    // 3. Filter out projects created by the user (they appear in "My Projects")
    //    This prevents duplicates when a user creates a project and is also a member.
    const filteredProjects = projects.filter((project) => project.creator !== userId);

    // 4. Merge role info into the project objects for UI display
    const joinedProjects = filteredProjects.map((project) => {
      const membership = memberships.find((m) => m.project_id === project.id);
      return {
        ...project,
        membership_role: membership?.role || ROLES.VIEWER,
      };
    });

    return { data: joinedProjects, error: null };
  } catch (error) {
    console.error('[projectService.getJoinedProjects] Error:', error);
    return { data: null, error };
  }
};

export const inviteMember = async (projectId, userId, role = ROLES.VIEWER, client = supabase) => {
  try {
    // Check if membership already exists?
    // Depending on RLS and constraints, we might just upsert or insert.
    // Let's assume insert.
    // Fix SEC-05: Use upsert to handle duplicates idempotently
    // Fix SEC-04: Remove client-side 'joined_at' (let DB default handle it)
    const { data, error } = await client
      .from('project_members')
      .upsert(
        {
          project_id: projectId,
          user_id: userId,
          role,
        },
        { onConflict: 'project_id, user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[projectService.inviteMember] Error:', error);
    return { data: null, error };
  }
};

export const inviteMemberByEmail = async (
  projectId,
  email,
  role = ROLES.VIEWER,
  client = supabase
) => {
  try {
    const { data, error } = await client.functions.invoke('invite-by-email', {
      body: { projectId, email, role },
      method: 'POST',
    });

    if (error) {
      console.error('[projectService.inviteMemberByEmail] Edge Function Error:', error);
      throw error;
    }

    // The edge function might return 200 OK but with { error: "..." } in the body
    if (data && data.error) {
      console.warn('[projectService.inviteMemberByEmail] Logical Error:', data.error);
      const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(msg);
    }

    return { data, error: null };
  } catch (error) {
    console.error('[projectService.inviteMemberByEmail] Exception:', error);
    // Return the error object directly so the UI can extract .message
    return { data: null, error };
  }
};
