import { z } from 'zod';
import { PROJECT_STATUS } from '@/app/constants/index';

export const PROJECT_TEMPLATES = ['launch_large', 'multisite', 'multiplication'];
export const PROJECT_TYPES = ['primary', 'secondary'];

// Extracted from CreateProjectModal.jsx
export const projectSchema = z.object({
    title: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
    template: z.string().min(1, 'Please select a template'),
    launch_date: z.date({
        required_error: 'Target launch date is required',
        invalid_type_error: 'That is not a valid date',
    }),
    location: z.string().optional(),
    status: z.string().default(PROJECT_STATUS?.PLANNING || 'planning'),
});

export const projectJsonSchema = {
    name: 'Project',
    type: 'object',
    properties: {
        name: { type: 'string', description: 'Name of the church planting project' },
        description: { type: 'string', description: 'Brief description of the project' },
        launch_date: { type: 'string', format: 'date', description: 'Target launch date for the church' },
        template: { type: 'string', enum: PROJECT_TEMPLATES, description: 'Template used for this project' },
        status: { type: 'string', enum: Object.values(PROJECT_STATUS || {}), default: 'planning' },
        location: { type: 'string', description: 'City/location for the church plant' },
        parent_project_id: { type: 'string', description: 'Reference to parent project (for secondary projects)' },
        project_type: { type: 'string', enum: PROJECT_TYPES, default: 'primary', description: 'Type of project: primary or secondary' },
    },
    required: ['name'],
};
