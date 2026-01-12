export default {
  name: 'TeamMember',
  type: 'object',
  properties: {
    project_id: {
      type: 'string',
      description: 'Reference to the project',
    },
    name: {
      type: 'string',
      description: "Team member's name",
    },
    email: {
      type: 'string',
      description: "Team member's email",
    },
    role: {
      type: 'string',
      description: 'Role in the project (e.g., Lead Planter, Worship Leader)',
    },
    avatar_url: {
      type: 'string',
      description: 'Profile image URL',
    },
  },
  required: ['project_id', 'name', 'email'],
};
