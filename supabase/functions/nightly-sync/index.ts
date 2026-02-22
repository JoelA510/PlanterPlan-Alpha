import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const now = new Date().toISOString();

        // Update tasks that are past due and not complete
        const { data, error } = await supabase
            .from('tasks')
            .update({ status: 'overdue', updated_at: now })
            .lt('due_date', now)
            .neq('status', 'completed')
            .neq('status', 'overdue')
            .select('id');

        if (error) throw error;

        return new Response(
            JSON.stringify({
                success: true,
                message: `Updated ${data.length} tasks to Overdue`,
                updated_ids: data.map(d => d.id)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
    }
})
