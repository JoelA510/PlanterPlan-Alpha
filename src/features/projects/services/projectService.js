import { supabase } from '@app/supabaseClient';
import { ROLES } from '@app/constants/index';

export const getUserProjects = async (userId, page = 1, pageSize = 10, client = supabase) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch root projects (tasks with origin='instance' and parent_task_id=null)
    const { data, count, error } = await client
      .from('tasks_with_primary_resource')
      .select('*', { count: 'exact' })
      .eq('creator', userId)
      .eq('origin', 'instance')
      .is('parent_task_id', null)
      .order('updated_at', { ascending: false }) // Sort by recently updated
      .range(from, to);

    if (error) throw error;

    return { data, count, error: null };
  } catch (error) {
    console.error('[projectService.getUserProjects] Error:', error);
    return { data: null, count: 0, error };
  }
};

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

/**
 * Fetches a single project with its tasks for reporting.
 * @param {string} projectId 
 * @param {object} client 
 * @returns {Promise<{data: any, error: any}>}
 */
export const getProjectWithStats = async (projectId, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks')
      .select('*, children:tasks(*)') // fetch direct children via foreign key relationship
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[projectService.getProjectWithStats] Error:', error);
    return { data: null, error };
  }
};
