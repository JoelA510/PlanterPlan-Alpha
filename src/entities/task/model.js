import { z } from 'zod';

export const TASK_STATUS = ['todo', 'in_progress', 'completed', 'blocked'];
export const TASK_PRIORITY = ['low', 'medium', 'high'];
export const TASK_ORIGIN = ['instance', 'template'];

export const taskSchema = z.object({
    milestone_id: z.string().uuid().optional(),
    phase_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    status: z.enum(TASK_STATUS).default('todo'),
    priority: z.enum(TASK_PRIORITY).default('medium'),
    due_date: z.string().datetime().optional().nullable(),
    assigned_to: z.string().email().optional().nullable(),
    purpose: z.string().optional(),
    actions: z.string().optional(),
    start_date: z.string().datetime().optional().nullable(),
    is_complete: z.boolean().default(false),
    days_from_start: z.number().default(0),
    origin: z.enum(TASK_ORIGIN).default('instance'),
    primary_resource_id: z.string().uuid().optional().nullable(),
    parent_task_id: z.string().uuid().optional().nullable(),
    order: z.number().optional(),
    notes: z.string().optional(),
});

export const taskJsonSchema = {
    name: 'Task',
    type: 'object',
    properties: {
        milestone_id: { type: 'string', description: 'Reference to the milestone' },
        phase_id: { type: 'string', description: 'Reference to the phase' },
        project_id: { type: 'string', description: 'Reference to the project' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Detailed description and instructions' },
        status: { type: 'string', enum: TASK_STATUS, default: 'todo' },
        priority: { type: 'string', enum: TASK_PRIORITY, default: 'medium' },
        due_date: { type: 'string', format: 'date' },
        assigned_to: { type: 'string', description: 'Email of assigned team member' },
        purpose: { type: 'string', description: "The 'why' behind the task" },
        actions: { type: 'string', description: 'Specific action steps to complete the task' },
        start_date: { type: 'string', format: 'date', description: 'Scheduled start date' },
        is_complete: { type: 'boolean', default: false, description: 'Completion status flag' },
        days_from_start: { type: 'number', default: 0, description: 'Offset days from project start (for templates)' },
        origin: { type: 'string', enum: TASK_ORIGIN, default: 'instance', description: 'Whether this task is a template or a live instance' },
        primary_resource_id: { type: 'string', description: 'Reference/ID to the primary highlighted resource' },
        parent_task_id: { type: 'string', description: 'Reference to the parent Task (enables recursive hierarchy)' },
        order: { type: 'number' },
        notes: { type: 'string', description: 'Additional notes or comments' },
    },
    required: ['milestone_id', 'project_id', 'title'],
};
