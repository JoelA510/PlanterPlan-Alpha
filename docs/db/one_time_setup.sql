-- PlanterPlan One-Time Setup / Data Migration
-- Run this ONCE on an existing database to backfill data.
-- New deployments using schema.sql do not need this unless importing legacy data.

-- -------------------------------------------------------------------------
-- 1. Backfill root_id
-- -------------------------------------------------------------------------

-- 1.1 Roots (Roots point to themselves)
UPDATE public.tasks
SET root_id = id
WHERE parent_task_id IS NULL
  AND root_id IS NULL;

-- 1.2 Children (Recurse to fill depth)
DO $$
BEGIN
  -- Simple loop to fill depth for existing deep trees
  FOR i IN 1..10 LOOP
    UPDATE public.tasks t
    SET root_id = p.root_id
    FROM public.tasks p
    WHERE t.parent_task_id = p.id
      AND t.root_id IS NULL
      AND p.root_id IS NOT NULL;

    IF NOT FOUND THEN
      EXIT;
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 2. Backfill Position (Migration 001)
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
-- 3. OPTIONAL VALIDATION (read-only)
-- -------------------------------------------------------------------------

-- Confirm no policies reference has_project_role_v2 (should return 0 rows)
-- SELECT
--   n.nspname AS policy_schema,
--   c.relname  AS table_name,
--   p.polname  AS policy_name,
--   pg_get_expr(p.polqual, p.polrelid) AS using_expr,
--   pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
-- FROM pg_policy p
-- JOIN pg_class c ON p.polrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE pg_get_expr(p.polqual, p.polrelid) ILIKE '%has_project_role_v2(%'
--    OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%has_project_role_v2(%';
