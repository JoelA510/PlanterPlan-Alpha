BEGIN;

SELECT plan(7);

-- Clean state
DELETE FROM auth.users WHERE email IN ('taskowner@example.com', 'team1@example.com', 'unauthorized@example.com');
DELETE FROM tasks;
DELETE FROM projects;
DELETE FROM project_members;

-- 1. Setup minimal test data
-- Insert Test Users
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'taskowner@example.com'),
    ('00000000-0000-0000-0000-000000000002', 'team1@example.com'),
    ('00000000-0000-0000-0000-000000000003', 'unauthorized@example.com');

-- Insert Project
INSERT INTO projects (id, title, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Project Alpha', 'planning');

-- Insert Members (taskowner is admin, team1 is member. unauthorized has no record)
INSERT INTO project_members (project_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'member');

-- Insert Task
INSERT INTO tasks (id, root_id, title) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Secure Database Scheme');

-- =========================================================
-- START TDD Observations
-- =========================================================

-- Test 1: Anonymous Role Cannot Read Tasks
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
    $$ INSERT INTO tasks (id, root_id, title) VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Hacked Task') $$,
    'new row violates row-level security policy for table "tasks"',
    'Unauthorized users cannot insert tasks into projects they do not belong to'
);

-- Test 4: Member Can Read Tasks
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002"}';

SELECT is(
    (select count(*) from tasks),
    1::bigint,
    'Team member can see 1 task in the project'
);

-- Test 5: Member Can Update Task
SELECT lives_ok(
    $$ UPDATE tasks SET title = 'Updated Title' WHERE id = '22222222-2222-2222-2222-222222222222' $$,
    'Team member can update task'
);

-- Test 6: Member Can Insert Task
SELECT lives_ok(
    $$ INSERT INTO tasks (id, root_id, title) VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Member Child Task') $$,
    'Team member can insert task'
);

-- Test 7: Verify Insertion
SELECT is(
    (select count(*) from tasks),
    2::bigint,
    'Team member should see 2 tasks now'
);

SELECT * FROM finish();
ROLLBACK;
