-- People/CRM Lite Schema
-- Date: 2026-01-19

-- PEOPLE Table
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  role text DEFAULT 'Volunteer', -- Volunteer, Core Team, Donor, etc.
  status text CHECK (status IN ('New', 'Contacted', 'Meeting Scheduled', 'Joined', 'Not Interested')) DEFAULT 'New',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_project_id ON public.people(project_id);

-- RLS Policies
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
