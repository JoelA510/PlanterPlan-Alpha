-- One-time Database Setup
-- Use this file for scripts that should run only once and are NOT idempotent schema definitions.
-- Examples: Data patches, destructive renames, or initialization of static data that shouldn't be re-seeded.

-- CURRENT STATUS:
-- All schema definitions (Tables, Views, Functions, Policies) are consolidated in `docs/db/schema.sql`.
-- Initial data seeding is handled by `supabase/seeds/`.

-- If you need to run specific data patches, add them here.

-- 1. Backfill project_members table so the creator of a project is always an 'owner'
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, creator, 'owner'
FROM public.tasks
WHERE root_id IS NULL AND parent_task_id IS NULL AND creator IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;
