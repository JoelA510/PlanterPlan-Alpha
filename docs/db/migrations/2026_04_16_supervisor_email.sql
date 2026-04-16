-- Migration: Wave 21 — Supervisor Email on project roots
-- Date: 2026-04-16
-- Description:
--   Adds an optional `supervisor_email` column to `public.tasks` and exposes
--   it on the `tasks_with_primary_resource` view. The column is only
--   meaningful on project roots (parent_task_id IS NULL); the UI gates the
--   field to roots. No DB-level CHECK constraint is added — keeping the
--   migration trivially revertable is worth more than the defensive check.
--
--   RLS note (see docs/architecture/auth-rbac.md):
--   The new column inherits the existing `tasks` RLS policies (owner/editor
--   read+write, admin override, creator read+write). No policy changes are
--   required.

-- ============================================================================
-- 1. COLUMN
-- ============================================================================
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS supervisor_email text;

COMMENT ON COLUMN public.tasks.supervisor_email IS
    'Optional supervisor recipient for monthly Project Status Reports. Only meaningful on project roots (parent_task_id IS NULL). UI gates the field to roots; no DB-level check constraint.';

-- ============================================================================
-- 2. VIEW REFRESH
-- ============================================================================
-- tasks_with_primary_resource LEFT JOINs tasks with their primary resource row
-- and is used by planterClient.ts for reads. Re-create it to expose the new
-- column. The body below mirrors docs/db/schema.sql verbatim; keep them in
-- sync when either changes.

CREATE OR REPLACE VIEW public.tasks_with_primary_resource AS
SELECT
    t.id,
    t.parent_task_id,
    t.title,
    t.description,
    t.status,
    t.origin,
    t.creator,
    t.root_id,
    t.notes,
    t.days_from_start,
    t.start_date,
    t.due_date,
    t.position,
    t.created_at,
    t.updated_at,
    t.purpose,
    t.actions,
    t.is_complete,
    t.primary_resource_id,
    t.is_locked,
    t.prerequisite_phase_id,
    t.parent_project_id,
    t.project_type,
    t.assignee_id,
    t.is_premium,
    t.location,
    t.priority,
    t.settings,
    t.supervisor_email,
    NULL::uuid AS resource_id,
    NULL::text AS resource_type,
    NULL::text AS resource_url,
    NULL::text AS resource_text,
    NULL::text AS storage_path,
    NULL::text AS resource_name
FROM public.tasks t;
