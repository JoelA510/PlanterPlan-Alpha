-- one_time_setup.sql
-- PlanterPlan One-Time Setup / Data Migration
-- Run ONCE on an existing database to backfill data for root_id and ordering.

BEGIN;

-- -------------------------------------------------------------------------
-- 1. Backfill root_id
-- -------------------------------------------------------------------------

-- 1.1 Roots point to themselves
UPDATE public.tasks
SET root_id = id
WHERE parent_task_id IS NULL
  AND (root_id IS NULL OR root_id <> id);

-- 1.2 Children inherit parent root_id (iterative fill for deep trees)
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
-- 2. Backfill position (sparse spacing)
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
