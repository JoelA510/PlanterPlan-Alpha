import { planter } from 'api/planterClient';
import { supabase } from '@app/supabaseClient';

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
    .map(item => item.project)
    .filter(p => p !== null)
    .map(p => ({
      ...p,
      name: p.title,
      launch_date: p.due_date,
      owner_id: p.creator
    }));

  return {
    data: mappedData,
    error: null
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
  const { data: children, error: childrenError } = await supabase
    .from('tasks')
    .select('*')
    .eq('root_id', projectId);

  return {
    data: {
      ...project,
      children: children || [],
      stats: {
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    },
    error: null
  };
}

// --- Projects (Mutations) ---

/**
 * Creates a new project with default phases, milestones, and tasks.
 * @param {Object} projectData - The project data (name, launch_date, etc.)
 * @returns {Promise<Object>} - The created project object
 */
export async function createProjectWithDefaults(projectData) {
  const project = await planter.entities.Project.create({
    ...projectData,
    launch_date: projectData.launch_date
      ? projectData.launch_date.toISOString().split('T')[0]
      : null,
  });

  // Create default phases for the project
  const defaultPhases = [
    {
      title: 'Discovery',
      description: 'Assess calling, gather resources, foundation',
      order: 1,
      icon: 'compass',
      color: 'blue',
    },
    {
      title: 'Planning',
      description: 'Develop strategy, vision, and initial team',
      order: 2,
      icon: 'map',
      color: 'purple',
    },
    {
      title: 'Preparation',
      description: 'Build systems, recruit team, prepare for launch',
      order: 3,
      icon: 'wrench',
      color: 'orange',
    },
    {
      title: 'Pre-Launch',
      description: 'Final preparations, preview services, marketing',
      order: 4,
      icon: 'rocket',
      color: 'green',
    },
    {
      title: 'Launch',
      description: 'Grand opening and initial growth phase',
      order: 5,
      icon: 'yellow',
      color: 'yellow',
    },
    {
      title: 'Growth',
      description: 'Establish systems, develop leaders, expand reach',
      order: 6,
      icon: 'trending-up',
      color: 'pink',
    },
  ];

  for (const phase of defaultPhases) {
    const createdPhase = await planter.entities.Phase.create({
      title: phase.title,
      description: phase.description,
      position: phase.order, // Map order to position
      root_id: project.id,
      parent_task_id: project.id, // Phase is child of Project
    });

    // Create default milestones for each phase
    const milestones = getMilestonesForPhase(phase.order);
    for (const milestone of milestones) {
      const createdMilestone = await planter.entities.Milestone.create({
        title: milestone.title,
        description: milestone.description,
        position: milestone.order, // Map order to position
        parent_task_id: createdPhase.id, // Milestone child of Phase
        root_id: project.id,
      });

      // Create default tasks for each milestone
      const tasks = getTasksForMilestone(milestone.order, phase.order);
      for (const task of tasks) {
        await planter.entities.Task.create({
          title: task.title,
          priority: task.priority,
          status: 'not_started',
          position: task.order, // Map order to position
          parent_task_id: createdMilestone.id, // Task child of Milestone
          root_id: project.id,
        });
      }
    }
  }

  return project;
}

// Helper functions to generate default milestones and tasks
function getMilestonesForPhase(phaseOrder) {
  const milestonesMap = {
    1: [
      { title: 'Personal Assessment', order: 1, description: 'Evaluate your calling and readiness' },
      { title: 'Family Preparation', order: 2, description: 'Prepare your family for the journey' },
      {
        title: 'Resource Gathering',
        order: 3,
        description: 'Identify available resources and support',
      },
    ],
    2: [
      { title: 'Vision Development', order: 1, description: 'Clarify your vision and mission' },
      { title: 'Strategic Planning', order: 2, description: 'Develop your launch strategy' },
      { title: 'Core Team Building', order: 3, description: 'Recruit and develop your core team' },
    ],
    3: [
      { title: 'Systems Setup', order: 1, description: 'Establish operational systems' },
      { title: 'Facility Planning', order: 2, description: 'Secure meeting location' },
      { title: 'Ministry Development', order: 3, description: 'Develop key ministry areas' },
    ],
    4: [
      { title: 'Preview Services', order: 1, description: 'Host preview gatherings' },
      { title: 'Marketing Launch', order: 2, description: 'Begin community outreach' },
      { title: 'Final Preparations', order: 3, description: 'Complete all launch requirements' },
    ],
    5: [
      { title: 'Launch Week', order: 1, description: 'Execute your launch plan' },
      { title: 'First Month', order: 2, description: 'Establish weekly rhythms' },
      { title: 'Guest Follow-up', order: 3, description: 'Connect with visitors' },
    ],
    6: [
      { title: 'Leadership Development', order: 1, description: 'Train and empower leaders' },
      { title: 'Ministry Expansion', order: 2, description: 'Launch additional ministries' },
      { title: 'Future Planning', order: 3, description: 'Plan for multiplication' },
    ],
  };
  // Ensure we fallback to empty if generic phase
  return milestonesMap[phaseOrder] || [
    { title: 'Generic Milestone 1', order: 1, description: 'Default milestone' },
    { title: 'Generic Milestone 2', order: 2, description: 'Default milestone' }
  ];
}

function getTasksForMilestone(milestoneOrder, _phaseOrder) {
  // Return a few sample tasks for each milestone
  const taskTemplates = [
    { title: 'Review and complete assessment', priority: 'high' },
    { title: 'Schedule planning meeting', priority: 'medium' },
    { title: 'Create action items list', priority: 'medium' },
    { title: 'Follow up on pending items', priority: 'low' },
  ];

  return taskTemplates.slice(0, 2 + (milestoneOrder % 2)).map((task, index) => ({
    ...task,
    order: index + 1,
    status: 'not_started',
  }));
}
