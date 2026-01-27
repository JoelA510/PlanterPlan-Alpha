import { planter } from '@shared/api/planterClient';
import { supabase } from '@app/supabaseClient';
import { TASK_STATUS } from '@app/constants/index';

// --- Membership ---

export async function inviteMember(projectId, userId, role) {
  return await planter.entities.Project.addMember(projectId, userId, role);
}

export async function inviteMemberByEmail(projectId, email, role) {
  return await planter.entities.Project.addMemberByEmail(projectId, email, role);
}

// --- Projects (Queries) ---

export async function getUserProjects(userId, page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use 'tasks' table, filtering for root tasks (parent_task_id is null)
  const { data, error } = await supabase
    .from('tasks')
    .select('*, name:title, launch_date:due_date, owner_id:creator')
    .eq('creator', userId)
    .is('parent_task_id', null)
    .eq('origin', 'instance')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, error: null };
}

export async function getJoinedProjects(userId) {
  // Join 'tasks' instead of 'projects'
  const { data, error } = await supabase
    .from('project_members')
    .select('project:tasks(*)')
    .eq('user_id', userId);

  if (error) throw error;

  // Flatten result, filter nulls, and map fields manually since we can't alias in nested join easily?
  // actually we can try select('project:tasks(*, name:title, ...)')
  // Re-fetching with explicit mapping in join:
  // .select('project:tasks(*, name:title, launch_date:due_date, owner_id:creator)')

  // Let's assume the component can handle it, or we map it here.
  const mappedData = (data || [])
    .map((item) => item.project)
    .filter((p) => p !== null)
    .map((p) => ({
      ...p,
      name: p.title,
      launch_date: p.due_date,
      owner_id: p.creator,
    }));

  return {
    data: mappedData,
    error: null,
  };
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
/**
 * Creates a new project with default phases, milestones, and tasks.
 * @param {Object} projectData - The project data (name, launch_date, etc.)
 * @returns {Promise<Object>} - The created project object
 */
export async function createProjectWithDefaults(projectData) {
  // 1. Create the Project container
  const project = await planter.entities.Project.create({
    ...projectData,
    launch_date: projectData.launch_date
      ? new Date(projectData.launch_date).toISOString().split('T')[0]
      : null,
  });

  // Get current user for attribution
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const creatorId = user?.id || project.creator;

  // 2. Initialize default structure via Server-Side RPC
  // This replaces ~200 client-side requests with 1 atomic transaction.
  const { error } = await supabase.rpc('initialize_default_project', {
    p_project_id: project.id,
    p_creator_id: creatorId
  });

  if (error) {
    console.error('Failed to initialize default project structure:', error);
    // Attempt rollback or just warn? For now, throw so UI knows.
    throw error;
  }

  return project;
}
