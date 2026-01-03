-- schema.sql
-- PlanterPlan Combined Schema (Idempotent)
-- Tables, indexes, views, functions, triggers, RLS policies, grants.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. TABLES & TYPES
-- -------------------------------------------------------------------------

-- 1.1 Enum: task_resource_type (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_resource_type') THEN
    CREATE TYPE public.task_resource_type AS ENUM ('pdf','url','text');
  END IF;
END$$;

-- 1.2 tasks (Core table)
-- Note: primary_resource_id is added later to resolve circular dependency with task_resources
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

  -- Features
  notes text,
  purpose text,
  actions text,
  is_complete boolean DEFAULT false,
  days_from_start integer DEFAULT 0,
  start_date timestamptz,
  due_date timestamptz,

  -- Ordering
  position bigint DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Upgrade older installs
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS root_id uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS days_from_start integer,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS position bigint,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS actions text,
  ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;

-- Ensure defaults
ALTER TABLE public.tasks
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN position SET DEFAULT 0,
  ALTER COLUMN days_from_start SET DEFAULT 0,
  ALTER COLUMN origin SET DEFAULT 'instance',
  ALTER COLUMN status SET DEFAULT 'todo';

-- Add/ensure FK on root_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_root_id_fkey' AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_root_id_fkey
      FOREIGN KEY (root_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1.3 task_resources (New Resource Model)
CREATE TABLE IF NOT EXISTS public.task_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  resource_type public.task_resource_type NOT NULL,
  
  -- payloads
  resource_url text,
  resource_text text,
  
  -- storage
  storage_bucket text,
  storage_path text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT task_resources_type_payload_check
  CHECK (
    (resource_type = 'url'  AND resource_url IS NOT NULL AND resource_text IS NULL AND storage_path IS NULL)
    OR
    (resource_type = 'text' AND resource_text IS NOT NULL AND resource_url IS NULL AND storage_path IS NULL)
    OR
    (resource_type = 'pdf'  AND storage_path IS NOT NULL AND resource_url IS NULL AND resource_text IS NULL)
  )
);

-- 1.4 Add primary_resource_id to tasks (Circular ref)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS primary_resource_id uuid REFERENCES public.task_resources(id) ON DELETE SET NULL;

-- 1.5 project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Upgrade project_members
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'viewer';

UPDATE public.project_members SET role = 'viewer' WHERE role IS NULL;
ALTER TABLE public.project_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.project_members ALTER COLUMN joined_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_user_id_key' AND conrelid = 'public.project_members'::regclass
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
CREATE INDEX IF NOT EXISTS idx_tasks_is_complete ON public.tasks(is_complete);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_origin_parent_position ON public.tasks(creator, origin, parent_task_id, position);

-- Resource indexes
CREATE INDEX IF NOT EXISTS idx_task_resources_task_id ON public.task_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_type ON public.task_resources(resource_type);


CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);

-- -------------------------------------------------------------------------
-- 3. VIEWS
-- -------------------------------------------------------------------------

-- 3.1 tasks_with_primary_resource
CREATE OR REPLACE VIEW public.tasks_with_primary_resource AS
SELECT
  t.*,
  COALESCE(tr_primary.id, tr_newest.id) as resource_id,
  COALESCE(tr_primary.resource_type, tr_newest.resource_type) as resource_type,
  COALESCE(tr_primary.resource_url, tr_newest.resource_url) as resource_url,
  COALESCE(tr_primary.resource_text, tr_newest.resource_text) as resource_text,
  COALESCE(tr_primary.storage_path, tr_newest.storage_path) as storage_path,
  CAST(NULL as text) as resource_name
FROM public.tasks t
LEFT JOIN public.task_resources tr_primary ON t.primary_resource_id = tr_primary.id
LEFT JOIN LATERAL (
  SELECT * FROM public.task_resources
  WHERE task_id = t.id
  ORDER BY created_at DESC
  LIMIT 1
) tr_newest ON true;

-- 3.2 view_master_library
CREATE OR REPLACE VIEW public.view_master_library AS
SELECT *
FROM public.tasks_with_primary_resource
WHERE origin = 'template'
  AND parent_task_id IS NULL;

-- -------------------------------------------------------------------------
-- 4. FUNCTIONS
-- -------------------------------------------------------------------------

-- 4.1 updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- 4.2 root_id assignment
CREATE OR REPLACE FUNCTION public.maintain_task_root_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
  DECLARE
    v_root_id uuid;
  BEGIN
    IF TG_OP = 'INSERT' AND NEW.root_id IS NOT NULL THEN RETURN NEW; END IF;
    IF NEW.parent_task_id IS NULL THEN
      NEW.root_id := NEW.id;
    ELSE
      SELECT t.root_id INTO v_root_id FROM public.tasks t WHERE t.id = NEW.parent_task_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Parent task with id % does not exist.', NEW.parent_task_id; END IF;
      IF v_root_id IS NULL THEN RAISE EXCEPTION 'Parent task % has a NULL root_id.', NEW.parent_task_id; END IF;
      NEW.root_id := v_root_id;
    END IF;
    RETURN NEW;
  END;
$$;

-- 4.3 propagate_task_root_id
CREATE OR REPLACE FUNCTION public.propagate_task_root_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.root_id IS NOT DISTINCT FROM NEW.root_id THEN RETURN NEW; END IF;
  WITH RECURSIVE subtree AS (
    SELECT id FROM public.tasks WHERE parent_task_id = NEW.id
    UNION ALL
    SELECT t.id FROM public.tasks t JOIN subtree s ON t.parent_task_id = s.id
  )
  UPDATE public.tasks SET root_id = NEW.root_id WHERE id IN (SELECT id FROM subtree);
  RETURN NEW;
END;
$$;

-- 4.4 get_task_root_id
-- SECURITY DEFINER: Needed to look up root_id for RLS policy evaluation without recursion.
CREATE OR REPLACE FUNCTION public.get_task_root_id(p_task_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_root_id uuid;
BEGIN
  SELECT t.root_id INTO v_root_id FROM public.tasks t WHERE t.id = p_task_id;
  RETURN v_root_id;
END;
$function$;

-- 4.5 is_active_member
-- SECURITY DEFINER: Used by RLS policies to check membership without exposing project_members directly.
CREATE OR REPLACE FUNCTION public.is_active_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id);
END;
$function$;

-- 4.6 is_admin
-- SECURITY DEFINER: Reserved for future admin role check. Currently returns false.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN RETURN false; END;
$function$;

-- 4.7 check_project_ownership
-- SECURITY DEFINER: Used by RLS to verify task ownership without exposing tasks table.
CREATE OR REPLACE FUNCTION public.check_project_ownership(p_id uuid, u_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.tasks WHERE id = p_id AND creator = u_id);
END;
$$;

-- 4.8 has_project_role
-- SECURITY DEFINER: Checks if user has specific role in project, used by RLS for role-based access.
CREATE OR REPLACE FUNCTION public.has_project_role(p_task_id uuid, p_user_id uuid, p_allowed_roles text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_root_id uuid; v_user_role text;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
  v_root_id := public.get_task_root_id(p_task_id);
  IF v_root_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = v_root_id AND t.creator = p_user_id) THEN RETURN true; END IF;
  SELECT pm.role INTO v_user_role FROM public.project_members pm WHERE pm.project_id = v_root_id AND pm.user_id = p_user_id LIMIT 1;
  RETURN (v_user_role IS NOT NULL AND v_user_role = ANY(p_allowed_roles));
END;
$function$;

-- -------------------------------------------------------------------------
-- 5. TRIGGERS
-- -------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_set_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_maintain_task_root_id ON public.tasks;
CREATE TRIGGER trigger_maintain_task_root_id BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.maintain_task_root_id();

DROP TRIGGER IF EXISTS trigger_propagate_task_root_id ON public.tasks;
CREATE TRIGGER trigger_propagate_task_root_id AFTER UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.propagate_task_root_id();

-- -------------------------------------------------------------------------
-- 6. RLS + GRANTS
-- -------------------------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_resources ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated, service_role;
GRANT ALL ON public.task_resources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_resources TO authenticated;

GRANT SELECT ON public.tasks_with_primary_resource TO authenticated, service_role;
GRANT SELECT ON public.view_master_library TO authenticated, service_role;

-- Revoke Public
REVOKE EXECUTE ON FUNCTION public.get_task_root_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_project_ownership(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;

-- Grant Exec
GRANT EXECUTE ON FUNCTION public.get_task_root_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_project_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Policies: Tasks
DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks FOR SELECT USING (
  creator = auth.uid() OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor','viewer']) OR origin = 'template' OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks FOR INSERT WITH CHECK (
  (parent_task_id IS NULL AND creator = auth.uid()) OR (parent_task_id IS NOT NULL AND public.has_project_role(parent_task_id, auth.uid(), ARRAY['owner','editor'])) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks FOR UPDATE USING (
  creator = auth.uid() OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor']) OR public.is_admin(auth.uid())
) WITH CHECK (
  creator = auth.uid() OR public.has_project_role(id, auth.uid(), ARRAY['owner','editor']) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks FOR DELETE USING (
  creator = auth.uid() OR public.has_project_role(id, auth.uid(), ARRAY['owner']) OR public.is_admin(auth.uid())
);

-- Policies: task_resources
DROP POLICY IF EXISTS task_resources_select_policy ON public.task_resources;
CREATE POLICY task_resources_select_policy ON public.task_resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_resources.task_id AND (
    t.creator = auth.uid() OR public.has_project_role(t.id, auth.uid(), ARRAY['owner','editor','viewer']) OR t.origin = 'template' OR public.is_admin(auth.uid())
  ))
);

DROP POLICY IF EXISTS task_resources_modify_policy ON public.task_resources;
CREATE POLICY task_resources_modify_policy ON public.task_resources FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_resources.task_id AND (
    t.creator = auth.uid() OR public.has_project_role(t.id, auth.uid(), ARRAY['owner','editor']) OR public.is_admin(auth.uid())
  ))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_resources.task_id AND (
    t.creator = auth.uid() OR public.has_project_role(t.id, auth.uid(), ARRAY['owner','editor']) OR public.is_admin(auth.uid())
  ))
);

-- Policies: Project Members
DROP POLICY IF EXISTS members_select_policy ON public.project_members;
CREATE POLICY members_select_policy ON public.project_members FOR SELECT USING (
  user_id = auth.uid() OR public.is_active_member(project_id, auth.uid()) OR public.check_project_ownership(project_id, auth.uid())
);

DROP POLICY IF EXISTS members_insert_policy ON public.project_members;
CREATE POLICY members_insert_policy ON public.project_members FOR INSERT WITH CHECK (
  public.check_project_ownership(project_id, auth.uid()) OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS members_update_policy ON public.project_members;
CREATE POLICY members_update_policy ON public.project_members FOR UPDATE USING (
  public.check_project_ownership(project_id, auth.uid()) OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS members_delete_policy ON public.project_members;
CREATE POLICY members_delete_policy ON public.project_members FOR DELETE USING (
  user_id = auth.uid() OR public.check_project_ownership(project_id, auth.uid()) OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- 7. Comments
COMMENT ON TABLE public.tasks IS 'Tasks table. Resources are now in task_resources table.';

COMMIT;
