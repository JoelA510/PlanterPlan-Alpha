import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { supabase } from '@/shared/db/client'

// No manual keys needed!

export function useRootTasks() {
    return useQuery(
        supabase
            .from('tasks')
            .select('*')
            .is('parent_task_id', null)
            .order('created_at', { ascending: false })
    )
}

export function useTaskTree(rootId: string | null) {
    // Construct a valid query always, but disable it if rootId is null.
    // We use a dummy ID if null to satisfy the builder constraints if strictly typed, 
    // but supabase-js builder is usually lenient.
    const targetId = rootId ?? '00000000-0000-0000-0000-000000000000'

    const query = supabase
        .from('tasks')
        .select('*')
        .or(`root_id.eq.${targetId},id.eq.${targetId}`)
        .order('position')

    return useQuery(query, {
        enabled: !!rootId
    })
}
