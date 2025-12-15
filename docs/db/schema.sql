-- Reconstructed Schema for PlanterPlan
-- Run this to initialize a fresh Supabase database

-- 1. Tasks Table (Core)
-- "Projects" are just root-level tasks in this model.
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE, -- Hierarchical structure
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo', -- e.g., 'todo', 'in_progress', 'completed'
    origin TEXT DEFAULT 'instance', -- 'template' or 'instance'
    creator UUID REFERENCES auth.users(id),
    
    -- Phase 2 Fields
    notes TEXT,
    days_from_start INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Optimization: Denormalized root_id to avoid recursive RLS
    root_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE, 
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger Function: Maintain root_id
-- Automatically sets root_id to itself (if root) or copies parent's root_id (if child)
CREATE OR REPLACE FUNCTION public.maintain_task_root_id() RETURNS TRIGGER AS $$
BEGIN
  -- Optimization: If root_id is already provided (e.g. deep clone batch insert), trust it.
  IF NEW.root_id IS NOT NULL THEN
     RETURN NEW;
  END IF;

  IF NEW.parent_task_id IS NULL THEN
    NEW.root_id := NEW.id;
  ELSE
    -- Performance: This query is simple and indexed, avoiding deep recursion
    -- Note regarding BEFORE INSERT: We need the parent's root_id.
    SELECT root_id INTO NEW.root_id
    FROM public.tasks
    WHERE id = NEW.parent_task_id;
    
    -- Fallback safety (orphan guard)
    IF NEW.root_id IS NULL THEN
        RAISE EXCEPTION 'Parent task % does not exist or has no root_id', NEW.parent_task_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maintain_task_root_id
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.maintain_task_root_id();

-- Backfill root_id for existing data (Idempotent-ish)
-- 1. Roots
UPDATE public.tasks SET root_id = id WHERE parent_task_id IS NULL AND root_id IS NULL;
-- 2. Children (One level only? For deep trees, run repeatedly or assume fresh DB)
-- Ideally this is a migration, but putting here for 'schema' correctness.
DO $$
BEGIN
  -- Simple loop to fill depth
  FOR i IN 1..10 LOOP
    UPDATE public.tasks t
    SET root_id = p.root_id
    FROM public.tasks p
    WHERE t.parent_task_id = p.id 
      AND t.root_id IS NULL 
      AND p.root_id IS NOT NULL;
      
    IF NOT FOUND THEN EXIT; END IF;
  END LOOP;
END $$;


-- 2. Project Members Table
-- Handles shared access to projects (which are root tasks)
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate memberships
    UNIQUE(project_id, user_id)
);

-- 3. Master Library View
-- Used by taskService.js to search templates
CREATE OR REPLACE VIEW public.view_master_library AS
SELECT *
FROM public.tasks
WHERE origin = 'template' 
  AND parent_task_id IS NULL; -- Only show root templates? Or all? Code implies search returns "tasks", usually roots.

-- 4. Indexes (Recommended)
CREATE INDEX IF NOT EXISTS idx_tasks_root ON public.tasks(root_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON public.tasks(creator);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);

-- 5. Enable RLS (Good practice to enable early, policies applied via policies.sql)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
