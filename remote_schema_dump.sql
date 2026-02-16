


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."task_resource_type" AS ENUM (
    'pdf',
    'url',
    'text'
);


ALTER TYPE "public"."task_resource_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calc_task_date_rollup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_parent_id uuid;
    v_min_start timestamptz;
    v_max_due timestamptz;
BEGIN
    -- Recursion Guard to prevent stack overflow
    IF pg_trigger_depth() > 10 THEN
        RETURN NULL;
    END IF;

    -- Determine parent to update
    IF TG_OP = 'DELETE' THEN
        v_parent_id := OLD.parent_task_id;
    ELSE
        v_parent_id := NEW.parent_task_id;
    END IF;

    -- If no parent or parent is null, stop recursion
    IF v_parent_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate Min Start and Max Due from siblings
    SELECT MIN(start_date), MAX(due_date)
    INTO v_min_start, v_max_due
    FROM public.tasks
    WHERE parent_task_id = v_parent_id;

    -- Update Parent
    UPDATE public.tasks
    SET 
        start_date = v_min_start,
        due_date = v_max_due
    WHERE id = v_parent_id
      AND (start_date IS DISTINCT FROM v_min_start OR due_date IS DISTINCT FROM v_max_due);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."calc_task_date_rollup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_phase_unlock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_milestone_id uuid;
    v_phase_id uuid;
    v_incomplete_exists boolean;
BEGIN
    -- Only process completions
    IF NEW.is_complete = false THEN RETURN NULL; END IF;
    IF NEW.parent_task_id IS NULL THEN RETURN NULL; END IF;

    -- 1. Identify Phase ID
    -- Assume we are at Task level (Parent is Milestone)
    v_milestone_id := NEW.parent_task_id;
    SELECT parent_task_id INTO v_phase_id 
    FROM public.tasks 
    WHERE id = v_milestone_id;

    -- If parent of parent is usually NULL (e.g. if NEW was a Milestone), handle gracefully?
    -- In PlanterPlan: Task -> Milestone -> Phase -> Project.
    -- If NEW is Task, then v_milestone_id is Milestone, v_phase_id is Phase.
    
    IF v_phase_id IS NULL THEN
        -- Fallback: Maybe NEW was a Milestone? Then parent is Phase.
        v_phase_id := v_milestone_id;
    END IF;

    -- 2. Check if ANY incomplete tasks remain in this Phase (across all milestones)
    SELECT EXISTS (
        SELECT 1
        FROM public.tasks EndTask
        JOIN public.tasks MidMilestone ON EndTask.parent_task_id = MidMilestone.id
        WHERE MidMilestone.parent_task_id = v_phase_id
          AND EndTask.is_complete = false
    ) INTO v_incomplete_exists;

    -- 3. If Phase Complete -> Unlock Dependent Phases
    IF NOT v_incomplete_exists THEN
        UPDATE public.tasks
        SET is_locked = false
        WHERE prerequisite_phase_id = v_phase_id;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."check_phase_unlock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_project_ownership"("p_id" "uuid", "u_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = p_id
      AND creator = u_id
  );
END;
$$;


ALTER FUNCTION "public"."check_project_ownership"("p_id" "uuid", "u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_root_id uuid;
    v_top_new_id uuid;
    v_tasks_count int;
BEGIN
    -- 1. Create Temp Table for ID Mapping (Task)
    CREATE TEMP TABLE IF NOT EXISTS temp_task_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 2. Create Temp Table for ID Mapping (Resource)
    CREATE TEMP TABLE IF NOT EXISTS temp_res_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 3. Identify all tasks in the subtree
    WITH RECURSIVE subtree AS (
        SELECT id FROM public.tasks WHERE id = p_template_id
        UNION ALL
        SELECT t.id FROM public.tasks t JOIN subtree s ON t.parent_task_id = s.id
    )
    INSERT INTO temp_task_map (old_id, new_id)
    SELECT id, gen_random_uuid() FROM subtree;

    -- Capture new ID of the top node
    SELECT new_id INTO v_top_new_id FROM temp_task_map WHERE old_id = p_template_id;
    
    -- 4. Determine Root ID
    -- If we have a parent, inherit its root. If not, the new top node is the root.
    IF p_new_parent_id IS NULL THEN
        v_new_root_id := v_top_new_id;
    ELSE
        SELECT root_id INTO v_new_root_id FROM public.tasks WHERE id = p_new_parent_id;
        IF v_new_root_id IS NULL THEN
             RAISE EXCEPTION 'Parent task % has no root_id', p_new_parent_id;
        END IF;
    END IF;

    -- 5. Insert New Tasks
    INSERT INTO public.tasks (
        id, parent_task_id, root_id, creator, origin, 
        title, description, status, position, 
        notes, purpose, actions, is_complete, days_from_start, start_date, due_date
    )
    SELECT 
        m.new_id, 
        CASE 
            WHEN t.id = p_template_id THEN p_new_parent_id -- Top node gets new parent
            ELSE mp.new_id  -- Others get mapped parent
        END,
        v_new_root_id,
        p_user_id,
        p_new_origin,
        t.title, t.description, t.status, t.position,
        t.notes, t.purpose, t.actions, false, t.days_from_start, null, null -- Reset dates/completion? Or copy? Keeping implementation logic: Usually reset for templates.
    FROM public.tasks t
    JOIN temp_task_map m ON t.id = m.old_id
    LEFT JOIN temp_task_map mp ON t.parent_task_id = mp.old_id;

    -- 6. Identify Resources to clone
    INSERT INTO temp_res_map (old_id, new_id)
    SELECT r.id, gen_random_uuid()
    FROM public.task_resources r
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 7. Insert New Resources
    INSERT INTO public.task_resources (
        id, task_id, resource_type, resource_url, resource_text, storage_path, storage_bucket
    )
    SELECT 
        rm.new_id,
        tm.new_id,
        r.resource_type, r.resource_url, r.resource_text, r.storage_path, r.storage_bucket
    FROM public.task_resources r
    JOIN temp_res_map rm ON r.id = rm.old_id
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 8. Update Primary Resource Pointers on New Tasks
    UPDATE public.tasks t
    SET primary_resource_id = rm.new_id
    FROM public.tasks original
    JOIN temp_task_map tm ON original.id = tm.old_id
    JOIN temp_res_map rm ON original.primary_resource_id = rm.old_id
    WHERE t.id = tm.new_id;

    -- 9. Return result
    SELECT COUNT(*) INTO v_tasks_count FROM temp_task_map;

    RETURN jsonb_build_object(
        'new_root_id', v_top_new_id,
        'root_project_id', v_new_root_id,
        'tasks_cloned', v_tasks_count
    );
END;
$$;


ALTER FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_root_id uuid;
    v_top_new_id uuid;
    v_tasks_count int;
BEGIN
    -- 1. Create Temp Table for ID Mapping (Task)
    CREATE TEMP TABLE IF NOT EXISTS temp_task_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 2. Create Temp Table for ID Mapping (Resource)
    CREATE TEMP TABLE IF NOT EXISTS temp_res_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 3. Identify all tasks in the subtree
    WITH RECURSIVE subtree AS (
        SELECT id FROM public.tasks WHERE id = p_template_id
        UNION ALL
        SELECT t.id FROM public.tasks t JOIN subtree s ON t.parent_task_id = s.id
    )
    INSERT INTO temp_task_map (old_id, new_id)
    SELECT id, gen_random_uuid() FROM subtree;

    -- Capture new ID of the top node
    SELECT new_id INTO v_top_new_id FROM temp_task_map WHERE old_id = p_template_id;
    
    -- 4. Determine Root ID
    -- If we have a parent, inherit its root. If not, the new top node is the root.
    IF p_new_parent_id IS NULL THEN
        v_new_root_id := v_top_new_id;
    ELSE
        SELECT root_id INTO v_new_root_id FROM public.tasks WHERE id = p_new_parent_id;
        IF v_new_root_id IS NULL THEN
             RAISE EXCEPTION 'Parent task % has no root_id', p_new_parent_id;
        END IF;
    END IF;

    -- 5. Insert New Tasks
    INSERT INTO public.tasks (
        id, parent_task_id, root_id, creator, origin, 
        title, description, status, position, 
        notes, purpose, actions, is_complete, days_from_start, start_date, due_date
    )
    SELECT 
        m.new_id, 
        CASE 
            WHEN t.id = p_template_id THEN p_new_parent_id -- Top node gets new parent
            ELSE mp.new_id  -- Others get mapped parent
        END,
        v_new_root_id,
        p_user_id,
        p_new_origin,
        -- Override Title/Desc for Root if provided
        CASE WHEN t.id = p_template_id AND p_title IS NOT NULL THEN p_title ELSE t.title END,
        CASE WHEN t.id = p_template_id AND p_description IS NOT NULL THEN p_description ELSE t.description END,
        t.status, t.position,
        t.notes, t.purpose, t.actions, false, t.days_from_start, 
        -- Set Dates for Root if provided
        CASE WHEN t.id = p_template_id THEN p_start_date ELSE null END,
        CASE WHEN t.id = p_template_id THEN p_due_date ELSE null END
    FROM public.tasks t
    JOIN temp_task_map m ON t.id = m.old_id
    LEFT JOIN temp_task_map mp ON t.parent_task_id = mp.old_id;

    -- 6. Identify Resources to clone
    INSERT INTO temp_res_map (old_id, new_id)
    SELECT r.id, gen_random_uuid()
    FROM public.task_resources r
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 7. Insert New Resources
    INSERT INTO public.task_resources (
        id, task_id, resource_type, resource_url, resource_text, storage_path, storage_bucket
    )
    SELECT 
        rm.new_id,
        tm.new_id,
        r.resource_type, r.resource_url, r.resource_text, r.storage_path, r.storage_bucket
    FROM public.task_resources r
    JOIN temp_res_map rm ON r.id = rm.old_id
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 8. Update Primary Resource Pointers on New Tasks
    UPDATE public.tasks t
    SET primary_resource_id = rm.new_id
    FROM public.tasks original
    JOIN temp_task_map tm ON original.id = tm.old_id
    JOIN temp_res_map rm ON original.primary_resource_id = rm.old_id
    WHERE t.id = tm.new_id;

    -- 9. Return result
    SELECT COUNT(*) INTO v_tasks_count FROM temp_task_map;

    RETURN jsonb_build_object(
        'new_root_id', v_top_new_id,
        'root_project_id', v_new_root_id,
        'tasks_cloned', v_tasks_count
    );
END;
$$;


ALTER FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text", "p_description" "text", "p_start_date" "date", "p_due_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

DECLARE
    v_new_root_id uuid;
    v_top_new_id uuid;
    v_tasks_count int;
BEGIN
    -- 1. Create Temp Table for ID Mapping (Task)
    CREATE TEMP TABLE IF NOT EXISTS temp_task_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 2. Create Temp Table for ID Mapping (Resource)
    CREATE TEMP TABLE IF NOT EXISTS temp_res_map (
        old_id uuid PRIMARY KEY,
        new_id uuid
    ) ON COMMIT DROP;

    -- 3. Identify all tasks in the subtree
    WITH RECURSIVE subtree AS (
        SELECT id FROM public.tasks WHERE id = p_template_id
        UNION ALL
        SELECT t.id FROM public.tasks t JOIN subtree s ON t.parent_task_id = s.id
    )
    INSERT INTO temp_task_map (old_id, new_id)
    SELECT id, gen_random_uuid() FROM subtree;

    -- Capture new ID of the top node
    SELECT new_id INTO v_top_new_id FROM temp_task_map WHERE old_id = p_template_id;
    
    -- 4. Determine Root ID
    -- If we have a parent, inherit its root. If not, the new top node is the root.
    IF p_new_parent_id IS NULL THEN
        v_new_root_id := v_top_new_id;
    ELSE
        SELECT root_id INTO v_new_root_id FROM public.tasks WHERE id = p_new_parent_id;
        IF v_new_root_id IS NULL THEN
             RAISE EXCEPTION 'Parent task % has no root_id', p_new_parent_id;
        END IF;
    END IF;

    -- 5. Insert New Tasks
    INSERT INTO public.tasks (
        id, parent_task_id, root_id, creator, origin, 
        title, description, status, position, 
        notes, purpose, actions, is_complete, days_from_start, start_date, due_date
    )
    SELECT 
        m.new_id, 
        CASE 
            WHEN t.id = p_template_id THEN p_new_parent_id -- Top node gets new parent
            ELSE mp.new_id  -- Others get mapped parent
        END,
        v_new_root_id,
        p_user_id,
        p_new_origin,
        -- Override Title/Desc for Root if provided
        CASE WHEN t.id = p_template_id AND p_title IS NOT NULL THEN p_title ELSE t.title END,
        CASE WHEN t.id = p_template_id AND p_description IS NOT NULL THEN p_description ELSE t.description END,
        t.status, t.position,
        t.notes, t.purpose, t.actions, false, t.days_from_start, 
        -- Set Dates for Root if provided
        CASE WHEN t.id = p_template_id THEN p_start_date ELSE null END,
        CASE WHEN t.id = p_template_id THEN p_due_date ELSE null END
    FROM public.tasks t
    JOIN temp_task_map m ON t.id = m.old_id
    LEFT JOIN temp_task_map mp ON t.parent_task_id = mp.old_id;

    -- 6. Identify Resources to clone
    INSERT INTO temp_res_map (old_id, new_id)
    SELECT r.id, gen_random_uuid()
    FROM public.task_resources r
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 7. Insert New Resources
    INSERT INTO public.task_resources (
        id, task_id, resource_type, resource_url, resource_text, storage_path, storage_bucket
    )
    SELECT 
        rm.new_id,
        tm.new_id,
        r.resource_type, r.resource_url, r.resource_text, r.storage_path, r.storage_bucket
    FROM public.task_resources r
    JOIN temp_res_map rm ON r.id = rm.old_id
    JOIN temp_task_map tm ON r.task_id = tm.old_id;

    -- 8. Update Primary Resource Pointers on New Tasks
    UPDATE public.tasks t
    SET primary_resource_id = rm.new_id
    FROM public.tasks original
    JOIN temp_task_map tm ON original.id = tm.old_id
    JOIN temp_res_map rm ON original.primary_resource_id = rm.old_id
    WHERE t.id = tm.new_id;

    -- 9. Return result
    SELECT COUNT(*) INTO v_tasks_count FROM temp_task_map;

    RETURN jsonb_build_object(
        'new_root_id', v_top_new_id,
        'root_project_id', v_new_root_id,
        'tasks_cloned', v_tasks_count
    );
END;
$$;


ALTER FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text", "p_description" "text", "p_start_date" timestamp with time zone, "p_due_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_create_project"("p_title" "text", "p_creator_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_project_id uuid;
    v_user_role text;
    v_is_admin boolean;
BEGIN
    -- Log context
    RAISE NOTICE 'Debug Create Project: Auth UID: %, Role: %', auth.uid(), auth.role();
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_creator_id) THEN
        RETURN jsonb_build_object('error', 'User not found', 'details', p_creator_id);
    END IF;

    -- Attempt Insert (Simulating Client Insert but from PLPGSQL)
    -- Note: RLS applies to the current user. SECURITY DEFINER changes current user to owner.
    -- To test RLS, we should NOT use SECURITY DEFINER, or we should SET ROLE.
    -- But we can't easily SET ROLE to a UUID in generic Postgres without setup.
    -- Supabase uses `request.jwt.claim.sub` for auth.uid().

    -- Instead, let's just inspect the pre-conditions that the RLS policy checks.
    
    SELECT role INTO v_user_role FROM auth.users WHERE id = p_creator_id; -- Not the claim role, but table role? No, auth.role() is from JWT.

    v_is_admin := public.is_admin(p_creator_id);

    -- Check if there's any existing project member role (should be null)
    -- ...

    -- Return diagnostic info
    RETURN jsonb_build_object(
        'auth_uid', auth.uid(),
        'auth_role', auth.role(),
        'target_creator', p_creator_id,
        'is_admin', v_is_admin,
        'policy_insert_check', (
            auth.role() = 'authenticated' AND 
            p_creator_id = auth.uid()
        )
    );
END;
$$;


ALTER FUNCTION "public"."debug_create_project"("p_title" "text", "p_creator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_details"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite public.project_invites%ROWTYPE;
  v_project_title text;
BEGIN
  -- 1. Find the invite
  SELECT * INTO v_invite
  FROM public.project_invites
  WHERE token = p_token
  AND expires_at > now();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- 2. Get Project Title (Securely, bypassing RLS via SECURITY DEFINER)
  SELECT title INTO v_project_title
  FROM public.tasks
  WHERE id = v_invite.project_id;

  -- 3. Return safe details
  RETURN jsonb_build_object(
    'email', v_invite.email,
    'role', v_invite.role,
    'project_id', v_invite.project_id,
    'project_title', v_project_title
  );
END;
$$;


ALTER FUNCTION "public"."get_invite_details"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_task_root_id"("p_task_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_root_id uuid;
BEGIN
  -- Use a distinct variable and table alias to guarantee no ambiguity.
  SELECT t.root_id INTO v_root_id
  FROM public.tasks t
  WHERE t.id = p_task_id;

  RETURN v_root_id;
END;
$$;


ALTER FUNCTION "public"."get_task_root_id"("p_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("email" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select id from auth.users where email = $1;
$_$;


ALTER FUNCTION "public"."get_user_id_by_email"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_phase_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_next_task_id uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT id INTO v_next_task_id
    FROM public.tasks
    WHERE parent_task_id = NEW.parent_task_id
      AND position > NEW.position
    ORDER BY position ASC
    LIMIT 1;

    IF v_next_task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET is_locked = false
      WHERE id = v_next_task_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_phase_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_project_role"("pid" "uuid", "uid" "uuid", "allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = pid
        AND user_id = uid
        AND role = ANY(allowed_roles)
    );
END;
$$;


ALTER FUNCTION "public"."has_project_role"("pid" "uuid", "uid" "uuid", "allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_default_project"("p_project_id" "uuid", "p_creator_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_phase_id uuid;
    v_milestone_id uuid;
    v_task_count int := 0;
BEGIN
    -- 0. PRE-FLIGHT: Security Check
    IF auth.uid() <> p_creator_id THEN
        RAISE EXCEPTION 'Access Denied: You can only create projects for yourself.';
    END IF;

    -- 0. CRITICAL: Security Bootstrap
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, p_creator_id, 'owner')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 1. Discovery Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 1, 'Discovery', 'Assess calling, gather resources, foundation', '{"color": "blue", "icon": "compass"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
    
        -- Milestones for Discovery
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 1, 'Personal Assessment', 'Evaluate your calling and readiness', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Review and complete assessment', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Schedule planning meeting', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 2, 'Family Preparation', 'Prepare your family for the journey', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Family vision night', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Discuss expectations', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 3, 'Resource Gathering', 'Identify available resources and support', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'List potential partners', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Research planting grants', 'medium', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 3, 'Create budget draft', 'high', 'not_started', 'instance');
            v_task_count := v_task_count + 3;

    -- 2. Planning Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 2, 'Planning', 'Develop strategy, vision, and initial team', '{"color": "purple", "icon": "map"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;

        -- Milestones for Planning
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 1, 'Vision Development', 'Clarify your vision and mission', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Write vision statement', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Define core values', 'high', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 2, 'Strategic Planning', 'Develop your launch strategy', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Demographic study', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Define target audience', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;
            
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 3, 'Core Team Building', 'Recruit and develop your core team', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Host interest meetings', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Start small group', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

    -- 3. Preparation Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 3, 'Preparation', 'Build systems, recruit team, prepare for launch', '{"color": "orange", "icon": "wrench"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
        
        -- Milestones
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 1, 'Systems Setup', 'Establish operational systems', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Select ChMS', 'medium', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Setup bank account', 'high', 'not_started', 'instance');
             v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 2, 'Facility Planning', 'Secure meeting location', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Visit potential venues', 'high', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Sign lease/agreement', 'high', 'not_started', 'instance');
             v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 3, 'Ministry Development', 'Develop key ministry areas', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Kids ministry strategy', 'medium', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Worship team auditions', 'medium', 'not_started', 'instance');
             v_task_count := v_task_count + 2;

    -- 4. Pre-Launch Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 4, 'Pre-Launch', 'Final preparations, preview services, marketing', '{"color": "green", "icon": "rocket"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
        
        -- Milestones
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 1, 'Preview Services', 'Host preview gatherings', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Plan first preview service', 'high', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Debrief preview service', 'medium', 'not_started', 'instance');
             v_task_count := v_task_count + 2;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 2, 'Marketing Launch', 'Begin community outreach', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Launch social media ads', 'medium', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Send mailers', 'medium', 'not_started', 'instance');
             v_task_count := v_task_count + 2;
             
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 3, 'Final Preparations', 'Complete all launch requirements', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
             (p_project_id, v_milestone_id, p_creator_id, 1, 'Order connection cards', 'high', 'not_started', 'instance'),
             (p_project_id, v_milestone_id, p_creator_id, 2, 'Finalize volunteer schedule', 'high', 'not_started', 'instance');
             v_task_count := v_task_count + 2;

    -- 5. Launch Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 5, 'Launch', 'Grand opening and initial growth phase', '{"color": "yellow", "icon": "zap"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
        -- Milestones
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 1, 'Launch Week', 'Execute your launch plan', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
             INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES (p_project_id, v_milestone_id, p_creator_id, 1, 'Launch Sunday!', 'high', 'not_started', 'instance');
             v_task_count := v_task_count + 1;

        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 2, 'First Month', 'Establish weekly rhythms', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 3, 'Guest Follow-up', 'Connect with visitors', 'instance', 'not_started') RETURNING id INTO v_milestone_id;

    -- 6. Growth Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 6, 'Growth', 'Establish systems, develop leaders, expand reach', '{"color": "pink", "icon": "trending-up"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
        -- Milestones
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 1, 'Leadership Development', 'Train and empower leaders', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 2, 'Ministry Expansion', 'Launch additional ministries', 'instance', 'not_started') RETURNING id INTO v_milestone_id;
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status) VALUES 
        (p_project_id, v_phase_id, p_creator_id, 3, 'Future Planning', 'Plan for multiplication', 'instance', 'not_started') RETURNING id INTO v_milestone_id;


    RETURN jsonb_build_object(
        'success', true,
        'project_id', p_project_id,
        'tasks_created', v_task_count
    );
END;
$$;


ALTER FUNCTION "public"."initialize_default_project"("p_project_id" "uuid", "p_creator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_user_to_project"("p_project_id" "uuid", "p_email" "text", "p_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_invite_id uuid;
  v_token uuid;
BEGIN
  IF NOT public.has_project_role(p_project_id, auth.uid(), ARRAY['owner', 'editor']) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You must be an owner or editor to invite members.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object(
      'status', 'added',
      'user_id', v_user_id
    );
  ELSE
    INSERT INTO public.project_invites (project_id, email, role)
    VALUES (p_project_id, p_email, p_role)
    ON CONFLICT (project_id, email) DO UPDATE
    SET role = EXCLUDED.role, expires_at = (now() + interval '7 days')
    RETURNING id, token INTO v_invite_id, v_token;

    RETURN jsonb_build_object(
      'status', 'invited',
      'invite_id', v_invite_id,
      'token', v_token
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."invite_user_to_project"("p_project_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_member"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_active_member"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check admin_users table for intentional admin grants
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rag_get_project_context"("p_project_id" "uuid", "p_limit" integer DEFAULT 200) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'project_id', p_project_id,
    'tasks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'parent_id', t.parent_task_id, 
        'title', t.title,
        'status', t.status,
        'notes', t.notes,
        'updated_at', t.updated_at
      ) order by t.updated_at desc), '[]'::jsonb)
      from public.tasks t
      where t.root_id = p_project_id 
      limit p_limit
    ),
    'resources', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'task_id', r.task_id,
        'type', r.resource_type,
        'title', r.resource_text, 
        'url', r.resource_url,
        'text', r.resource_text,
        'updated_at', r.created_at 
      ) order by r.created_at desc), '[]'::jsonb)
      from public.task_resources r
      join public.tasks t on r.task_id = t.id
      where t.root_id = p_project_id 
      limit p_limit
    )
  );
$$;


ALTER FUNCTION "public"."rag_get_project_context"("p_project_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "text"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "role" "text" DEFAULT 'Volunteer'::"text",
    "status" "text" DEFAULT 'New'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "people_status_check" CHECK (("status" = ANY (ARRAY['New'::"text", 'Contacted'::"text", 'Meeting Scheduled'::"text", 'Joined'::"text", 'Not Interested'::"text"])))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    CONSTRAINT "project_invites_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"])))
);


ALTER TABLE "public"."project_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "resource_id" "uuid",
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "embedding" "public"."vector"(1536),
    "fts" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", "content")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rag_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "from_task_id" "uuid",
    "to_task_id" "uuid",
    "type" "text" DEFAULT 'relates_to'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_relationships_type_check" CHECK (("type" = ANY (ARRAY['blocks'::"text", 'relates_to'::"text", 'duplicates'::"text"])))
);


ALTER TABLE "public"."task_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "resource_type" "public"."task_resource_type" NOT NULL,
    "resource_url" "text",
    "resource_text" "text",
    "storage_bucket" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_resources_type_payload_check" CHECK (((("resource_type" = 'url'::"public"."task_resource_type") AND ("resource_url" IS NOT NULL) AND ("resource_text" IS NULL) AND ("storage_path" IS NULL)) OR (("resource_type" = 'text'::"public"."task_resource_type") AND ("resource_text" IS NOT NULL) AND ("resource_url" IS NULL) AND ("storage_path" IS NULL)) OR (("resource_type" = 'pdf'::"public"."task_resource_type") AND ("storage_path" IS NOT NULL) AND ("resource_url" IS NULL) AND ("resource_text" IS NULL))))
);


ALTER TABLE "public"."task_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_task_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'todo'::"text",
    "origin" "text" DEFAULT 'instance'::"text",
    "creator" "uuid",
    "root_id" "uuid",
    "notes" "text",
    "days_from_start" integer DEFAULT 0,
    "start_date" timestamp with time zone,
    "due_date" timestamp with time zone,
    "position" bigint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "purpose" "text",
    "actions" "text",
    "is_complete" boolean DEFAULT false,
    "primary_resource_id" "uuid",
    "is_locked" boolean DEFAULT false,
    "prerequisite_phase_id" "uuid",
    "parent_project_id" "uuid",
    "project_type" "text" DEFAULT 'primary'::"text",
    "assignee_id" "uuid",
    "is_premium" boolean DEFAULT false,
    "location" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "tasks_project_type_check" CHECK (("project_type" = ANY (ARRAY['primary'::"text", 'secondary'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Tasks table. Resources are now in task_resources table.';



COMMENT ON COLUMN "public"."tasks"."settings" IS 'Project-level settings (e.g., due_soon_threshold, location_defaults)';



CREATE OR REPLACE VIEW "public"."tasks_with_primary_resource" AS
 SELECT "t"."id",
    "t"."parent_task_id",
    "t"."title",
    "t"."description",
    "t"."status",
    "t"."origin",
    "t"."creator",
    "t"."root_id",
    "t"."notes",
    "t"."days_from_start",
    "t"."start_date",
    "t"."due_date",
    "t"."position",
    "t"."created_at",
    "t"."updated_at",
    "t"."purpose",
    "t"."actions",
    "t"."is_complete",
    "t"."primary_resource_id",
    "t"."is_locked",
    "t"."prerequisite_phase_id",
    "t"."parent_project_id",
    "t"."project_type",
    "t"."assignee_id",
    "t"."is_premium",
    "t"."location",
    "t"."priority",
    "t"."settings",
    NULL::"uuid" AS "resource_id",
    NULL::"text" AS "resource_type",
    NULL::"text" AS "resource_url",
    NULL::"text" AS "resource_text",
    NULL::"text" AS "storage_path",
    NULL::"text" AS "resource_name"
   FROM "public"."tasks" "t";


ALTER TABLE "public"."tasks_with_primary_resource" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_master_library" AS
 SELECT "t"."id",
    "t"."parent_task_id",
    "t"."title",
    "t"."description",
    "t"."status",
    "t"."origin",
    "t"."creator",
    "t"."root_id",
    "t"."notes",
    "t"."days_from_start",
    "t"."start_date",
    "t"."due_date",
    "t"."position",
    "t"."created_at",
    "t"."updated_at",
    "t"."purpose",
    "t"."actions",
    "t"."is_complete",
    "t"."primary_resource_id",
    "t"."primary_resource_id" AS "resource_id"
   FROM "public"."tasks" "t"
  WHERE ("t"."origin" = 'template'::"text");


ALTER TABLE "public"."view_master_library" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_invites"
    ADD CONSTRAINT "project_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."rag_chunks"
    ADD CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_relationships"
    ADD CONSTRAINT "task_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_invites"
    ADD CONSTRAINT "unique_invite_per_project" UNIQUE ("project_id", "email");



ALTER TABLE ONLY "public"."task_relationships"
    ADD CONSTRAINT "unique_relationship" UNIQUE ("from_task_id", "to_task_id", "type");



CREATE INDEX "idx_members_project" ON "public"."project_members" USING "btree" ("project_id");



CREATE INDEX "idx_members_user" ON "public"."project_members" USING "btree" ("user_id");



CREATE INDEX "idx_people_project_id" ON "public"."people" USING "btree" ("project_id");



CREATE INDEX "idx_task_resources_task_id" ON "public"."task_resources" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_assignee_id" ON "public"."tasks" USING "btree" ("assignee_id");



CREATE INDEX "idx_tasks_creator" ON "public"."tasks" USING "btree" ("creator");



CREATE INDEX "idx_tasks_creator_origin_parent_position" ON "public"."tasks" USING "btree" ("creator", "origin", "parent_task_id", "position");



CREATE INDEX "idx_tasks_is_complete" ON "public"."tasks" USING "btree" ("is_complete");



CREATE INDEX "idx_tasks_is_locked" ON "public"."tasks" USING "btree" ("is_locked");



CREATE INDEX "idx_tasks_is_premium" ON "public"."tasks" USING "btree" ("is_premium");



CREATE INDEX "idx_tasks_parent" ON "public"."tasks" USING "btree" ("parent_task_id");



CREATE INDEX "idx_tasks_parent_id" ON "public"."tasks" USING "btree" ("parent_task_id");



CREATE INDEX "idx_tasks_root" ON "public"."tasks" USING "btree" ("root_id");



CREATE INDEX "idx_tasks_root_id" ON "public"."tasks" USING "btree" ("root_id");



CREATE INDEX "rag_chunks_fts_idx" ON "public"."rag_chunks" USING "gin" ("fts");



CREATE INDEX "rag_chunks_project_id_idx" ON "public"."rag_chunks" USING "btree" ("project_id");



CREATE INDEX "rag_chunks_resource_id_idx" ON "public"."rag_chunks" USING "btree" ("resource_id");



CREATE INDEX "rag_chunks_task_id_idx" ON "public"."rag_chunks" USING "btree" ("task_id");



CREATE INDEX "task_resources_task_id_idx" ON "public"."task_resources" USING "btree" ("task_id");



CREATE INDEX "task_resources_type_idx" ON "public"."task_resources" USING "btree" ("resource_type");



CREATE OR REPLACE TRIGGER "trg_people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_unlock_next_phase" AFTER UPDATE OF "status" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_phase_completion"();



CREATE OR REPLACE TRIGGER "trigger_calc_task_dates" AFTER INSERT OR DELETE OR UPDATE OF "start_date", "due_date", "parent_task_id" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."calc_task_date_rollup"();



CREATE OR REPLACE TRIGGER "trigger_phase_unlock" AFTER UPDATE OF "is_complete" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."check_phase_unlock"();



CREATE OR REPLACE TRIGGER "trigger_tasks_set_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invites"
    ADD CONSTRAINT "project_invites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_chunks"
    ADD CONSTRAINT "rag_chunks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."task_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_chunks"
    ADD CONSTRAINT "rag_chunks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_relationships"
    ADD CONSTRAINT "task_relationships_from_task_id_fkey" FOREIGN KEY ("from_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_relationships"
    ADD CONSTRAINT "task_relationships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_relationships"
    ADD CONSTRAINT "task_relationships_to_task_id_fkey" FOREIGN KEY ("to_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_creator_fkey" FOREIGN KEY ("creator") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_project_id_fkey" FOREIGN KEY ("parent_project_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_prerequisite_phase_id_fkey" FOREIGN KEY ("prerequisite_phase_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_primary_resource_id_fkey" FOREIGN KEY ("primary_resource_id") REFERENCES "public"."task_resources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



CREATE POLICY "Allow project creation" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (((("root_id" IS NULL) OR ("root_id" = "id")) AND ("parent_task_id" IS NULL) AND ("creator" = "auth"."uid"())));



CREATE POLICY "Allow subtask creation by members" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK ((("root_id" IS NOT NULL) AND "public"."has_project_role"("root_id", "auth"."uid"(), ARRAY['owner'::"text", 'editor'::"text"])));



CREATE POLICY "Create invites for project members" ON "public"."project_invites" FOR INSERT WITH CHECK (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Delete invites for project members" ON "public"."project_invites" FOR DELETE USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable all for authenticated users" ON "public"."project_members" USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable delete for users" ON "public"."tasks" FOR DELETE USING ((("creator" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_project_role"(COALESCE("root_id", "id"), ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"])));



CREATE POLICY "Enable read access for all users" ON "public"."tasks" FOR SELECT USING ((("creator" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_project_role"(COALESCE("root_id", "id"), ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"]) OR ("origin" = 'template'::"text") OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable update for users" ON "public"."tasks" FOR UPDATE USING (((("creator" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_project_role"(COALESCE("root_id", "id"), ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"])) AND (("origin" IS DISTINCT FROM 'template'::"text") OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Manage people for owners and editors" ON "public"."people" USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Manage relationships" ON "public"."task_relationships" USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Manage resources" ON "public"."task_resources" USING (((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_resources"."task_id") AND (("t"."creator" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_project_role"(COALESCE("t"."root_id", "t"."id"), ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]))))) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Project members can delete chunks" ON "public"."rag_chunks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "rag_chunks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Project members can insert chunks" ON "public"."rag_chunks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "rag_chunks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Project members can read chunks" ON "public"."rag_chunks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "rag_chunks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Project members can update chunks" ON "public"."rag_chunks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "rag_chunks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public Read Templates" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("origin" = 'template'::"text"));



CREATE POLICY "View invites for project members" ON "public"."project_invites" FOR SELECT USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "View people for project members" ON "public"."people" FOR SELECT USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "View project members" ON "public"."project_members" FOR SELECT USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "View relationships" ON "public"."task_relationships" FOR SELECT USING (("public"."has_project_role"("project_id", ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"]) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "View resources" ON "public"."task_resources" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_resources"."task_id") AND (("t"."creator" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_project_role"(COALESCE("t"."root_id", "t"."id"), ( SELECT "auth"."uid"() AS "uid"), ARRAY['owner'::"text", 'editor'::"text", 'coach'::"text", 'viewer'::"text", 'limited'::"text"]))))) OR "public"."is_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_delete_policy" ON "public"."project_members" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."check_project_ownership"("project_id", "auth"."uid"()) OR ("project_id" IN ( SELECT "project_members_1"."project_id"
   FROM "public"."project_members" "project_members_1"
  WHERE (("project_members_1"."user_id" = "auth"."uid"()) AND ("project_members_1"."role" = 'owner'::"text"))))));



CREATE POLICY "members_insert_policy" ON "public"."project_members" FOR INSERT WITH CHECK (("public"."check_project_ownership"("project_id", "auth"."uid"()) OR ("project_id" IN ( SELECT "project_members_1"."project_id"
   FROM "public"."project_members" "project_members_1"
  WHERE (("project_members_1"."user_id" = "auth"."uid"()) AND ("project_members_1"."role" = 'owner'::"text"))))));



CREATE POLICY "members_select_policy" ON "public"."project_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_active_member"("project_id", "auth"."uid"()) OR "public"."check_project_ownership"("project_id", "auth"."uid"())));



CREATE POLICY "members_update_policy" ON "public"."project_members" FOR UPDATE USING (("public"."check_project_ownership"("project_id", "auth"."uid"()) OR ("project_id" IN ( SELECT "project_members_1"."project_id"
   FROM "public"."project_members" "project_members_1"
  WHERE (("project_members_1"."user_id" = "auth"."uid"()) AND ("project_members_1"."role" = 'owner'::"text")))))) WITH CHECK ((("user_id" <> "auth"."uid"()) OR ("role" <> 'viewer'::"text")));



ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rag_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


































































































































































REVOKE ALL ON FUNCTION "public"."check_project_ownership"("p_id" "uuid", "u_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_project_ownership"("p_id" "uuid", "u_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text", "p_description" "text", "p_start_date" timestamp with time zone, "p_due_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."clone_project_template"("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid", "p_title" "text", "p_description" "text", "p_start_date" timestamp with time zone, "p_due_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invite_details"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invite_details"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invite_details"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_task_root_id"("p_task_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_task_root_id"("p_task_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_default_project"("p_project_id" "uuid", "p_creator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_default_project"("p_project_id" "uuid", "p_creator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_user_to_project"("p_project_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_user_to_project"("p_project_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_member"("p_project_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_member"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_member"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "service_role";



























GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."project_members" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."task_resources" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."task_resources" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tasks" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tasks" TO "service_role";



GRANT SELECT ON TABLE "public"."tasks_with_primary_resource" TO "authenticated";
GRANT SELECT ON TABLE "public"."tasks_with_primary_resource" TO "anon";
GRANT SELECT ON TABLE "public"."tasks_with_primary_resource" TO "service_role";



GRANT SELECT ON TABLE "public"."view_master_library" TO "authenticated";
GRANT SELECT ON TABLE "public"."view_master_library" TO "anon";
GRANT SELECT ON TABLE "public"."view_master_library" TO "service_role";


































