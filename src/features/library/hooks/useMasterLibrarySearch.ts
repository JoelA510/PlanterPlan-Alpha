import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

interface UseMasterLibrarySearchProps {
 query?: string;
 enabled?: boolean;
}

export const useMasterLibrarySearch = ({
 query = '',
 enabled = true,
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
 if (!trimmed) return allTemplates;
 return allTemplates.filter(
 (t) => t.title?.toLowerCase().includes(trimmed) || t.description?.toLowerCase().includes(trimmed)
 );
 }, [allTemplates, trimmed]);

 return {
 results,
 isLoading,
 error,
 hasResults: results.length > 0,
 };
};

export default useMasterLibrarySearch;
