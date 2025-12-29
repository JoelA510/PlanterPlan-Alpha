import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Use APP_ORIGIN for production; fallback to localhost for development
const allowedOrigin = Deno.env.get('APP_ORIGIN') || 'http://localhost:3000';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Parse Request
    const { projectId, email, role } = await req.json();

    if (!projectId || !email) {
      throw new Error('Missing projectId or email');
    }

    // 3. Initialize Supabase Clients
    // Client A: The caller (for permission check)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not set in environment');
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is not set in environment');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client B: The Admin (for user lookup & privileged insert)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 4. Verify Caller Permissions
    // Check if the caller is a member of the project (RLS will handle this if we try to select)
    // Actually, asking the DB via the user's client is safer.
    const { data: membership, error: permError } = await supabaseClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .single();

    if (permError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You are not a member of this project.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Optional: Check if membership.role is 'owner' or 'editor' if we want to enforce strictness
    // For now, any member can invite (or we can rely on RLS logic for generic inserts, but here we use Admin)
    // Let's enforce: Only Owners/Editors can invite.
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
    // We use inviteUserByEmail to resolve the user ID safely or send a fresh invite if they don't exist.
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      console.error('Invite Error', inviteError);
      throw inviteError;
    }

    if (!inviteData || !inviteData.user) {
      throw new Error('Failed to resolve user from invite.');
    }

    const targetUserId = inviteData.user.id;

    // 6. Insert into Project Members
    // Use upsert to handle re-invites harmlessly
    const { error: insertError } = await supabaseAdmin.from('project_members').upsert({
      project_id: projectId,
      user_id: targetUserId,
      role: role || 'viewer',
    });

    if (insertError) {
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
    // Differentiate server config errors (500) from client input errors (400)
    const isServerError = error.message?.includes('not set in environment');
    return new Response(JSON.stringify({ error: error.message }), {
      status: isServerError ? 500 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
