-- Migration: v1.0 Stabilization
-- Date: 2026-02-17
-- Description: Backfill root_id, enforce root_id integrity, and harden invite security.

-- ============================================================================
-- 1. ROOT_ID INTEGRITY
-- ============================================================================

-- Backfill root_id for all descendants (root rows keep root_id as-is/null is fine if they are roots, but usually roots point to themselves or null depending on logic.
-- The plan says: "root rows keep root_id as-is".
-- The recursive query fixes children.

DO $$
BEGIN
    -- Only run if there are tasks with null root_id that have a parent
    IF EXISTS (SELECT 1 FROM public.tasks WHERE v IS NOT NULL AND root_id IS NULL) THEN
        WITH RECURSIVE tree AS (
          SELECT id, parent_task_id, id AS root
          FROM public.tasks
          WHERE parent_task_id IS NULL
          UNION ALL
          SELECT t.id, t.parent_task_id, tree.root
          FROM public.tasks t
          JOIN tree ON t.parent_task_id = tree.id
        )
        UPDATE public.tasks t
        SET root_id = tree.root
        FROM tree
        WHERE t.id = tree.id
          AND t.parent_task_id IS NOT NULL
          AND (t.root_id IS DISTINCT FROM tree.root);
    END IF;
END $$;

-- Trigger: auto-set NEW.root_id from parent (covers inserts + reparenting)
CREATE OR REPLACE FUNCTION public.set_root_id_from_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we are inserting/updating a child (has parent) and no root_id is provided (or we want to force it)
  -- Actually, we should probably FORCE it to match the parent's root_id (or parent's id if parent is root)
  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT COALESCE(root_id, id)
    INTO NEW.root_id
    FROM public.tasks
    WHERE id = NEW.parent_task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_root_id_from_parent ON public.tasks;
CREATE TRIGGER trg_set_root_id_from_parent
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_root_id_from_parent();

-- Constraint: any child must have root_id
-- We check valid/not_valid to avoid breaking if there's still bad data, but we just backfilled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_root_id_required_for_children'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_root_id_required_for_children
      CHECK (parent_task_id IS NULL OR root_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- 2. HARDEN INVITE SECURITY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invite_user_to_project(
  p_project_id uuid,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite_id uuid;
  v_token uuid;
  v_inviter_role text;
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(auth.uid());

  -- Get Inviter's Role
  SELECT role INTO v_inviter_role
  FROM public.project_members
  WHERE project_id = p_project_id
  AND user_id = auth.uid();

  -- 1. Authorization Gate
  IF v_inviter_role NOT IN ('owner', 'editor') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: You must be an owner or editor to invite members.';
  END IF;

  -- 2. Privilege Escalation Check (Editor cannot invite Owner)
  IF v_inviter_role = 'editor' AND p_role = 'owner' THEN
     RAISE EXCEPTION 'Access denied: Editors cannot assign the Owner role.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- Existing User Logic
    
    -- 3. Update Protection (Editor cannot change an existing Owner's role)
    IF v_inviter_role = 'editor' THEN
        IF EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = p_project_id 
            AND user_id = v_user_id 
            AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'Access denied: Editors cannot modify an Owner.';
        END IF;
    END IF;

    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RETURN jsonb_build_object(
      'status', 'added',
      'user_id', v_user_id
    );
  ELSE
    -- Non-existing User (Invite) Logic
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

-- ============================================================================
-- 3. CLONE DATE LOGIC (Phase 3 Fix)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_project_template(
    p_template_id uuid,
    p_new_parent_id uuid,
    p_new_origin text,
    p_user_id uuid,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_due_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
    v_new_root_id uuid;
    v_top_new_id uuid;
    v_tasks_count int;
    v_old_start_date timestamptz;
    v_interval interval;
BEGIN
    -- 0. Get Template Data for Date Math
    SELECT start_date INTO v_old_start_date FROM public.tasks WHERE id = p_template_id;

    -- Calculate Interval Offset if both dates exist
    IF p_start_date IS NOT NULL AND v_old_start_date IS NOT NULL THEN
        -- Calculate difference. casting to date removes time component which is usually safer for "whole day" shifts
        v_interval := (p_start_date::date - v_old_start_date::date) * '1 day'::interval;
    ELSE
        v_interval := '0 days'::interval;
    END IF;

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
        -- Set Dates:
        -- 1. If Root: Use provided p_start_date (or original if null, but usually we want override)
        -- 2. If Child: Shift by v_interval
        CASE 
            WHEN t.id = p_template_id THEN p_start_date 
            WHEN t.start_date IS NOT NULL THEN t.start_date + v_interval
            ELSE null 
        END,
        CASE 
            WHEN t.id = p_template_id THEN p_due_date 
            WHEN t.due_date IS NOT NULL THEN t.due_date + v_interval
            ELSE null 
        END
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
