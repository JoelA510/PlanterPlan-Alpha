-- Migration: Tech Debt Resolution Phase 1
-- 1. Deep Clone RPC (clone_project_template)
-- 2. Date Rollup Triggers (calc_task_dates)

BEGIN;

-- -------------------------------------------------------------------------
-- 1. RPC: clone_project_template
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clone_project_template(
    p_template_id uuid,
    p_new_parent_id uuid,
    p_new_origin text,
    p_user_id uuid
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

-- -------------------------------------------------------------------------
-- 2. Trigger: Date Rollup (calc_task_dates)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calc_task_date_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_id uuid;
    v_min_start timestamptz;
    v_max_due timestamptz;
BEGIN
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
    -- This UPDATE will recurse because check constraint or logic might change
    -- We use IS DISTINCT FROM to prevent infinite loops if values haven't changed
    UPDATE public.tasks
    SET 
        start_date = v_min_start,
        due_date = v_max_due
    WHERE id = v_parent_id
      AND (start_date IS DISTINCT FROM v_min_start OR due_date IS DISTINCT FROM v_max_due);

    RETURN NULL; -- AFTER trigger
END;
$$;

-- Drop existing if any (Safe re-run)
DROP TRIGGER IF EXISTS trigger_calc_task_dates ON public.tasks;

-- Create Trigger
CREATE TRIGGER trigger_calc_task_dates
AFTER INSERT OR UPDATE OF start_date, due_date, parent_task_id OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.calc_task_date_rollup();

COMMIT;
