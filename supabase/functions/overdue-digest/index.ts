import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderOverdueDigestEmail, sendEmail } from '../_shared/email.ts'
import { dispatchOverdueDigest, type DigestEmailSender } from './dispatch.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const emailSender: DigestEmailSender = async (to, subject, html, text) => {
            const result = await sendEmail({ to, subject, html, text })
            return { ok: result.ok, id: result.id, error: result.error }
        }

        // @ts-expect-error the Deno Supabase client has a slightly wider type than the pure helper expects; the runtime contract is identical.
        const summary = await dispatchOverdueDigest(supabase, new Date(), renderOverdueDigestEmail, emailSender)

        return new Response(JSON.stringify({ success: true, ...summary }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[overdue-digest] unhandled error', error)
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
