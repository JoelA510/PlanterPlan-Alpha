-- Migration: Add project_invites table and invite_user_to_project RPC
-- Date: 2026-01-12
-- Description: Supports inviting users by email even if they don't have an account yet.

BEGIN;

-- 1. Create project_invites table
CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  CONSTRAINT unique_invite_per_project UNIQUE (project_id, email)
);

-- 2. Enable RLS
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow project members (owners/editors) to view invites for their project
DROP POLICY IF EXISTS "View invites for project members" ON public.project_invites;
CREATE POLICY "View invites for project members" ON public.project_invites
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

-- Allow project owners/editors to create invites
DROP POLICY IF EXISTS "Create invites for project members" ON public.project_invites;
CREATE POLICY "Create invites for project members" ON public.project_invites
  FOR INSERT WITH CHECK (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

-- Allow project owners/editors to delete invites
DROP POLICY IF EXISTS "Delete invites for project members" ON public.project_invites;
CREATE POLICY "Delete invites for project members" ON public.project_invites
  FOR DELETE USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

-- 4. RPC: invite_user_to_project
-- This function handles the logic:
-- - Check if user already exists in auth.users (by email).
--   - If YES: Add to project_members immediately.
--   - If NO: Create a record in project_invites.
CREATE OR REPLACE FUNCTION public.invite_user_to_project(
  p_project_id uuid,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to access auth.users and project_members
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite_id uuid;
  v_token uuid;
BEGIN
  -- 1. Authorization Check: Caller must be owner or editor of the project
  IF NOT public.has_project_role(p_project_id, auth.uid(), ARRAY['owner', 'editor']) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You must be an owner or editor to invite members.';
  END IF;

  -- 2. Check if user exists in auth.users
  -- NOTE: We used the previously defined helper public.get_user_id_by_email if available, 
  -- but valid patterns prefer direct lookup in SECURITY DEFINER context if safe.
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- User exists: Add directly to project_members
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role; -- Update role if already member

    RETURN jsonb_build_object(
      'status', 'added',
      'user_id', v_user_id
    );
  ELSE
    -- User does not exist: Create invite
    INSERT INTO public.project_invites (project_id, email, role)
    VALUES (p_project_id, p_email, p_role)
    ON CONFLICT (project_id, email) DO UPDATE
    SET role = EXCLUDED.role, expires_at = (now() + interval '7 days') -- Refresh invite
    RETURNING id, token INTO v_invite_id, v_token;

    RETURN jsonb_build_object(
      'status', 'invited',
      'invite_id', v_invite_id,
      'token', v_token
    );
  END IF;
END;
$$;

COMMIT;
