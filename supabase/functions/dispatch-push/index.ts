import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.7'
import { dispatchToUsers, type DispatchBody, type PushSubRow, type SendResult } from './dispatch.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = (await req.json()) as DispatchBody
        if (!body?.user_ids?.length || !body.title || !body.event_type) {
            return new Response(JSON.stringify({ success: false, error: 'missing user_ids/title/event_type' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const publicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY')
        const subject = Deno.env.get('VAPID_SUBJECT')
        if (!privateKey || !publicKey || !subject) {
            console.warn('[dispatch-push] VAPID env missing; short-circuiting to log-only')
            for (const uid of body.user_ids) {
                await supabase.from('notification_log').insert({
                    user_id: uid,
                    channel: 'push',
                    event_type: body.event_type,
                    payload: { title: body.title },
                    error: 'vapid_unconfigured',
                })
            }
            return new Response(JSON.stringify({ success: false, error: 'vapid_unconfigured' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }
        webPush.setVapidDetails(subject, publicKey, privateKey)

        const sender = async (sub: PushSubRow, payload: string): Promise<SendResult> => {
            const result = await webPush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
            )
            return {
                statusCode: result?.statusCode ?? 200,
                headers: (result?.headers ?? {}) as Record<string, string>,
            }
        }

        // @ts-expect-error the Deno Supabase client has a slightly wider type than the pure helper expects; the runtime contract is identical.
        const result = await dispatchToUsers(supabase, body, new Date(), sender)

        return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[dispatch-push] unhandled error', error)
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
