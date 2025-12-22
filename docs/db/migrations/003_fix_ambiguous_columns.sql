-- Fix for "column reference 'user_id' is ambiguous" error in has_project_role
-- Rename parameters to avoid conflict with table columns

CREATE OR REPLACE FUNCTION public.has_project_role(
  p_task_id UUID, 
  p_user_id UUID, 
  p_allowed_roles text[]
) RETURNS boolean AS $$
DECLARE
  v_target_root_id UUID;
  v_user_role text;
BEGIN
  -- 1. Get root ID directly
  v_target_root_id := public.get_task_root_id(p_task_id);
  
  -- If task not found or has no root_id, deny
  IF v_target_root_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Creator override: If user created the ROOT project, they have full access.
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = v_target_root_id AND creator = p_user_id) THEN
    RETURN true;
  END IF;

  -- 3. Check membership
  SELECT pm.role INTO v_user_role
  FROM public.project_members pm
  WHERE pm.project_id = v_target_root_id AND pm.user_id = p_user_id
  LIMIT 1;

  IF v_user_role IS NOT NULL AND v_user_role = ANY(p_allowed_roles) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (redundant but safe)
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
