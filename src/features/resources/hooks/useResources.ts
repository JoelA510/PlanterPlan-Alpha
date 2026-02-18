import { useQuery, useInsertMutation, useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query'
import { supabase } from '@/shared/db/client'

export function useTaskResources(taskId: string | null) {
    const targetId = taskId ?? '00000000-0000-0000-0000-000000000000'

    const query = supabase
        .from('task_resources')
        .select('*')
        .eq('task_id', targetId)
        .order('created_at', { ascending: false })

    return useQuery(query, {
        enabled: !!taskId
    })
}

export function useAddResource() {
    return useInsertMutation(
        supabase.from('task_resources'),
        ['id'],
        null
    )
}

export function useDeleteResource() {
    return useDeleteMutation(
        supabase.from('task_resources'),
        ['id'],
        null
    )
}
