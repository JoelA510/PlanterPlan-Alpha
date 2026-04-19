import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/shared/contexts/AuthContext';

/**
 * Updates the user's presence state on the project channel to include the
 * currently-focused task id. Debounced 250ms so rapid open/close/open
 * during navigation doesn't spam the channel.
 *
 * MUST be mounted inside a route that already opened the presence channel
 * (`useProjectPresence` in `src/pages/Project.tsx`). The channel name is
 * reconstructed here from the projectId; both sides must use the same
 * `presence:project:<id>` shape.
 *
 * @param projectId The project's root task id.
 * @param focusedTaskId The task id the user is currently viewing, or null
 *   when the details panel is closed.
 * @returns {void}
 */
export function useTaskFocusBroadcast(projectId: string | null, focusedTaskId: string | null): void {
    const { user } = useAuth();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!projectId || !user) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const channel = supabase.channel(`presence:project:${projectId}`);
            void channel.track({
                user_id: user.id,
                email: user.email,
                // joinedAt is refreshed on every focus change — the sort is
                // by min(joinedAt) per-user so this doesn't affect ordering
                // once multi-tab dedup collapses the rows in useProjectPresence.
                joinedAt: Date.now(),
                focusedTaskId,
            });
        }, 250);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [projectId, user, focusedTaskId]);
}
