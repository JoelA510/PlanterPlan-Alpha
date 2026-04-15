import type { Database } from './database.types';

export type Json = Database['public']['Tables']['tasks']['Row']['settings'];

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------
export type Nullable<T> = T | null;

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

/** Standardized Task type for UI components with legacy field support */
export type Task = TaskRow & {
    name?: string;
    launch_date?: string | null;
    project_id?: string | null;
};

/** Standardized Project type */
export type Project = Task & {
    settings?: Record<string, unknown> | null;
};

export type HierarchyTask = TaskRow & {
    children?: HierarchyTask[];
    membership_role?: string;
    isExpanded?: boolean;
};

export type SelectableProject = TaskRow;

export type SidebarTask = TaskRow & {
    is_active?: boolean;
};

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

/** Task resource row augmented with its parent task info (used by Resource Library). */
export type ResourceWithTask = TaskResourceRow & {
    task: { id: string; title: string | null; root_id: string | null } | null;
};

/** Standardized Person type for UI components */
export interface Person extends PersonRow {
    notes: string | null;
}

// ----------------------------------------------------------------------------
// Form Payloads (mirror Zod schemas in NewProjectForm / TaskForm)
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Auth & Users
// ----------------------------------------------------------------------------
export type UserRole = 'admin' | 'owner' | 'viewer';

export interface UserMetadata {
    [key: string]: unknown;
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    app_metadata?: UserMetadata;
    user_metadata?: UserMetadata;
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

/** Shape emitted by the TaskForm Zod schema. */
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
