-- Run this in your Supabase SQL Editor to support the Advanced Features (Roadmap 8.1, 9.1, 9.2)

-- ==========================================
-- Feature 1: Checkpoint System (Roadmap 8.1)
-- ==========================================

-- 1.1 Add Columns to Tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prerequisite_phase_id uuid REFERENCES public.tasks(id);

-- 1.2 Function to Check Completion and Unlock
CREATE OR REPLACE FUNCTION public.check_phase_unlock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_all_complete boolean;
    v_dependent_phase_id uuid;
BEGIN
    -- Check if the parent phase of the updated task is now fully complete
    -- Assuming NEW.parent_task_id is the Phase ID
    IF NEW.parent_task_id IS NULL THEN RETURN NULL; END IF;

    -- Check if ALL tasks in this phase are complete
    SELECT bool_and(is_complete) INTO v_all_complete
    FROM public.tasks
    WHERE parent_task_id = NEW.parent_task_id;

    -- If yes, unlock the dependent phase
    IF v_all_complete THEN
        UPDATE public.tasks
        SET is_locked = false
        WHERE prerequisite_phase_id = NEW.parent_task_id;
    END IF;

    RETURN NULL;
END;
$$;

-- 1.3 Trigger
DROP TRIGGER IF EXISTS trigger_phase_unlock ON public.tasks;
CREATE TRIGGER trigger_phase_unlock
AFTER UPDATE OF is_complete ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_phase_unlock();


-- ==========================================
-- Feature 3: Secondary Projects (Roadmap 9.2)
-- ==========================================

-- 3.1 Hierarchy Columns
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES public.tasks(id),
ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'primary' CHECK (project_type IN ('primary', 'secondary'));

-- Feature 2 (Notifications) is handled via Base44 Backend Functions/Integrations, 
-- but you might need a trigger if you want pure-SQL notifications (via pg_net). 
-- For now, we assume the Base44 Agent will build a UI/Backend-based notifier or hook.
