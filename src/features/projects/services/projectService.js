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

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, error: null };
}

export async function getJoinedProjects(userId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('project:projects(*)')
    .eq('user_id', userId);

  if (error) throw error;
  // Flatten result and filter out nulls
  return {
    data: data.map(item => item.project).filter(p => p !== null),
    error: null
  };
}

export async function getProjectWithStats(projectId) {
  // Fetch Project
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projError) throw projError;

  // Fetch Tasks for Stats (Naive count)
  // Note: 'tasks' table should exist.
  const { count: totalTasks, error: totalError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { count: completedTasks, error: completedError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'complete'); // Assuming 'complete' status

  if (totalError || completedError) console.warn('Stats fetch error', totalError, completedError);

  // Mock children for Report UI if real children fetching is complex here
  // But ProjectReport.jsx accesses project.children.length.
  // So we should probably fetch children?
  // ProjectReprot.jsx Line 85: project.children?.length
  // So we need to return 'children' array.

  // Fetch ALL children? Might be heavy. But Report expects it.
  const { data: children, error: childrenError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

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
    error: null // return { data, error } signature
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
      name: 'Discovery',
      description: 'Assess calling, gather resources, build foundation',
      order: 1,
      icon: 'compass',
      color: 'blue',
    },
    {
      name: 'Planning',
      description: 'Develop strategy, vision, and initial team',
      order: 2,
      icon: 'map',
      color: 'purple',
    },
    {
      name: 'Preparation',
      description: 'Build systems, recruit team, prepare for launch',
      order: 3,
      icon: 'wrench',
      color: 'orange',
    },
    {
      name: 'Pre-Launch',
      description: 'Final preparations, preview services, marketing',
      order: 4,
      icon: 'rocket',
      color: 'green',
    },
    {
      name: 'Launch',
      description: 'Grand opening and initial growth phase',
      order: 5,
      icon: 'yellow',
    },
    {
      name: 'Growth',
      description: 'Establish systems, develop leaders, expand reach',
      order: 6,
      icon: 'trending-up',
      color: 'pink',
    },
  ];

  for (const phase of defaultPhases) {
    const createdPhase = await planter.entities.Phase.create({
      ...phase,
      project_id: project.id,
    });

    // Create default milestones for each phase
    const milestones = getMilestonesForPhase(phase.order);
    for (const milestone of milestones) {
      const createdMilestone = await planter.entities.Milestone.create({
        ...milestone,
        phase_id: createdPhase.id,
        project_id: project.id,
      });

      // Create default tasks for each milestone
      const tasks = getTasksForMilestone(milestone.order, phase.order);
      for (const task of tasks) {
        await planter.entities.Task.create({
          ...task,
          milestone_id: createdMilestone.id,
          phase_id: createdPhase.id,
          project_id: project.id,
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
      { name: 'Personal Assessment', order: 1, description: 'Evaluate your calling and readiness' },
      { name: 'Family Preparation', order: 2, description: 'Prepare your family for the journey' },
      {
        name: 'Resource Gathering',
        order: 3,
        description: 'Identify available resources and support',
      },
    ],
    2: [
      { name: 'Vision Development', order: 1, description: 'Clarify your vision and mission' },
      { name: 'Strategic Planning', order: 2, description: 'Develop your launch strategy' },
      { name: 'Core Team Building', order: 3, description: 'Recruit and develop your core team' },
    ],
    3: [
      { name: 'Systems Setup', order: 1, description: 'Establish operational systems' },
      { name: 'Facility Planning', order: 2, description: 'Secure meeting location' },
      { name: 'Ministry Development', order: 3, description: 'Develop key ministry areas' },
    ],
    4: [
      { name: 'Preview Services', order: 1, description: 'Host preview gatherings' },
      { name: 'Marketing Launch', order: 2, description: 'Begin community outreach' },
      { name: 'Final Preparations', order: 3, description: 'Complete all launch requirements' },
    ],
    5: [
      { name: 'Launch Week', order: 1, description: 'Execute your launch plan' },
      { name: 'First Month', order: 2, description: 'Establish weekly rhythms' },
      { name: 'Guest Follow-up', order: 3, description: 'Connect with visitors' },
    ],
    6: [
      { name: 'Leadership Development', order: 1, description: 'Train and empower leaders' },
      { name: 'Ministry Expansion', order: 2, description: 'Launch additional ministries' },
      { name: 'Future Planning', order: 3, description: 'Plan for multiplication' },
    ],
  };
  return milestonesMap[phaseOrder] || [];
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
