-- Migration: Add position column for ordering
-- Created: 2025-12-15

-- 1. Add position column (BIGINT for sparse spacing)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS position BIGINT DEFAULT 0;

-- 2. Create index for sorting performance
CREATE INDEX IF NOT EXISTS idx_tasks_position 
ON public.tasks(parent_task_id, position);

-- 3. Backfill existing tasks
-- Strategy: Partition by parent and order by created_at. 
-- Multiply row_number by 10000 to give initial spacing.
WITH numbered_tasks AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY parent_task_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.tasks
)
UPDATE public.tasks t
SET position = n.rn * 10000
FROM numbered_tasks n
WHERE t.id = n.id;
