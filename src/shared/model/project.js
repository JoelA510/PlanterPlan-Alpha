export default {
  name: 'Project',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of the church planting project',
    },
    description: {
      type: 'string',
      description: 'Brief description of the project',
    },
    launch_date: {
      type: 'string',
      format: 'date',
      description: 'Target launch date for the church',
    },
    template: {
      type: 'string',
      enum: ['launch_large', 'multisite', 'multiplication'],
      description: 'Template used for this project',
    },
    status: {
      type: 'string',
      enum: ['planning', 'in_progress', 'launched', 'paused'],
      default: 'planning',
    },
    location: {
      type: 'string',
      description: 'City/location for the church plant',
    },
    parent_project_id: {
      type: 'string',
      description: 'Reference to parent project (for secondary projects)',
    },
    project_type: {
      type: 'string',
      enum: ['primary', 'secondary'],
      default: 'primary',
      description: 'Type of project: primary or secondary',
    },
  },
  required: ['name'],
};
