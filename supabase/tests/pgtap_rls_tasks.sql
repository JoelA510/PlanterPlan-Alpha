BEGIN;

SELECT plan(12);

-- Clean state
DELETE FROM auth.users WHERE email IN ('taskowner@example.com', 'team1@example.com', 'unauthorized@example.com', 'owner1@example.com', 'member1@example.com', 'random1@example.com');
TRUNCATE TABLE public.activity_log, public.task_comments, public.project_members, public.tasks CASCADE;

-- 1. Setup minimal test data
-- Insert Test Users
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'taskowner@example.com'),
    ('00000000-0000-0000-0000-000000000002', 'team1@example.com'),
    ('00000000-0000-0000-0000-000000000003', 'unauthorized@example.com');

-- Insert Project as Root Task
INSERT INTO tasks (id, title, status, creator, root_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Project Alpha', 'not_started', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

-- Insert Members (taskowner is owner, team1 is editor. unauthorized has no record)
INSERT INTO project_members (project_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'owner'),
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'editor');

-- Insert Task
INSERT INTO tasks (id, root_id, parent_task_id, title) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Secure Database Scheme');

-- =========================================================
-- START TDD Observations
-- =========================================================

-- Test 1: Anonymous Role Cannot Read Tasks
GRANT SELECT ON public.tasks TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;
set local role anon;
SELECT is(
    (select count(*) from tasks),
    0::bigint,
    'Anonymous users should see 0 tasks'
);

-- Test 2: Unauthorized Auth Role Cannot Read
set local role authenticated;
-- Important: Mock the JWT claim for basejump RLS 
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000003"}';

SELECT is(
    (select count(*) from tasks),
    0::bigint,
    'Authenticated but unauthorized users should see 0 tasks in this project'
);

-- Test 3: Unauthorized Cannot Mutate
SELECT throws_ok(
    $$ INSERT INTO tasks (id, root_id, parent_task_id, title) VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hacked Task') $$,
    'new row violates row-level security policy for table "tasks"',
    'Unauthorized users cannot insert tasks into projects they do not belong to'
);

-- Test 4: Member Can Read Tasks
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002"}';

SELECT is(
    (select count(*) from tasks),
    2::bigint,
    'Team member can see 2 tasks in the project'
);

-- Test 5: Member Can Update Task
SELECT lives_ok(
    $$ UPDATE tasks SET title = 'Updated Title' WHERE id = '22222222-2222-2222-2222-222222222222' $$,
    'Team member can update task'
);

-- Test 6: Member Can Insert Task
SELECT lives_ok(
    $$ INSERT INTO tasks (id, root_id, parent_task_id, title) VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Member Child Task') $$,
    'Team member can insert task'
);

-- Test 7: Verify Insertion
SELECT is(
    (select count(*) from tasks),
    3::bigint,
    'Team member should see 3 tasks now'
);

-- =========================================================
-- START TDD Observations for has_permission Helper
-- =========================================================
set local role postgres;
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-000000000101', 'owner1@example.com'),
    ('00000000-0000-0000-0000-000000000102', 'member1@example.com'),
    ('00000000-0000-0000-0000-000000000103', 'random1@example.com');

INSERT INTO tasks (id, title, status, creator, root_id) VALUES
    ('11111111-1111-1111-1111-111111111101', 'Permission Test Project', 'not_started', '00000000-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111101');

INSERT INTO project_members (project_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000101', 'owner'),
    ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000102', 'editor');

-- Test 8: has_permission (Owner Requesting Owner Role)
-- `has_permission` is an internal helper with direct EXECUTE revoked from
-- authenticated; test its claim-binding logic as the function owner.
set local role postgres;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000101"}';
SELECT is(
    public.has_permission('11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'owner'::text),
    true,
    'Owner should have owner permission'
);

-- Test 9: has_permission (Member Requesting Owner Role)
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000102"}';
SELECT is(
    public.has_permission('11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'owner'::text),
    false,
    'Member should NOT have owner permission'
);

-- Test 10: has_permission (Member Requesting Editor Role)
SELECT is(
    public.has_permission('11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'editor'::text),
    true,
    'Editor should have editor permission'
);

-- Test 11: has_permission (Unauthorized User)
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000103"}';
SELECT is(
    public.has_permission('11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 'editor'::text),
    false,
    'Unauthorized user should NOT have editor permission'
);

-- Test 12: has_permission (Mismatched Claim vs Request)
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000103"}';
SELECT is(
    public.has_permission('11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'owner'::text),
    false,
    'Mismatched user token and passed user_id should fail immediately'
);

SELECT * FROM finish();
ROLLBACK;
