import { planter } from '@shared/api/planterClient';


// --- Membership ---

export async function inviteMember(projectId, userId, role) {
  try {
    return await planter.entities.Project.addMember(projectId, userId, role);
  } catch (error) {
    if (error.code === '42501' || (error.message && error.message.includes('policy'))) {
      throw new Error('Access denied: You must be an Owner to manage members.');
    }
    throw error;
  }
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
  const project = await planter.entities.Task.get(projectId); // Task entities for projects

  if (!project) throw new Error('Project not found');

  // Fetch Tasks for Stats (Children)
  // Logic: All tasks where root_id = projectId
  // Note: We need Counts. PlanterClient 'filter' doesn't support count.
  // We will manually fetch all IDs for now since we are client-side filtering anyway or
  // we can add a 'count' method to PlanterClient later. 
  // For now, let's fetch 'id, root_id, is_complete' for all children to calculate stats.
  // This is actually safer against AbortError than complex count queries sometimes.

  // NOTE: planter.entities.Task.filter is generic.
  // Let's use a specific filter call that we know usually works.
  const allProjectTasks = await planter.entities.Task.filter({ root_id: projectId });

  const totalTasks = allProjectTasks.length;
  const completedTasks = allProjectTasks.filter(t => t.is_complete).length;

  return {
    data: {
      ...project,
      children: allProjectTasks || [],
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
  try {
    const data = await planter.entities.Project.update(projectId, { status });
    return { data, error: null };
  } catch (error) {
    console.error('updateProjectStatus failed:', error);
    throw error;
  }
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
  let token = projectData._token;

  // We can't use supabase.auth calls here if we want to be pure.
  // But we need the USER ID.
  if (!creatorId) {
    const me = await planter.auth.me();
    creatorId = me?.id;
  }

  if (!creatorId) throw new Error('User must be logged in to create a project');

  // 1. Create the Project container
  const project = await planter.entities.Project.create({
    ...projectData,
    launch_date: (() => {
      if (!projectData.launch_date) return null;
      const date = new Date(projectData.launch_date);
      if (isNaN(date.getTime())) throw new Error('Invalid launch_date provided');
      return date.toISOString().split('T')[0];
    })(),
    creator: creatorId,
    _token: token
  });

  // 2. Initialize default structure via Server-Side RPC
  console.log('[ProjectService] Initializing default project via RPC...', { projectId: project.id, creatorId });
  const { error } = await planter.rpc('initialize_default_project', {
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
