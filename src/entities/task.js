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
