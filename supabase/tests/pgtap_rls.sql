BEGIN;
SELECT plan(1);

-- Switch to the anonymous role to simulate unauthenticated access
GRANT SELECT ON public.tasks TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.role = 'anon';

-- Verify RLS enforces zero rows returned from tasks
SELECT is_empty(
    'SELECT * FROM public.tasks',
    'Anonymous users should not be able to read any tasks due to RLS policies'
);

SELECT * FROM finish();
ROLLBACK;
