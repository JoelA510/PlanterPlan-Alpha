-- Inventory / Assets Schema
-- Date: 2026-01-18

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text CHECK (category IN ('equipment', 'venue', 'marketing', 'kids', 'other')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost', 'retired')),
  location text,
  value numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View assets" ON public.assets;
CREATE POLICY "View assets" ON public.assets
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Manage assets" ON public.assets;
CREATE POLICY "Manage assets" ON public.assets
  FOR ALL USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );
