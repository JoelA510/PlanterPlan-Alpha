import { supabase } from '../supabaseClient';

export const getJoinedProjects = async (userId, client = supabase) => {
    try {
        // 1. Get project IDs where the user is a member
        const { data: memberships, error: memberError } = await client
            .from('project_members')
            .select('project_id, role')
            .eq('user_id', userId);

        if (memberError) throw memberError;

        if (!memberships || memberships.length === 0) {
            return [];
        }

        const projectIds = memberships.map((m) => m.project_id);

        // 2. Fetch the actual project tasks
        const { data: projects, error: projectError } = await client
            .from('tasks')
            .select('*')
            .in('id', projectIds)
            .order('updated_at', { ascending: false });

        if (projectError) throw projectError;

        // 3. Merge role info into the project objects for UI display
        return projects.map((project) => {
            const membership = memberships.find((m) => m.project_id === project.id);
            return {
                ...project,
                membership_role: membership?.role || 'viewer',
            };
        });
    } catch (error) {
        console.error('[projectService.getJoinedProjects] Error:', error);
        // Return empty array to avoid crashing UI, but log error
        return [];
    }
};
