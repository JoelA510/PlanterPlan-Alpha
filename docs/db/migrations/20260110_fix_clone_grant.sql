-- Re-define the function to ensure it exists and matches the signature
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

-- Grant permissions (using basic signature matching)
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO service_role;
