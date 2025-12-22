-- Migration 004: Restore Missing Columns
-- Restores columns actively used in the codebase but missing from the initial schema consolidation.

-- 1. Purpose (Used in Project creation)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- 2. Actions (Used in Task Details)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS actions TEXT;

-- 3. Resources (Legacy text field, distinct from resource_type)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS resources TEXT;

-- 4. Is Complete (Checkbox state)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- 5. Add index on is_complete for potential filtering
CREATE INDEX IF NOT EXISTS idx_tasks_is_complete ON public.tasks(is_complete);
