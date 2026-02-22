import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { getJoinedProjects, getUserProjects } from '../services/projectService';

export function useUserProjects() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['userProjects', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data: owned } = await getUserProjects(user.id);
            const { data: joined } = await getJoinedProjects(user.id);

            const projectMap = new Map();

            if (owned) {
                owned.forEach(p => projectMap.set(p.id, p));
            }

            if (joined) {
                joined.forEach(p => projectMap.set(p.id, p));
            }

            return Array.from(projectMap.values());
        },
        enabled: !!user,
    });
}
