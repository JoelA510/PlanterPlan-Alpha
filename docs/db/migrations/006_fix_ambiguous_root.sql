-- Migration 006: Fix Ambiguous Columns and View Permissions

-- 1. Fix "column reference 'root_id' is ambiguous" in maintain_task_root_id
-- We fully qualify the column/table aliases.

CREATE OR REPLACE FUNCTION public.maintain_task_root_id()
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

-- 2. Fix Permission Denied on Master Library View
GRANT SELECT ON public.view_master_library TO authenticated;
GRANT SELECT ON public.view_master_library TO service_role;
