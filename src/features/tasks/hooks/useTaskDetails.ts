import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { supabase } from '@/shared/db/client'

export function useTaskDetails(taskId: string | null) {
    // Construct query but conditionally enable
    const query = supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId ?? '00000000-0000-0000-0000-000000000000')
        .single()

    return useQuery(query, {
        enabled: !!taskId
    })
}
