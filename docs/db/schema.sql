-- schema.sql
-- PlanterPlan Combined Schema (Idempotent)
-- Tables, indexes, views, functions, triggers, RLS policies, grants.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. TABLES
-- -------------------------------------------------------------------------

-- 1.1 tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  origin text DEFAULT 'instance', -- 'template' or 'instance'
  creator uuid REFERENCES auth.users(id),

  -- Denormalized root pointer (project id)
  root_id uuid,

  -- Phase 2
  notes text,
  purpose text,
  actions text,
  resources text, -- Legacy text field
  is_complete boolean DEFAULT false,
  days_from_start integer DEFAULT 0,
  start_date timestamptz,
  due_date timestamptz,

  -- Ordering
  position bigint DEFAULT 0,

  -- Resources
  resource_type text CHECK (resource_type IN ('pdf','url','text')),
  resource_url text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Upgrade older installs (no-op if columns already exist)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS root_id uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS days_from_start integer,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS position bigint,
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS actions text,
  ADD COLUMN IF NOT EXISTS resources text,
  ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;

-- Ensure defaults exist (safe even if already set)
ALTER TABLE public.tasks
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN position SET DEFAULT 0,
  ALTER COLUMN days_from_start SET DEFAULT 0,
  ALTER COLUMN origin SET DEFAULT 'instance',
  ALTER COLUMN status SET DEFAULT 'todo';

-- Add/ensure FK on root_id (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_root_id_fkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_root_id_fkey
      FOREIGN KEY (root_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1.2 project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Upgrade older installs
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.project_members
  ALTER COLUMN joined_at SET DEFAULT now();

-- Ensure unique constraint exists (if table existed without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_members_project_id_user_id_key'
      AND conrelid = 'public.project_members'::regclass
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. INDEXES
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tasks_root ON public.tasks(root_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON public.tasks(creator);
CREATE INDEX IF NOT EXISTS idx_tasks_resource_type ON public.tasks(resource_type);
CREATE INDEX IF NOT EXISTS idx_tasks_is_complete ON public.tasks(is_complete);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_origin_parent_position
  ON public.tasks(creator, origin, parent_task_id, position);

CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);

-- -------------------------------------------------------------------------
-- 3. VIEWS
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.view_master_library AS
SELECT *
FROM public.tasks
WHERE origin = 'template'
  AND parent_task_id IS NULL;

-- -------------------------------------------------------------------------
-- 4. FUNCTIONS
-- -------------------------------------------------------------------------

-- 4.1 updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- 4.2 root_id assignment (BEFORE)
CREATE OR REPLACE FUNCTION public.maintain_task_root_id()
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

-- 4.3 root_id propagation for subtree moves (AFTER)
CREATE OR REPLACE FUNCTION public.propagate_task_root_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only act when root_id actually changed (reparent or root flip)
  IF OLD.root_id IS NOT DISTINCT FROM NEW.root_id THEN
    RETURN NEW;
  END IF;

  WITH RECURSIVE subtree AS (
    SELECT id
    FROM public.tasks
    WHERE parent_task_id = NEW.id
    UNION ALL
    SELECT t.id
    FROM public.tasks t
    JOIN subtree s ON t.parent_task_id = s.id
  )
  UPDATE public.tasks
  SET root_id = NEW.root_id
  WHERE id IN (SELECT id FROM subtree);

  RETURN NEW;
END;
$$;

-- 4.4 get_task_root_id (SECURITY DEFINER, 42P13-proof)
DO $$
DECLARE
  rp regprocedure;
  args text;
BEGIN
  rp := to_regprocedure('public.get_task_root_id(uuid)');
  IF rp IS NOT NULL THEN
    SELECT pg_get_function_arguments(rp) INTO args;
  END IF;

  args := COALESCE(args, 't_id uuid');

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.get_task_root_id(%s)
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    DECLARE
      r_id uuid;
    BEGIN
      SELECT root_id INTO r_id
      FROM public.tasks
      WHERE id = $1;

      RETURN r_id;
    END;
    $function$;
  $sql$, args);
END $$;

-- 4.5 is_active_member (SECURITY DEFINER, 42P13-proof)
DO $$
DECLARE
  rp regprocedure;
  args text;
BEGIN
  rp := to_regprocedure('public.is_active_member(uuid,uuid)');
  IF rp IS NOT NULL THEN
    SELECT pg_get_function_arguments(rp) INTO args;
  END IF;

  args := COALESCE(args, 'p_id uuid, u_id uuid');

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.is_active_member(%s)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    BEGIN
      RETURN EXISTS (
        SELECT 1
        FROM public.project_members
        WHERE project_id = $1
          AND user_id = $2
      );
    END;
    $function$;
  $sql$, args);
END $$;

-- 4.6 is_admin placeholder (SECURITY DEFINER, 42P13-proof)
DO $$
DECLARE
  rp regprocedure;
  args text;
BEGIN
  rp := to_regprocedure('public.is_admin(uuid)');
  IF rp IS NOT NULL THEN
    SELECT pg_get_function_arguments(rp) INTO args;
  END IF;

  args := COALESCE(args, 'user_id uuid');

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.is_admin(%s)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    BEGIN
      RETURN false;
    END;
    $function$;
  $sql$, args);
END $$;

-- 4.7 check_project_ownership (breaks recursion; SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_project_ownership(p_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = p_id
      AND creator = u_id
  );
END;
$$;

-- 4.8 has_project_role (SECURITY DEFINER, hardened, 42P13-proof)
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

-- -------------------------------------------------------------------------
-- 5. TRIGGERS
-- -------------------------------------------------------------------------

-- updated_at
DROP TRIGGER IF EXISTS trigger_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- root_id maintenance
DROP TRIGGER IF EXISTS trigger_maintain_task_root_id ON public.tasks;
CREATE TRIGGER trigger_maintain_task_root_id
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.maintain_task_root_id();

-- subtree propagation after reparent
DROP TRIGGER IF EXISTS trigger_propagate_task_root_id ON public.tasks;
CREATE TRIGGER trigger_propagate_task_root_id
AFTER UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.propagate_task_root_id();

-- -------------------------------------------------------------------------
-- 6. RLS + GRANTS + POLICIES
-- -------------------------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Explicit Table Grants (Essential for RLS to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;

-- revoke public execution
REVOKE EXECUTE ON FUNCTION public.get_task_root_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_project_ownership(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;

-- grants
GRANT EXECUTE ON FUNCTION public.get_task_root_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_project_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;

GRANT SELECT ON public.view_master_library TO authenticated;
GRANT SELECT ON public.view_master_library TO service_role;

-- Policies: tasks
DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks
FOR SELECT
USING (
  creator = auth.uid()
  OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor','viewer'])
  OR origin = 'template'
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
FOR INSERT
WITH CHECK (
  (parent_task_id IS NULL AND creator = auth.uid())
  OR (parent_task_id IS NOT NULL AND public.has_project_role(parent_task_id, auth.uid(), ARRAY['owner','editor']))
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks
FOR UPDATE
USING (
  creator = auth.uid()
  OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor'])
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  creator = auth.uid()
  OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor'])
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks
FOR DELETE
USING (
  creator = auth.uid()
  OR public.has_project_role(id, auth.uid(), ARRAY['owner'])
  OR public.is_admin(auth.uid())
);

-- Policies: project_members (use trusted ownership function to avoid recursion)
DROP POLICY IF EXISTS members_select_policy ON public.project_members;
CREATE POLICY members_select_policy ON public.project_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_active_member(project_id, auth.uid())
  OR public.check_project_ownership(project_id, auth.uid())
);

DROP POLICY IF EXISTS members_insert_policy ON public.project_members;
CREATE POLICY members_insert_policy ON public.project_members
FOR INSERT
WITH CHECK (
  public.check_project_ownership(project_id, auth.uid())
  OR project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
      AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_update_policy ON public.project_members;
CREATE POLICY members_update_policy ON public.project_members
FOR UPDATE
USING (
  public.check_project_ownership(project_id, auth.uid())
  OR project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
      AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_delete_policy ON public.project_members;
CREATE POLICY members_delete_policy ON public.project_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.check_project_ownership(project_id, auth.uid())
  OR project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
      AND role = 'owner'
  )
);

COMMIT;
