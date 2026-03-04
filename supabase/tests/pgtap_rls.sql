BEGIN;
SELECT plan(1);

-- Switch to the anonymous role to simulate unauthenticated access
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.role = 'anon';

-- Verify RLS enforces zero rows returned from tasks
SELECT is_empty(
    'SELECT * FROM public.tasks',
    'Anonymous users should not be able to read any tasks due to RLS policies'
);

SELECT * FROM finish();
ROLLBACK;
