export default {
  name: 'Phase',
  type: 'object',
  properties: {
    project_id: {
      type: 'string',
      description: 'Reference to the project',
    },
    name: {
      type: 'string',
      description: 'Name of the phase',
    },
    description: {
      type: 'string',
      description: 'Description of what this phase covers',
    },
    order: {
      type: 'number',
      description: 'Order of the phase (1-6)',
    },
    icon: {
      type: 'string',
      description: 'Icon name for the phase',
    },
    color: {
      type: 'string',
      description: 'Color theme for the phase',
    },
  },
  required: ['project_id', 'name', 'order'],
};
