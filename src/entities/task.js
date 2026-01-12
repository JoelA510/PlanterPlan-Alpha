export default {
  name: 'Task',
  type: 'object',
  properties: {
    milestone_id: {
      type: 'string',
      description: 'Reference to the milestone',
    },
    phase_id: {
      type: 'string',
      description: 'Reference to the phase',
    },
    project_id: {
      type: 'string',
      description: 'Reference to the project',
    },
    title: {
      type: 'string',
      description: 'Task title',
    },
    description: {
      type: 'string',
      description: 'Detailed description and instructions',
    },
    status: {
      type: 'string',
      enum: ['not_started', 'in_progress', 'completed', 'blocked'],
      default: 'not_started',
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    due_date: {
      type: 'string',
      format: 'date',
    },
    assigned_to: {
      type: 'string',
      description: 'Email of assigned team member',
    },
    purpose: {
      type: 'string',
      description: "The 'why' behind the task",
    },
    actions: {
      type: 'string',
      description: 'Specific action steps to complete the task',
    },
    start_date: {
      type: 'string',
      format: 'date',
      description: 'Scheduled start date',
    },
    is_complete: {
      type: 'boolean',
      default: false,
      description: 'Completion status flag',
    },
    days_from_start: {
      type: 'number',
      default: 0,
      description: 'Offset days from project start (for templates)',
    },
    origin: {
      type: 'string',
      enum: ['instance', 'template'],
      default: 'instance',
      description: 'Whether this task is a template or a live instance',
    },
    primary_resource_id: {
      type: 'string',
      description: 'Reference/ID to the primary highlighted resource',
    },
    parent_task_id: {
      type: 'string',
      description: 'Reference to the parent Task (enables recursive hierarchy)',
    },
    order: {
      type: 'number',
    },
    notes: {
      type: 'string',
      description: 'Additional notes or comments',
    },
  },
  required: ['milestone_id', 'project_id', 'title'],
};
