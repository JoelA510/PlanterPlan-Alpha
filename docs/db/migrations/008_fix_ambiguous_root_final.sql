-- Migration 008: Fix Ambiguous Column FINAL (Use Variables)
-- Using a distinct variable name prevents ANY ambiguity between column names and PL/pgSQL variables.

DROP TRIGGER IF EXISTS trigger_maintain_task_root_id ON public.tasks;
DROP FUNCTION IF EXISTS public.maintain_task_root_id();

CREATE FUNCTION public.maintain_task_root_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_root_id uuid;
BEGIN
  -- If explicitly provided (rare), respect it on insert
  IF TG_OP = 'INSERT' AND NEW.root_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_task_id IS NULL THEN
    NEW.root_id := NEW.id;
  ELSE
    -- Select into a separate variable to guarantee no ambiguity
    SELECT t.root_id
      INTO v_root_id
    FROM public.tasks t
    WHERE t.id = NEW.parent_task_id;

    IF v_root_id IS NULL THEN
      RAISE EXCEPTION 'Parent task % does not exist or has no root_id', NEW.parent_task_id;
    END IF;
    
    NEW.root_id := v_root_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_maintain_task_root_id
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.maintain_task_root_id();

-- Re-grant permissions just in case
GRANT SELECT ON public.view_master_library TO authenticated;
GRANT SELECT ON public.view_master_library TO service_role;
