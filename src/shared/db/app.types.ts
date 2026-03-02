import type { Database } from './database.types';

export type Json = Database['public']['Tables']['tasks']['Row']['settings'];

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

// Aliases for better DX
export type Task = TaskRow;
export type Project = TaskRow;
export type ProjectRow = TaskRow;

// ----------------------------------------------------------------------------
// People
// ----------------------------------------------------------------------------
export type PersonRow = Database['public']['Tables']['people']['Row'];
export type PersonInsert = Database['public']['Tables']['people']['Insert'];
export type PersonUpdate = Database['public']['Tables']['people']['Update'];

// ----------------------------------------------------------------------------
// Resources & Relationships
// ----------------------------------------------------------------------------
export type TaskResourceRow = Database['public']['Tables']['task_resources']['Row'];
export type TaskRelationshipRow = Database['public']['Tables']['task_relationships']['Row'];
export type TeamMemberRow = Database['public']['Tables']['project_members']['Row'];

// ----------------------------------------------------------------------------
// Form Payloads (mirror Zod schemas in NewProjectForm / NewTaskForm)
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Auth & Users
// ----------------------------------------------------------------------------
export type UserRole = 'admin' | 'owner' | 'viewer';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    aud?: string;
    created_at?: string;
}

/** Shape emitted by the NewProjectForm Zod schema. */
export interface CreateProjectFormData {
    title: string;
    description?: string;
    purpose?: string;
    actions?: string;
    notes?: string;
    start_date: string;
    templateId?: string | null;
}

/** Shape emitted by the NewTaskForm Zod schema. */
export interface TaskFormData {
    title: string;
    description?: string | null;
    notes?: string | null;
    purpose?: string | null;
    actions?: string | null;
    days_from_start?: number;
    start_date?: string | null;
    due_date?: string | null;
    templateId?: string | null;
}
