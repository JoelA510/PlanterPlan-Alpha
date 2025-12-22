-- Migration 007: Force Recreate Trigger (Fix Ambiguous Column)
-- The previous REPLACE might not have taken effect. We DROP and recreate to guarantee the new logic is active.

DROP TRIGGER IF EXISTS trigger_maintain_task_root_id ON public.tasks;
DROP FUNCTION IF EXISTS public.maintain_task_root_id();

CREATE FUNCTION public.maintain_task_root_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If explicitly provided (rare), respect it on insert
  IF TG_OP = 'INSERT' AND NEW.root_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_task_id IS NULL THEN
    NEW.root_id := NEW.id;
  ELSE
    -- Use alias 't' to strictly identify the source column
    SELECT t.root_id
      INTO NEW.root_id
    FROM public.tasks t
    WHERE t.id = NEW.parent_task_id;

    IF NEW.root_id IS NULL THEN
      RAISE EXCEPTION 'Parent task % does not exist or has no root_id', NEW.parent_task_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_maintain_task_root_id
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.maintain_task_root_id();

-- Re-verify view permissions just in case
GRANT SELECT ON public.view_master_library TO authenticated;
GRANT SELECT ON public.view_master_library TO service_role;
