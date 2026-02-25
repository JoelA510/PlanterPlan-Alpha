import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { planter } from '@/shared/api/planterClient';

export function useUserProjects() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['userProjects', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const owned = await planter.entities.Project.listByCreator(user.id);
            const joined = await planter.entities.Project.listJoined(user.id);

            const projectMap = new Map();

            if (owned && Array.isArray(owned)) {
                owned.forEach((p: any) => projectMap.set(p.id, p));
            }

            if (joined && Array.isArray(joined)) {
                joined.forEach((p: any) => projectMap.set(p.id, p));
            }

            return Array.from(projectMap.values());
        },
        enabled: !!user,
    });
}
