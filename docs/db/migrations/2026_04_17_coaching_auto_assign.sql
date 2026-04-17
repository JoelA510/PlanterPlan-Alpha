-- Migration: Wave 23 — Coaching Task Auto-Assignment
-- Date: 2026-04-17
-- Description:
--   Adds a BEFORE INSERT OR UPDATE trigger on `public.tasks` so a task flagged
--   with `settings.is_coaching_task = true` is auto-assigned to the project's
--   single `coach`-role member when the caller left `assignee_id` unset.
--
--   Closes the "Coach auto-assignment on coaching-task creation" entry in
--   spec.md §6 Backlog. Complements Wave 22's additive RLS policy
--   ("Enable update for coaches on coaching tasks") — Wave 22 authorised the
--   coach to edit tagged rows; this wave wires the default assignment.
--
--   Rules:
--     * Fires only when NEW carries the coaching flag AND either the row is new,
--       the flag just flipped from falsy → true, or `NEW.assignee_id IS NULL`.
--     * Looks up `project_members WHERE project_id = COALESCE(NEW.root_id, NEW.id)
--       AND role = 'coach'`. Exactly one row → assign. Zero/multiple → no-op.
--     * Never overwrites a non-null `assignee_id` the caller passed in — user
--       intent wins over automation.
--
--   Revert path:
--     DROP TRIGGER IF EXISTS "trg_set_coaching_assignee" ON public.tasks;
--     DROP FUNCTION IF EXISTS public.set_coaching_assignee();

CREATE OR REPLACE FUNCTION public.set_coaching_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_project_id uuid;
    v_coach_count int;
    v_coach_id uuid;
    v_is_coaching boolean;
    v_was_coaching boolean;
BEGIN
    v_is_coaching := (NEW.settings ->> 'is_coaching_task')::boolean IS TRUE;

    IF NOT v_is_coaching THEN
        RETURN NEW;
    END IF;

    -- User intent wins: if the caller supplied an assignee, leave it alone.
    IF NEW.assignee_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- On UPDATE, only auto-assign when the flag is newly true OR when the
    -- caller cleared the assignee in the same write.
    IF TG_OP = 'UPDATE' THEN
        v_was_coaching := (OLD.settings ->> 'is_coaching_task')::boolean IS TRUE;
        IF v_was_coaching AND OLD.assignee_id IS NOT NULL AND NEW.assignee_id IS NOT NULL THEN
            -- Already coaching with an assignee — nothing to do.
            RETURN NEW;
        END IF;
    END IF;

    v_project_id := COALESCE(NEW.root_id, NEW.id);
    IF v_project_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*), MIN(user_id)
      INTO v_coach_count, v_coach_id
      FROM public.project_members
     WHERE project_id = v_project_id
       AND role = 'coach';

    IF v_coach_count = 1 THEN
        NEW.assignee_id := v_coach_id;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_coaching_assignee() OWNER TO postgres;

CREATE OR REPLACE TRIGGER "trg_set_coaching_assignee"
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_coaching_assignee();
