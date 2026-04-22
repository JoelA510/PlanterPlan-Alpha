// Shared edge-function auth helper.
//
// These dispatcher / cron functions are meant to be invoked by:
//   1. The Supabase scheduler (service-role JWT).
//   2. Other edge functions that already authenticated.
//   3. Ops tooling with the service role key.
//
// They should NOT accept arbitrary `authenticated` JWTs — those users
// could fan out Web Push / email to other users with attacker-controlled
// content (phishing vector under the app's VAPID subject / RESEND domain).
//
// Each function calls `requireServiceRole(req)` at the top of its handler;
// the helper returns a 403 Response if the Authorization header doesn't
// match the SUPABASE_SERVICE_ROLE_KEY, or `null` when the caller is
// authorized (null means "continue").

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const

export function requireServiceRole(req: Request): Response | null {
    const header = req.headers.get('Authorization') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceKey) {
        console.error('[auth] SUPABASE_SERVICE_ROLE_KEY not configured')
        return new Response('Server misconfigured', {
            status: 500,
            headers: corsHeaders,
        })
    }
    if (header !== `Bearer ${serviceKey}`) {
        return new Response('Forbidden', {
            status: 403,
            headers: corsHeaders,
        })
    }
    return null
}
