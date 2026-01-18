-- Migration: Add Checkpoints System
-- Date: 2026-01-17
-- Description: Adds is_locked to tasks and logic for sequential unlocking.

BEGIN;

-- 1. Add is_locked column
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_is_locked ON public.tasks(is_locked);

-- 3. Trigger Function: Unlock Next Phase
-- Triggers when a task status changes to 'completed'
CREATE OR REPLACE FUNCTION public.handle_phase_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_task_id uuid;
BEGIN
  -- Only proceed if status changed to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Find the next sibling (ordered by position)
    -- Same parent, next higher position
    SELECT id INTO v_next_task_id
    FROM public.tasks
    WHERE parent_task_id = NEW.parent_task_id
      AND position > NEW.position
    ORDER BY position ASC
    LIMIT 1;

    -- Unlock it
    IF v_next_task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET is_locked = false
      WHERE id = v_next_task_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trg_unlock_next_phase ON public.tasks;
CREATE TRIGGER trg_unlock_next_phase
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_phase_completion();

COMMIT;
