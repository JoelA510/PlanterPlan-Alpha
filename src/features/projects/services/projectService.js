import { planter } from '@shared/api/planterClient';
import { supabase } from '@app/supabaseClient';

// --- Membership ---

export async function inviteMember(projectId, userId, role) {
  return await planter.entities.Project.addMember(projectId, userId, role);
}

export async function inviteMemberByEmail(projectId, email, role) {
  return await planter.entities.Project.addMemberByEmail(projectId, email, role);
}

// --- Projects (Queries) ---

/**
 * Get projects owned by a user with pagination.
 * @param {string} userId - The user's ID
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [pageSize=20] - Items per page
 * @returns {Promise<{data: Array, error: null}>} Paginated project list
 */
export async function getUserProjects(userId, page = 1, pageSize = 20) {
  // Use safe listByCreator method from planter client (Raw Fetch)
  try {
    console.warn('[DEBUG_SIDEBAR] getUserProjects called with:', userId);
    const data = await planter.entities.Project.listByCreator(userId, page, pageSize);
    return { data, error: null };
  } catch (error) {
    console.error('getUserProjects failed:', error);
    return { data: [], error };
  }
}

export async function getJoinedProjects(userId) {
  // Use safe listJoined method from planter client (Raw Fetch)
  try {
    console.warn('[DEBUG_SIDEBAR] getJoinedProjects called with:', userId);
    const data = await planter.entities.Project.listJoined(userId);
    return { data, error: null };
  } catch (error) {
    console.error('getJoinedProjects failed:', error);
    return { data: [], error };
  }
}

export async function getProjectWithStats(projectId) {
  // Fetch Project (Root Task)
  const { data: project, error: projError } = await supabase
    .from('tasks')
    .select('*, name:title, launch_date:due_date, owner_id:creator')
    .eq('id', projectId)
    .single();

  if (projError) throw projError;

  // Fetch Tasks for Stats (Children)
  // Logic: All tasks where root_id = projectId OR project_id = projectId?
  // Schema has `project_id` on tasks? No, it has `root_id`.
  // Schema: `root_id uuid` (Line 35).
  // So we must use `root_id`.

  const { count: totalTasks, error: totalError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('root_id', projectId);

  const { count: completedTasks, error: completedError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('root_id', projectId)
    .eq('is_complete', true);

  if (totalError || completedError) console.warn('Stats fetch error', totalError, completedError);

  // Fetch ALL children
  const { data: children } = await supabase.from('tasks').select('*').eq('root_id', projectId);

  return {
    data: {
      ...project,
      children: children || [],
      stats: {
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    },
    error: null,
  };
}

export async function updateProjectStatus(projectId, status) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return { data, error: null };
}

// --- Projects (Mutations) ---


/**
 * Creates a new project with default phases, milestones, and tasks.
 * @param {Object} projectData - The project data (name, launch_date, etc.)
 * @returns {Promise<Object>} - The created project object
 */
export async function createProjectWithDefaults(projectData) {
  // Get creator from arguments (preferred) or fallback to auth
  let creatorId = projectData.creator;

  if (!creatorId) {
    const { data: { user } } = await supabase.auth.getUser();
    creatorId = user?.id;
  }

  if (!creatorId) throw new Error('User must be logged in to create a project');

  // Get session token to ensure PlanterClient works even if localStorage is tricky
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 1. Create the Project container
  const project = await planter.entities.Project.create({
    ...projectData,
    launch_date: (() => {
      if (!projectData.launch_date) return null;
      const date = new Date(projectData.launch_date);
      if (isNaN(date.getTime())) throw new Error('Invalid launch_date provided');
      return date.toISOString().split('T')[0];
    })(),
    creator: creatorId, // Pass explicitly
    _token: token // Pass token to bypass PlanterClient's localStorage scan
  });

  // 2. Initialize default structure via Server-Side RPC
  // This replaces ~200 client-side requests with 1 atomic transaction.
  console.log('[ProjectService] Initializing default project via RPC...', { projectId: project.id, creatorId });
  const { error } = await supabase.rpc('initialize_default_project', {
    p_project_id: project.id,
    p_creator_id: creatorId
  });

  if (error) {
    console.error('[ProjectService] RPC Error:', error);
    // Rollback: Delete the project if initialization fails to prevent orphans
    try {
      await planter.entities.Project.delete(project.id);
      console.warn('Rolled back project creation due to initialization failure.');
    } catch (rollbackError) {
      console.error('CRITICAL: Failed to rollback project creation:', rollbackError);
    }
    throw new Error('Project initialization failed. Please try again.');
  }

  return project;
}
