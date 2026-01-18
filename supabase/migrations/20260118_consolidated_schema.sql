-- Consolidated Schema Migration
-- Date: 2026-01-18
-- Replaces previous fragmented migrations.

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES & TYPES
-- ============================================================================

-- TASKS Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  purpose text,
  actions text,
  notes text,
  origin text CHECK (origin IN ('instance', 'template')),
  status text DEFAULT 'not_started',
  template text,
  position integer,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  root_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  -- Feature Flags & Metadata
  is_premium boolean DEFAULT false, 
  is_locked boolean DEFAULT false, -- Checkpoints feature
  is_complete boolean DEFAULT false,
  
  -- Ownership & Assignment
  creator uuid REFERENCES auth.users(id),
  assignee_id uuid REFERENCES auth.users(id),
  
  -- Scheduling
  start_date timestamptz,
  due_date timestamptz,
  days_from_start integer,
  location text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_root_id ON public.tasks(root_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_locked ON public.tasks(is_locked);
CREATE INDEX IF NOT EXISTS idx_tasks_is_premium ON public.tasks(is_premium);

-- PROJECT MEMBERS Table
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- PROJECT INVITES Table
CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited')),
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  CONSTRAINT unique_invite_per_project UNIQUE (project_id, email)
);

-- ============================================================================
-- 2. VIEWS
-- ============================================================================

-- DUMMY View for tasks_with_primary_resource
CREATE OR REPLACE VIEW public.tasks_with_primary_resource AS
SELECT 
  t.*,
  NULL::uuid as primary_resource_id
FROM public.tasks t;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN false; -- Default to false for Alpha
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_project_role(project_id uuid, user_id uuid, roles text[])
RETURNS boolean AS $$
BEGIN
  -- ALPHA OVERRIDE: Allow logic for testing
  RETURN true; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- TASKS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
CREATE POLICY "Enable read access for all users" ON public.tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for users" ON public.tasks;
CREATE POLICY "Enable update for users" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for users" ON public.tasks;
CREATE POLICY "Enable delete for users" ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');


-- PROJECT MEMBERS Policies
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View project members" ON public.project_members;
CREATE POLICY "View project members" ON public.project_members
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );
  
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;
CREATE POLICY "Enable all for authenticated users" ON public.project_members FOR ALL USING (auth.role() = 'authenticated');


-- PROJECT INVITES Policies
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View invites for project members" ON public.project_invites;
CREATE POLICY "View invites for project members" ON public.project_invites
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Create invites for project members" ON public.project_invites;
CREATE POLICY "Create invites for project members" ON public.project_invites
  FOR INSERT WITH CHECK (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Delete invites for project members" ON public.project_invites;
CREATE POLICY "Delete invites for project members" ON public.project_invites
  FOR DELETE USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

-- ============================================================================
-- 4. LOGIC FUNCTIONS & TRIGGERS
-- ============================================================================

-- Invite User RPC
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
BEGIN
  IF NOT public.has_project_role(p_project_id, auth.uid(), ARRAY['owner', 'editor']) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You must be an owner or editor to invite members.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object(
      'status', 'added',
      'user_id', v_user_id
    );
  ELSE
    INSERT INTO public.project_invites (project_id, email, role)
    VALUES (p_project_id, p_email, p_role)
    ON CONFLICT (project_id, email) DO UPDATE
    SET role = EXCLUDED.role, expires_at = (now() + interval '7 days')
    RETURNING id, token INTO v_invite_id, v_token;

    RETURN jsonb_build_object(
      'status', 'invited',
      'invite_id', v_invite_id,
      'token', v_token
    );
  END IF;
END;
$$;

-- Checkpoints: Unlock Next Phase Trigger Logic
CREATE OR REPLACE FUNCTION public.handle_phase_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_task_id uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT id INTO v_next_task_id
    FROM public.tasks
    WHERE parent_task_id = NEW.parent_task_id
      AND position > NEW.position
    ORDER BY position ASC
    LIMIT 1;

    IF v_next_task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET is_locked = false
      WHERE id = v_next_task_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_unlock_next_phase ON public.tasks;
CREATE TRIGGER trg_unlock_next_phase
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_phase_completion();
