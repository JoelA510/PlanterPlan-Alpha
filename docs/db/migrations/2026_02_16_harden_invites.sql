-- Migration: Harden invite_user_to_project and project_invites policy
-- Purpose: Prevent privilege escalation (Editors creating Owners) and secure invite flow.
-- Created: 2026-02-16

-- A) Replace the SECURITY DEFINER function with strict role checks
DROP FUNCTION IF EXISTS public.invite_user_to_project(uuid, text, text);

CREATE OR REPLACE FUNCTION public.invite_user_to_project(
  p_project_id uuid,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite_id uuid;
  v_token uuid;
  v_inviter_role text;
  v_target_existing_role text;
BEGIN
  -- Determine inviter role
  IF public.is_admin(auth.uid()) THEN
    v_inviter_role := 'admin';
  ELSE
    SELECT role
      INTO v_inviter_role
      FROM public.project_members
     WHERE project_id = p_project_id
       AND user_id = auth.uid();
  END IF;

  IF v_inviter_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  IF v_inviter_role NOT IN ('admin','owner','editor') THEN
    RAISE EXCEPTION 'Access denied: insufficient role to invite';
  END IF;

  -- Validate requested role early for clean errors
  IF p_role NOT IN ('owner','editor','coach','viewer','limited') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Editors cannot assign owner
  IF v_inviter_role = 'editor' AND p_role = 'owner' THEN
    RAISE EXCEPTION 'Access denied: editors cannot assign owner';
  END IF;

  -- Look up user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- Protect existing owners from editor modifications
    SELECT role
      INTO v_target_existing_role
      FROM public.project_members
     WHERE project_id = p_project_id
       AND user_id = v_user_id;

    IF v_inviter_role = 'editor' AND v_target_existing_role = 'owner' THEN
      RAISE EXCEPTION 'Access denied: editors cannot modify owners';
    END IF;

    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object('status','added','user_id',v_user_id);
  ELSE
    INSERT INTO public.project_invites (project_id, email, role)
    VALUES (p_project_id, p_email, p_role)
    ON CONFLICT (project_id, email) DO UPDATE
    SET role = EXCLUDED.role, expires_at = (now() + interval '7 days')
    RETURNING id, token
    INTO v_invite_id, v_token;

    RETURN jsonb_build_object('status','invited','invite_id',v_invite_id,'token',v_token);
  END IF;
END;
$$;

-- B) Restore execute grants (dropping the function removes grants)
GRANT EXECUTE ON FUNCTION public.invite_user_to_project(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_user_to_project(uuid, text, text) TO service_role;

-- C) Defense-in-depth: editors cannot create owner invites via direct table insert
DROP POLICY IF EXISTS "Create invites for project members" ON public.project_invites;

CREATE POLICY "Create invites for project members"
ON public.project_invites
FOR INSERT
WITH CHECK (
  public.is_admin((select auth.uid()))
  OR public.has_project_role(project_id, (select auth.uid()), ARRAY['owner'])
  OR (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['editor'])
    AND role <> 'owner'
  )
);
