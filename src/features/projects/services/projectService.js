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
 * Direct Project Creation to bypass Entity wrapper issues.
 * Retains strict RLS compatibility via RPC.
 */
export async function createProject(projectData) {
  const { data: user } = await planter.auth.me();
  if (!user) throw new Error('User must be logged in');

  // 1. Create Project (Row) - Direct Insert
  // Mapped to 'tasks' table via planter client if 'projects' alias exists, 
  // or checks strictly if 'projects' table was restored.
  // Assuming 'projects' alias maps to 'tasks' with root_id=null in PlanterClient, 
  // OR the user expects 'projects' table. 
  // Based on schema, we insert into 'tasks' but use 'projects' collection name for client.

  const { data: project, error: projError } = await planter.create('projects', {
    title: projectData.title,
    start_date: projectData.start_date,
    creator: user.id
  });
  if (projError) throw projError;

  // 2. Initialize Membership (RPC) - Fixes RLS Deadlock
  const { error: rpcError } = await planter.rpc('initialize_default_project', {
    p_project_id: project.id,
    p_creator_id: user.id
  });

  if (rpcError) {
    // Rollback if RPC fails
    await planter.delete('projects', project.id);
    throw rpcError;
  }

  return project;
}

export async function createProjectWithDefaults(projectData) {
  console.log('[ProjectService] createProjectWithDefaults called with:', JSON.stringify(projectData, null, 2));

  // Get creator from arguments (preferred) or fallback to auth
  let creatorId = projectData.creator;
  let token = projectData._token;

  if (!creatorId) {
    const me = await planter.auth.me();
    creatorId = me?.id;
  }

  if (!creatorId) throw new Error('User must be logged in to create a project');
  console.log('[ProjectService] Step 1: Creator resolved:', creatorId);

  // 1. Create the Project container
  let project;
  try {
    project = await planter.entities.Project.create({
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
    console.log('[ProjectService] Step 2: Project INSERT succeeded:', JSON.stringify(project, null, 2));
  } catch (insertError) {
    console.error('[ProjectService] Step 2 FAILED: Project INSERT error:', insertError);
    throw insertError;
  }

  if (!project?.id) {
    console.error('[ProjectService] Step 2 FAILED: No project.id returned. Raw value:', project);
    throw new Error('Project creation failed: no ID returned from database.');
  }

  // 2. Initialize default structure via Server-Side RPC
  console.log('[ProjectService] Step 3: Calling initialize_default_project RPC...', { projectId: project.id, creatorId });
  const { data: rpcData, error } = await planter.rpc('initialize_default_project', {
    p_project_id: project.id,
    p_creator_id: creatorId
  });
  console.log('[ProjectService] Step 3 result:', { rpcData, error });

  if (error) {
    console.error('[ProjectService] Step 3 FAILED: RPC Error:', error);
    // Rollback: Delete the project if initialization fails to prevent orphans
    try {
      await planter.entities.Project.delete(project.id);
      console.warn('[ProjectService] Rolled back project creation due to initialization failure.');
    } catch (rollbackError) {
      console.error('[ProjectService] CRITICAL: Failed to rollback project creation:', rollbackError);
    }
    throw new Error('Project initialization failed. Please try again.');
  }

  console.log('[ProjectService] Step 4: SUCCESS — returning project with id:', project.id);
  return project;
}
