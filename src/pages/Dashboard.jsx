import React, { useState } from 'react';
import { base44 } from 'api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from 'components/ui/button';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import ProjectCard from 'components/dashboard/ProjectCard';
import CreateProjectModal from 'components/dashboard/CreateProjectModal';
import StatsOverview from 'components/dashboard/StatsOverview';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      const project = await base44.entities.Project.create({
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
          icon: 'star',
          color: 'yellow',
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
        const createdPhase = await base44.entities.Phase.create({
          ...phase,
          project_id: project.id,
        });

        // Create default milestones for each phase
        const milestones = getMilestonesForPhase(phase.order);
        for (const milestone of milestones) {
          const createdMilestone = await base44.entities.Milestone.create({
            ...milestone,
            phase_id: createdPhase.id,
            project_id: project.id,
          });

          // Create default tasks for each milestone
          const tasks = getTasksForMilestone(milestone.order, phase.order);
          for (const task of tasks) {
            await base44.entities.Task.create({
              ...task,
              milestone_id: createdMilestone.id,
              phase_id: createdPhase.id,
              project_id: project.id,
            });
          }
        }
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleCreateProject = async (projectData) => {
    await createProjectMutation.mutateAsync(projectData);
  };

  if (loadingProjects) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your church planting projects</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <StatsOverview projects={projects} tasks={tasks} teamMembers={teamMembers} />
        </div>

        {/* Projects */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Projects</h2>
        </div>

        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FolderKanban className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Start your church planting journey by creating your first project
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Project
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ProjectCard
                  project={project}
                  tasks={tasks.filter((t) => t.project_id === project.id)}
                  teamMembers={teamMembers.filter((m) => m.project_id === project.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
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
