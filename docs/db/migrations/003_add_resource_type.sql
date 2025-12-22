-- Migration: 003_add_resource_type
-- Usage: Run this in Supabase SQL Editor to support Resource Filters.

-- 1. Add columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS resource_type TEXT CHECK (resource_type IN ('pdf', 'url', 'text')),
ADD COLUMN IF NOT EXISTS resource_url TEXT;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_resource_type ON public.tasks(resource_type);

-- 3. Update Master Library View (if necessary)
-- Since view_master_library selects *, it should automatically pick up new columns.
-- But sometimes views need refreshing.
CREATE OR REPLACE VIEW public.view_master_library AS
SELECT *
FROM public.tasks
WHERE origin = 'template' 
  AND parent_task_id IS NULL;
