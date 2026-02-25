import type { Database } from './database.types';

export type Json = Database['public']['Tables']['tasks']['Row']['settings'];

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

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
