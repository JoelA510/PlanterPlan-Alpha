-- Budgeting Feature Schema
-- Date: 2026-01-19

-- BUDGET ITEMS Table
CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  category text CHECK (category IN ('Equipment', 'Marketing', 'Venue', 'Kids', 'Operations', 'Other')),
  description text NOT NULL,
  planned_amount numeric(10, 2) DEFAULT 0,
  actual_amount numeric(10, 2) DEFAULT 0,
  status text CHECK (status IN ('planned', 'purchased')) DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON public.budget_items(project_id);

-- RLS Policies
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View budget items for project members" ON public.budget_items;
CREATE POLICY "View budget items for project members" ON public.budget_items
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Manage budget items for owners and editors" ON public.budget_items;
CREATE POLICY "Manage budget items for owners and editors" ON public.budget_items
  FOR ALL USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );
