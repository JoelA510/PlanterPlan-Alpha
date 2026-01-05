-- one_time_setup.sql
-- PlanterPlan One-Time Setup / Data Migration
-- Run ONCE on an existing database to backfill data and migrate resources.

BEGIN;

-- -------------------------------------------------------------------------
-- 1. MIGRATE RESOURCES (Robust / Idempotent)
-- -------------------------------------------------------------------------

DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'resource_type'
  ) INTO col_exists;

  IF col_exists THEN
    -- Use dynamic SQL to avoid parse errors if column is already gone
    EXECUTE '
      INSERT INTO public.task_resources (task_id, resource_type, resource_url, resource_text)
      SELECT 
        t.id,
        t.resource_type::task_resource_type,
        t.resource_url,
        t.resources
      FROM public.tasks t
      WHERE t.resource_type IS NOT NULL
      -- Handle existing data: prevent duplicates if run multiple times
      AND NOT EXISTS (
        SELECT 1 FROM public.task_resources tr 
        WHERE tr.task_id = t.id 
          AND tr.resource_type = t.resource_type::task_resource_type
          -- Simple heuristic for duplication check; assumes only one "legacy" resource per task
      )
    ';

    -- Link back the primary resources
    EXECUTE '
      UPDATE public.tasks t
      SET primary_resource_id = tr.id
      FROM public.task_resources tr
      WHERE tr.task_id = t.id
      AND t.resource_type IS NOT NULL
      AND t.primary_resource_id IS NULL -- Only update if not already set
    ';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. DROP LEGACY COLUMNS
-- -------------------------------------------------------------------------
-- We drop the view first because it depends on the columns we want to drop
-- (Provided schema.sql has already recreated it, this DROP IF EXISTS is safe)
DROP VIEW IF EXISTS public.view_master_library CASCADE;
DROP VIEW IF EXISTS public.tasks_with_primary_resource CASCADE;
-- Note: Views are recreated in schema.sql, or must be recreated here if dropped.
-- Ideally, schema.sql creates the views. We drop the OLD view here if it conflicts?
-- Actually, DROP CASCADE will drop dependent views.
-- If schema.sql has already run, the NEW views exist. 
-- Schema logic: legacy views depend on legacy columns. New views depend on new cols.
-- If we drop legacy columns, legacy views break.
-- So we must drop legacy columns here.

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS resource_type,
  DROP COLUMN IF EXISTS resource_url,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS resource_text,
  DROP COLUMN IF EXISTS storage_path;

DROP INDEX IF EXISTS idx_tasks_resource_type;

-- -------------------------------------------------------------------------
-- 3. Backfill root_id
-- -------------------------------------------------------------------------

-- 3.1 Roots point to themselves
UPDATE public.tasks
SET root_id = id
WHERE parent_task_id IS NULL
  AND (root_id IS NULL OR root_id <> id);

-- 3.2 Children inherit parent root_id (iterative fill for deep trees)
DO $$
DECLARE
  updated_rows integer;
BEGIN
  -- Loop to fill depth for existing deep trees until no more rows are updated.
  LOOP
    UPDATE public.tasks t
    SET root_id = p.root_id
    FROM public.tasks p
    WHERE t.parent_task_id = p.id
      AND (t.root_id IS NULL OR t.root_id <> p.root_id)
      AND p.root_id IS NOT NULL;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    EXIT WHEN updated_rows = 0;
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 4. Backfill position (sparse spacing)
-- -------------------------------------------------------------------------

WITH numbered_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY origin, parent_task_id
      ORDER BY created_at ASC
    ) AS rn
  FROM public.tasks
)
UPDATE public.tasks t
SET position = n.rn * 10000
FROM numbered_tasks n
WHERE t.id = n.id
  AND (t.position IS NULL OR t.position = 0);

-- -------------------------------------------------------------------------
-- 5. Setup Storage Buckets
-- -------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
