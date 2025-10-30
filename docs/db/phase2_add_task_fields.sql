-- Phase 2 schema updates for PlanterPlan tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS days_from_start integer;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date timestamptz;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Optional: backfill existing rows with sensible defaults if needed.
-- UPDATE public.tasks SET start_date = created_at::date, due_date = created_at::date WHERE start_date IS NULL;
