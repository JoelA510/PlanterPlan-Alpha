-- Migration: Wave 29 — project_kind (checkpoint vs date) discriminator on root tasks
-- Date: 2026-04-18
-- Description:
--   Adds an additive CHECK constraint that gates settings->>'project_kind' to the
--   two-value vocabulary on root tasks (parent_task_id IS NULL). Non-root tasks
--   are unaffected. Absence of the key (the default for every existing project)
--   means 'date' — backfill is a no-op, no UPDATE statement.
--
--   The kind toggle lives in EditProjectModal; the date-engine and nightly-sync
--   short-circuit checkpoint projects (see src/shared/lib/date-engine/index.ts
--   and supabase/functions/nightly-sync/index.ts).
--
-- Revert path:
--   ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_kind_check;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_kind_check CHECK (
  parent_task_id IS NOT NULL
  OR settings ->> 'project_kind' IS NULL
  OR settings ->> 'project_kind' IN ('date','checkpoint')
);
