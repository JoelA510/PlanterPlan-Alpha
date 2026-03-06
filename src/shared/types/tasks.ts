import type { Task } from '@/shared/db/app.types';
import { z } from 'zod';

/**
 * Base Task Schema mirroring the app.types.ts Task
 */
export const TaskBaseSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  parent_task_id: z.string().uuid().nullable().optional(),
  root_id: z.string().uuid().nullable().optional(),
  creator: z.string().uuid().optional(),
  position: z.number().optional(),
  notes: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  actions: z.string().nullable().optional(),
  is_complete: z.boolean().optional(),
  days_from_start: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  is_locked: z.boolean().optional(),
  prerequisite_phase_id: z.string().uuid().nullable().optional(),
  origin: z.string().optional(),
  is_premium: z.boolean().optional(),
  settings: z.any().optional(),
  primary_resource_id: z.string().uuid().nullable().optional(),
  name: z.string().optional(),
  launch_date: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
});

/**
 * Extended task type used across features for tree-based task rendering.
 * Lives in shared/ to avoid lateral imports between feature slices.
 */
export interface TaskItemData extends Task {
  children?: TaskItemData[];
  isExpanded?: boolean;
  isAddingInline?: boolean;
  duration?: string;
  resource_type?: string;
  membership_role?: string;
}

export const TaskItemDataSchema: z.ZodType<TaskItemData> = z.lazy(() =>
  (TaskBaseSchema as any).extend({
    children: z.array(z.lazy(() => TaskItemDataSchema)).optional(),
    isExpanded: z.boolean().optional(),
    isAddingInline: z.boolean().optional(),
    duration: z.string().optional(),
    resource_type: z.string().optional(),
    membership_role: z.string().optional(),
  })
);
