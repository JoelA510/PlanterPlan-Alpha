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
    v_milestone_id uuid;
    v_phase_id uuid;
    v_incomplete_exists boolean;
BEGIN
    -- Only process completions
    IF NEW.is_complete = false THEN RETURN NULL; END IF;
    IF NEW.parent_task_id IS NULL THEN RETURN NULL; END IF;

    -- 1. Identify Phase ID
    -- Assume we are at Task level (Parent is Milestone)
    v_milestone_id := NEW.parent_task_id;
    SELECT parent_task_id INTO v_phase_id 
    FROM public.tasks 
    WHERE id = v_milestone_id;

    -- If parent of parent is usually NULL (e.g. if NEW was a Milestone), handle gracefully?
    -- In PlanterPlan: Task -> Milestone -> Phase -> Project.
    -- If NEW is Task, then v_milestone_id is Milestone, v_phase_id is Phase.
    
    IF v_phase_id IS NULL THEN
        -- Fallback: Maybe NEW was a Milestone? Then parent is Phase.
        v_phase_id := v_milestone_id;
    END IF;

    -- 2. Check if ANY incomplete tasks remain in this Phase (across all milestones)
    SELECT EXISTS (
        SELECT 1
        FROM public.tasks EndTask
        JOIN public.tasks MidMilestone ON EndTask.parent_task_id = MidMilestone.id
        WHERE MidMilestone.parent_task_id = v_phase_id
          AND EndTask.is_complete = false
    ) INTO v_incomplete_exists;

    -- 3. If Phase Complete -> Unlock Dependent Phases
    IF NOT v_incomplete_exists THEN
        UPDATE public.tasks
        SET is_locked = false
        WHERE prerequisite_phase_id = v_phase_id;
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
