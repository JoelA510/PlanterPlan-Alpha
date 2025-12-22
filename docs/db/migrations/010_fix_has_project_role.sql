-- Migration 010: Fix Ambiguity in has_project_role
-- Explicitly rename the local variable 'root_id' to 'v_root_id' to avoid ANY conflict with tasks.root_id

CREATE OR REPLACE FUNCTION public.has_project_role(p_task_id uuid, p_user_id uuid, p_allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_root_id uuid;
  v_user_role text;
BEGIN
  -- Prevent probing other users; policies pass auth.uid() anyway.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  v_root_id := public.get_task_root_id(p_task_id);
  IF v_root_id IS NULL THEN
    RETURN false;
  END IF;

  -- Creator override (using v_root_id)
  IF EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = v_root_id
      AND t.creator = p_user_id
  ) THEN
    RETURN true;
  END IF;

  SELECT pm.role
  INTO v_user_role
  FROM public.project_members pm
  WHERE pm.project_id = v_root_id
    AND pm.user_id = p_user_id
  LIMIT 1;

  RETURN (v_user_role IS NOT NULL AND v_user_role = ANY(p_allowed_roles));
END;
$function$;
