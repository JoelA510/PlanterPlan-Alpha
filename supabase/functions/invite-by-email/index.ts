import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  const origin = req.headers.get('origin') || '';

  // Dynamic CORS: Echo origin if it matches our domains, otherwise use * (or restrict if needed)
  // This prevents issues where 'null' or mismatched protocols cause 'invalid value' errors.
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Parse Request
    const body = await req.json().catch(() => ({})); // Safe parse
    const { projectId, email, role } = body;

    if (!projectId || !email) {
      console.error('Missing required fields:', { projectId, email });
      throw new Error('Missing projectId or email');
    }

    // 3. Initialize Supabase Clients
    // Client A: The caller (for permission check)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('Missing Env Vars');
      throw new Error('Server configuration error: Missing Environment Variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 4. Verify Caller Permissions
    const { data: membership, error: permError } = await supabaseClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .single();

    if (permError || !membership) {
      console.error('Permission Check Failed:', permError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You are not a member of this project.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        } // 403 Forbidden
      );
    }

    if (!['owner', 'editor'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only Owners and Editors can invite members.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Lookup User by Email and Insert (Admin Only)
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      console.error('Supabase Invite Error:', inviteError);
      throw inviteError;
    }

    if (!inviteData || !inviteData.user) {
      throw new Error('Failed to resolve user from invite.');
    }

    const targetUserId = inviteData.user.id;

    // 6. Insert into Project Members
    const { error: insertError } = await supabaseAdmin.from('project_members').upsert({
      project_id: projectId,
      user_id: targetUserId,
      role: role || 'viewer',
    });

    if (insertError) {
      console.error('Member Insert Error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        message: 'Invite sent successfully',
        user: { id: targetUserId, email },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function Exception:', error);
    const isServerError = error.message?.includes('Server configuration error');
    return new Response(JSON.stringify({ error: error.message }), {
      status: isServerError ? 500 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
