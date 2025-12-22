-- Migration 009: Fix Ambiguous Column in Helper Function
-- The previous fixes handled the trigger, but 'get_task_root_id' also uses 'SELECT root_id INTO ...'
-- distinct variable names must be used there too.

CREATE OR REPLACE FUNCTION public.get_task_root_id(t_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_root_id uuid;
BEGIN
  -- Use a distinct variable to avoid ambiguity with column 'root_id'
  SELECT t.root_id INTO v_root_id
  FROM public.tasks t
  WHERE t.id = $1;

  RETURN v_root_id;
END;
$function$;
