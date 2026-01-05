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
-- 2. DROP LEGACY COLUMNS (Conditional)
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
     -- Only drop if legacy columns exist. 
     -- This protects fresh installs (where schema.sql created views but no legacy cols)
     -- from having their views destroyed.
     
     -- Drop views that depend on legacy columns
     EXECUTE 'DROP VIEW IF EXISTS public.view_master_library CASCADE';
     EXECUTE 'DROP VIEW IF EXISTS public.tasks_with_primary_resource CASCADE';

     -- Drop columns
     EXECUTE 'ALTER TABLE public.tasks 
       DROP COLUMN IF EXISTS resource_type,
       DROP COLUMN IF EXISTS resource_url,
       DROP COLUMN IF EXISTS resources,
       DROP COLUMN IF EXISTS resource_text,
       DROP COLUMN IF EXISTS storage_path';

     EXECUTE 'DROP INDEX IF EXISTS idx_tasks_resource_type';
  END IF;
END $$;

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

COMMIT;
