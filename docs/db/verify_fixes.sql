-- Verification Script for PR #15 Fixes
-- Run this in Supabase SQL Editor. 
-- Ensure you have run `schema.sql` (or applied changes) and `policies.sql` first.

-- 1. Setup (Optional if users exist)
-- Mock Users:
-- U1: Creator/Owner '00000000-0000-0000-0000-000000000001'
-- U2: Attacker/Viewer '00000000-0000-0000-0000-000000000002'
-- U3: Admin '00000000-0000-0000-0000-000000000003'

-- =========================================================================
-- VERIFY SEC-01: Template Visibility
-- Actions: Select templates as U2.
-- Expected: Success (Count > 0)
-- =========================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT count(*) as template_count FROM public.tasks WHERE origin = 'template';

-- =========================================================================
-- VERIFY SEC-02: INSERT Escalation Protection
-- Actions: U2 tries to insert child into U1's project.
-- Expected: FAIL (RLS Violation)
-- =========================================================================
-- Pre-requisite: U1 has a project (P1)
-- INSERT INTO public.tasks (id, title, creator, parent_task_id) VALUES ('...P1...', 'Root P1', '...U1...', NULL); -- Setup if needed
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
-- Try insert child linked to P1
-- INSERT INTO public.tasks (title, parent_task_id, creator) VALUES ('Malicious', '...P1...', '...U2...'); 
-- Result: Should throw Permisson denied or RLS violation exception.

-- =========================================================================
-- VERIFY SEC-03: No Recursion
-- Actions: Insert deep hierarchy (Depth 50) and Select.
-- Expected: Fast, no "infinite recursion" error.
-- =========================================================================
-- DO $$ ... insert loop ... END $$;
-- SELECT * FROM public.tasks WHERE id = '...leaf...';

-- =========================================================================
-- VERIFY BUG-01: Project Visibility
-- Actions: Create project as U1, immediately select it.
-- Expected: Returned row.
-- =========================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
-- INSERT INTO public.tasks (title, creator) VALUES ('New Project', '...U1...') RETURNING id;
-- SELECT * FROM public.tasks WHERE id = '...new_id...';

-- =========================================================================
-- VERIFY ADM-01: Admin Access
-- Actions: U3 (Admin) tries to update a template created by U1.
-- Expected: Success.
-- =========================================================================
-- Mock is_admin to return true for U3
-- UPDATE public.tasks SET title = 'Admin Edited' WHERE origin = 'template'; 
-- Should affect rows.
