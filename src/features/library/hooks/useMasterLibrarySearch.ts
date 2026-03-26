import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

interface UseMasterLibrarySearchProps {
 query?: string;
 enabled?: boolean;
 phasesOnly?: boolean;
}

export const useMasterLibrarySearch = ({
 query = '',
 enabled = true,
 phasesOnly = false,
}: UseMasterLibrarySearchProps = {}) => {
 const { data: allTemplates, isLoading, error } = useQuery({
 queryKey: ['masterLibraryTemplates'],
 queryFn: () => planter.entities.Task.filter({ origin: 'template' }),
 enabled,
 staleTime: 1000 * 60 * 5,
 });

 const trimmed = query.trim().toLowerCase();

 const results = useMemo(() => {
 if (!allTemplates) return [];
 let filtered = allTemplates;
 if (phasesOnly) {
 filtered = filtered.filter((t) => t.parent_task_id && t.parent_task_id === t.root_id);
 }
 if (!trimmed) return filtered;
 return filtered.filter(
 (t) => t.title?.toLowerCase().includes(trimmed) || t.description?.toLowerCase().includes(trimmed)
 );
 }, [allTemplates, trimmed, phasesOnly]);

 return {
 results,
 isLoading,
 error,
 hasResults: results.length > 0,
 };
};

export default useMasterLibrarySearch;
