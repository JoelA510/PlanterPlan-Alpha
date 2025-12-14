-- Reconstructed Schema for PlanterPlan
-- Run this to initialize a fresh Supabase database

-- 1. Tasks Table (Core)
-- "Projects" are just root-level tasks in this model.
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID REFERENCES public.tasks(id), -- Hierarchical structure
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
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON public.tasks(creator);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);

-- 5. Enable RLS (Good practice to enable early, policies applied via policies.sql)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
