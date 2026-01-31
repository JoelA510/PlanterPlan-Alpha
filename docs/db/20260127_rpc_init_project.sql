-- Migration: 20260127_rpc_init_project.sql
-- Purpose: Move default project structure creation from client-side to server-side RPC to preventing AbortErrors.

CREATE OR REPLACE FUNCTION public.initialize_default_project(
    p_project_id uuid,
    p_creator_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phase_id uuid;
    v_milestone_id uuid;
    v_task_count int := 0;
BEGIN
    -- 1. Discovery Phase
    INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, settings, origin, status, is_premium)
    VALUES (p_project_id, p_project_id, p_creator_id, 1, 'Discovery', 'Assess calling, gather resources, foundation', '{"color": "blue", "icon": "compass"}'::jsonb, 'instance', 'not_started', false)
    RETURNING id INTO v_phase_id;
    
        -- Milestones for Discovery
        -- 1.1 Personal Assessment
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 1, 'Personal Assessment', 'Evaluate your calling and readiness', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            -- Tasks
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Review and complete assessment', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Schedule planning meeting', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

        -- 1.2 Family Preparation
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 2, 'Family Preparation', 'Prepare your family for the journey', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            -- Tasks
            INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, priority, status, origin) VALUES
            (p_project_id, v_milestone_id, p_creator_id, 1, 'Family vision night', 'high', 'not_started', 'instance'),
            (p_project_id, v_milestone_id, p_creator_id, 2, 'Discuss expectations', 'medium', 'not_started', 'instance');
            v_task_count := v_task_count + 2;

        -- 1.3 Resource Gathering
        INSERT INTO public.tasks (root_id, parent_task_id, creator, position, title, description, origin, status)
        VALUES (p_project_id, v_phase_id, p_creator_id, 3, 'Resource Gathering', 'Identify available resources and support', 'instance', 'not_started')
        RETURNING id INTO v_milestone_id;
            -- Tasks
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
    VALUES (p_project_id, p_project_id, p_creator_id, 5, 'Launch', 'Grand opening and initial growth phase', '{"color": "yellow", "icon": "yellow"}'::jsonb, 'instance', 'not_started', false)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.initialize_default_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_default_project(uuid, uuid) TO service_role;
