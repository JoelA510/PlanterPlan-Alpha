-- Migration: Wave 24 — Coaching-task assignee backfill on coach membership change
-- Date: 2026-04-18
-- Description:
--   Complements Wave 23's `set_coaching_assignee` trigger (which fires on
--   tasks INSERT/UPDATE) with a symmetric trigger on `project_members`. Wave
--   23 only reacts to task writes, so any coaching task that was created
--   while the project had zero or multiple coaches retained a null
--   `assignee_id` forever — even after the membership later settled to
--   exactly one coach. This wave closes that gap.
--
--   Rules (mirror Wave 23's invariants):
--     * Fire only when the membership change could alter the project's
--       coach count (INSERT coach / DELETE coach / UPDATE of role into
--       or out of 'coach').
--     * After the change, if the project now has **exactly one** coach,
--       backfill every instance task on the project where
--       `settings.is_coaching_task = true` AND `assignee_id IS NULL`.
--     * Zero coaches or multiple coaches → no-op.
--     * Never overwrite a non-null `assignee_id` — user intent wins.
--     * Never un-assign: dropping from 1 → 0 coaches does NOT null existing
--       assignments; the previous sole coach stays assigned until a human
--       changes it.
--
--   Scope: the trigger narrows its UPDATE to `root_id = <project_id>` so a
--   membership write doesn't fan out to unrelated projects.
--
--   Revert path:
--     DROP TRIGGER IF EXISTS "trg_backfill_coaching_assignees" ON public.project_members;
--     DROP FUNCTION IF EXISTS public.backfill_coaching_assignees();

CREATE OR REPLACE FUNCTION public.backfill_coaching_assignees()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_project_id uuid;
    v_coach_count int;
    v_coach_id uuid;
    v_relevant boolean;
BEGIN
    -- Identify the affected project and whether the change is coach-related.
    IF TG_OP = 'DELETE' THEN
        v_project_id := OLD.project_id;
        v_relevant := (OLD.role = 'coach');
    ELSIF TG_OP = 'INSERT' THEN
        v_project_id := NEW.project_id;
        v_relevant := (NEW.role = 'coach');
    ELSE -- UPDATE
        v_project_id := NEW.project_id;
        -- Relevant if coach-ness changed OR if the project_id itself moved
        -- (rare, but guard for safety).
        v_relevant := (OLD.role IS DISTINCT FROM NEW.role)
                   AND ((OLD.role = 'coach') OR (NEW.role = 'coach'));
        IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
            v_relevant := TRUE;
        END IF;
    END IF;

    IF NOT v_relevant OR v_project_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*), MIN(user_id)
      INTO v_coach_count, v_coach_id
      FROM public.project_members
     WHERE project_id = v_project_id
       AND role = 'coach';

    IF v_coach_count = 1 THEN
        UPDATE public.tasks
           SET assignee_id = v_coach_id
         WHERE root_id = v_project_id
           AND origin = 'instance'
           AND assignee_id IS NULL
           AND (settings ->> 'is_coaching_task')::boolean IS TRUE;
    END IF;

    RETURN NULL;
END;
$$;

ALTER FUNCTION public.backfill_coaching_assignees() OWNER TO postgres;

CREATE OR REPLACE TRIGGER "trg_backfill_coaching_assignees"
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.backfill_coaching_assignees();
