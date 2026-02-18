import { useInsertMutation, useUpdateMutation, useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query'
import { supabase } from '@/shared/db/client'

export function useCreateTask() {
    return useInsertMutation(
        supabase.from('tasks'),
        ['id'], // Return columns to identify the row
        null,   // Options (e.g. metadata)
    )
}

export function useUpdateTask() {
    return useUpdateMutation(
        supabase.from('tasks'),
        ['id'],
        null
    )
}

export function useDeleteTask() {
    return useDeleteMutation(
        supabase.from('tasks'),
        ['id'],
        null
    )
}
