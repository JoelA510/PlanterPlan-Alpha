-- PlanterPlan Database Schema
-- Consolidated: 2026-01-18
-- Includes: Core, People, and Phase 3 features.

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CLEANUP & INIT
-- ============================================================================

-- Remove Legacy Features (Budget & Inventory)
DROP TABLE IF EXISTS public.budget_items CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;

-- ============================================================================
-- 2. TABLES & TYPES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TASKS Table
-- Core table for Projects (root tasks) and Tasks (children)
-- ----------------------------------------------------------------------------
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
  is_locked boolean DEFAULT false, -- Checkpoints
  is_complete boolean DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb, -- Phase 3 Project Settings
  priority text DEFAULT 'medium',

  -- Ownership & Assignment
  creator uuid REFERENCES auth.users(id),
  assignee_id uuid REFERENCES auth.users(id),
  
  -- Scheduling
  start_date timestamptz,
  due_date timestamptz,
  days_from_start integer,
  location text,
  
  -- Legacy / View Support
  primary_resource_id uuid,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Idempotent Column Additions (For patching existing databases)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS days_from_start integer;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS primary_resource_id uuid;

COMMENT ON COLUMN public.tasks.settings IS 'Project-level settings (e.g., due_soon_threshold, location_defaults)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_root_id ON public.tasks(root_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_locked ON public.tasks(is_locked);
CREATE INDEX IF NOT EXISTS idx_tasks_is_premium ON public.tasks(is_premium);

-- ----------------------------------------------------------------------------
-- PROJECT MEMBERS Table
-- RBAC: Owners, Editors, Coaches, Viewers, Limited
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- ----------------------------------------------------------------------------
-- PROJECT INVITES Table
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- TASK RELATIONSHIPS (Phase 3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    to_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    type text CHECK (type IN ('blocks', 'relates_to', 'duplicates')) DEFAULT 'relates_to',
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_relationship UNIQUE (from_task_id, to_task_id, type)
);



-- ----------------------------------------------------------------------------
-- PEOPLE (CRM Lite)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  role text DEFAULT 'Volunteer',
  status text CHECK (status IN ('New', 'Contacted', 'Meeting Scheduled', 'Joined', 'Not Interested')) DEFAULT 'New',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_people_project_id ON public.people(project_id);



-- ============================================================================
-- 2. VIEWS
-- ============================================================================

-- Adapter View for Legacy Support
DROP VIEW IF EXISTS public.tasks_with_primary_resource CASCADE;
CREATE OR REPLACE VIEW public.tasks_with_primary_resource AS
SELECT 
    t.*,
    -- Add missing legacy columns required by view_master_library as NULLs
    NULL::uuid as resource_id,
    NULL::text as resource_type,
    NULL::text as resource_url,
    NULL::text as resource_text,
    NULL::text as storage_path,
    NULL::text as resource_name
FROM public.tasks t;

-- MASTER LIBRARY View
CREATE OR REPLACE VIEW public.view_master_library AS
SELECT 
    t.id,
    t.parent_task_id,
    t.title,
    t.description,
    t.status,
    t.origin,
    t.creator,
    t.root_id,
    t.notes,
    t.days_from_start,
    t.start_date,
    t.due_date,
    t.position,
    t.created_at,
    t.updated_at,
    t.purpose,
    t.actions,
    t.is_complete,
    t.primary_resource_id,
    t.primary_resource_id as resource_id
FROM public.tasks t
WHERE t.origin = 'instance' OR t.origin = 'template';

-- ============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================================

-- RLS Helper: is_admin
-- Note: Uses p_user_id to match existing DB signature
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN false; -- Default to false for Alpha
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Helper: has_project_role
-- Note: Uses p_project_id for clarity
-- CRITICAL: Use CASCADE to drop dependency policies before re-defining
DROP FUNCTION IF EXISTS public.has_project_role(uuid, uuid, text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.has_project_role(p_project_id uuid, p_user_id uuid, p_allowed_roles text[])
RETURNS boolean AS $$
DECLARE
    v_role text;
BEGIN
    -- Check Project Members table directly
    SELECT role INTO v_role 
    FROM public.project_members 
    WHERE project_id = p_project_id 
    AND user_id = p_user_id;

    -- If role exists and is in allowed list, return true
    IF v_role IS NOT NULL AND v_role = ANY(p_allowed_roles) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clone Project Template Function
CREATE OR REPLACE FUNCTION public.clone_project_template(
    p_template_id uuid,
    p_new_parent_id uuid,
    p_new_origin text,
    p_user_id uuid,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_due_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
    v_new_root_id uuid;
    v_top_new_id uuid;
    v_tasks_count int;
BEGIN
    -- 1. Create Temp Table for ID Mapping (Task)
    CREATE TEMP TABLE IF NOT EXISTS temp_task_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 2. Create Temp Table for ID Mapping (Resource)
    CREATE TEMP TABLE IF NOT EXISTS temp_res_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 3. Identify all tasks in the subtree
    WITH RECURSIVE subtree AS (
        SELECT id FROM public.tasks WHERE id = p_template_id
        UNION ALL
        SELECT t.id FROM public.tasks t JOIN subtree s ON t.parent_task_id = s.id
    )
    INSERT INTO temp_task_map (old_id, new_id)
    SELECT id, gen_random_uuid() FROM subtree;

    -- Capture new ID of the top node
    SELECT new_id INTO v_top_new_id FROM temp_task_map WHERE old_id = p_template_id;
    
    -- 4. Determine Root ID
    -- If we have a parent, inherit its root. If not, the new top node is the root.
    IF p_new_parent_id IS NULL THEN
        v_new_root_id := v_top_new_id;
    ELSE
        SELECT root_id INTO v_new_root_id FROM public.tasks WHERE id = p_new_parent_id;
        IF v_new_root_id IS NULL THEN
             RAISE EXCEPTION 'Parent task % has no root_id', p_new_parent_id;
        END IF;
    END IF;

    -- 5. Insert New Tasks
    INSERT INTO public.tasks (
        id, parent_task_id, root_id, creator, origin, 
        title, description, status, position, 
        notes, purpose, actions, is_complete, days_from_start, start_date, due_date
    )
    SELECT 
        m.new_id, 
        CASE 
            WHEN t.id = p_template_id THEN p_new_parent_id -- Top node gets new parent
            ELSE mp.new_id  -- Others get mapped parent
        END,
        v_new_root_id,
        p_user_id,
        p_new_origin,
        -- Override Title/Desc for Root if provided
        CASE WHEN t.id = p_template_id AND p_title IS NOT NULL THEN p_title ELSE t.title END,
        CASE WHEN t.id = p_template_id AND p_description IS NOT NULL THEN p_description ELSE t.description END,
        t.status, t.position,
        t.notes, t.purpose, t.actions, false, t.days_from_start, 
        -- Set Dates for Root if provided
        CASE WHEN t.id = p_template_id THEN p_start_date ELSE null END,
        CASE WHEN t.id = p_template_id THEN p_due_date ELSE null END
    FROM public.tasks t
    JOIN temp_task_map m ON t.id = m.old_id
    LEFT JOIN temp_task_map mp ON t.parent_task_id = mp.old_id;

    -- 6. Identify Resources to clone
    INSERT INTO temp_res_map (old_id, new_id)
    SELECT r.id, gen_random_uuid()
    FROM public.task_resources r
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 7. Insert New Resources
    INSERT INTO public.task_resources (
        id, task_id, resource_type, resource_url, resource_text, storage_path, storage_bucket
    )
    SELECT 
        rm.new_id,
        tm.new_id,
        r.resource_type, r.resource_url, r.resource_text, r.storage_path, r.storage_bucket
    FROM public.task_resources r
    JOIN temp_res_map rm ON r.id = rm.old_id
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 8. Update Primary Resource Pointers on New Tasks
    UPDATE public.tasks t
    SET primary_resource_id = rm.new_id
    FROM public.tasks original
    JOIN temp_task_map tm ON original.id = tm.old_id
    JOIN temp_res_map rm ON original.primary_resource_id = rm.old_id
    WHERE t.id = tm.new_id;

    -- 9. Return result
    SELECT COUNT(*) INTO v_tasks_count FROM temp_task_map;

    RETURN jsonb_build_object(
        'new_root_id', v_top_new_id,
        'root_project_id', v_new_root_id,
        'tasks_cloned', v_tasks_count
    );
END;
$$;

-- Grant permissions for clone function
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO service_role;

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

-- Phase Completion Trigger
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

DROP TRIGGER IF EXISTS trg_unlock_next_phase ON public.tasks;
CREATE TRIGGER trg_unlock_next_phase
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_phase_completion();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- TASKS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
CREATE POLICY "Enable read access for all users" ON public.tasks 
FOR SELECT USING (
    -- 1. Direct Ownership (Creator) - Fast verification
    creator = auth.uid()
    OR 
    -- 2. Project Membership (via Root ID or Self ID) - Role verification
    -- We check COALESCE(root_id, id) to handle both Root Projects and Child Tasks
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited'])
);

DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    -- Must have write access to the project (Root ID)
    public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS "Enable update for users" ON public.tasks;
CREATE POLICY "Enable update for users" ON public.tasks 
FOR UPDATE USING (
    creator = auth.uid()
    OR 
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS "Enable delete for users" ON public.tasks;
CREATE POLICY "Enable delete for users" ON public.tasks 
FOR DELETE USING (
    creator = auth.uid()
    OR 
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor'])
);

-- PROJECT MEMBERS Policies
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View project members" ON public.project_members;
CREATE POLICY "View project members" ON public.project_members
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );
  
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;
CREATE POLICY "Enable all for authenticated users" ON public.project_members 
FOR ALL USING (
    -- Only Owners can manage members
    public.has_project_role(project_id, auth.uid(), ARRAY['owner'])
    OR
    public.is_admin(auth.uid())
);

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



-- PEOPLE Policies
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View people for project members" ON public.people;
CREATE POLICY "View people for project members" ON public.people
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Manage people for owners and editors" ON public.people;
CREATE POLICY "Manage people for owners and editors" ON public.people
  FOR ALL USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );



-- TASK RELATIONSHIPS Policies
ALTER TABLE public.task_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View relationships" ON public.task_relationships;
CREATE POLICY "View relationships" ON public.task_relationships
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = task_relationships.project_id
            AND project_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Manage relationships" ON public.task_relationships;
CREATE POLICY "Manage relationships" ON public.task_relationships
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = task_relationships.project_id
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'editor')
        )
    );
