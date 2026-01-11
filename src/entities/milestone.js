export default {
  name: 'Milestone',
  type: 'object',
  properties: {
    phase_id: {
      type: 'string',
      description: 'Reference to the phase',
    },
    project_id: {
      type: 'string',
      description: 'Reference to the project',
    },
    name: {
      type: 'string',
      description: 'Name of the milestone',
    },
    description: {
      type: 'string',
      description: 'Description of the milestone',
    },
    order: {
      type: 'number',
      description: 'Order within the phase',
    },
    target_date: {
      type: 'string',
      format: 'date',
      description: 'Target completion date',
    },
  },
  required: ['phase_id', 'project_id', 'name'],
};
