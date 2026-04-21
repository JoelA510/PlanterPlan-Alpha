-- EXPECT: 3 inserts succeed, 1 insert raises constraint violation
--
-- Wave 29: manual psql smoke for the tasks_project_kind_check constraint.
-- Requires the migration 2026_04_18_project_kind.sql to have been applied.
-- Run in a transaction so repeated execution is a no-op.

BEGIN;

-- 1. Root task with NO project_kind key — should succeed (defaults to date).
INSERT INTO public.tasks (id, title, parent_task_id, origin, settings)
VALUES (gen_random_uuid(), '[checkpoint_kind smoke] default-kind', NULL, 'instance', '{}'::jsonb);

-- 2. Root task with explicit 'date' — should succeed.
INSERT INTO public.tasks (id, title, parent_task_id, origin, settings)
VALUES (gen_random_uuid(), '[checkpoint_kind smoke] explicit date', NULL, 'instance', '{"project_kind":"date"}'::jsonb);

-- 3. Root task with explicit 'checkpoint' — should succeed.
INSERT INTO public.tasks (id, title, parent_task_id, origin, settings)
VALUES (gen_random_uuid(), '[checkpoint_kind smoke] explicit checkpoint', NULL, 'instance', '{"project_kind":"checkpoint"}'::jsonb);

-- 4. Root task with invalid 'foo' — should FAIL with constraint violation.
--    Wrap in a savepoint so the rollback doesn't abort the outer transaction.
SAVEPOINT before_bad;
DO $$
BEGIN
    INSERT INTO public.tasks (id, title, parent_task_id, origin, settings)
    VALUES (gen_random_uuid(), '[checkpoint_kind smoke] invalid kind', NULL, 'instance', '{"project_kind":"foo"}'::jsonb);
    RAISE EXCEPTION 'Expected constraint violation did NOT raise for project_kind=foo';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE '[OK] constraint rejected project_kind=foo as expected';
END $$;
ROLLBACK TO SAVEPOINT before_bad;

-- Clean up the three successful inserts.
DELETE FROM public.tasks WHERE title LIKE '[checkpoint_kind smoke]%';

COMMIT;
