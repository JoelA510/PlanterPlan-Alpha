
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 2. Parse Request
        const { projectId, email, role } = await req.json();

        if (!projectId || !email) {
            throw new Error("Missing projectId or email");
        }

        // 3. Initialize Supabase Clients
        // Client A: The caller (for permission check)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        if (!supabaseUrl) {
            throw new Error("SUPABASE_URL is not set in environment");
        }

        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!supabaseAnonKey) {
            throw new Error("SUPABASE_ANON_KEY is not set in environment");
        }

        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: authHeader } } }
        );

        // Client B: The Admin (for user lookup & privileged insert)
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!serviceRoleKey) {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment");
        }

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        // 4. Verify Caller Permissions
        // Check if the caller is a member of the project (RLS will handle this if we try to select)
        // Actually, asking the DB via the user's client is safer.
        const { data: membership, error: permError } = await supabaseClient
            .from('project_members')
            .select('role')
            .eq('project_id', projectId)
            .single();

        if (permError || !membership) {
            return new Response(JSON.stringify({ error: "Unauthorized: You are not a member of this project." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Optional: Check if membership.role is 'owner' or 'editor' if we want to enforce strictness
        // For now, any member can invite (or we can rely on RLS logic for generic inserts, but here we use Admin)
        // Let's enforce: Only Owners/Editors can invite.
        if (!['owner', 'editor'].includes(membership.role)) {
            return new Response(JSON.stringify({ error: "Unauthorized: Only Owners and Editors can invite members." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5. Lookup User by Email (Admin Only)
        // Note: listUsers is generally strictly rate limited or paginated. 
        // A better approach for specific email lookup might be to assume strict match.
        // However, Supabase Admin API doesn't have a simple "getByEmail" without listing.
        // actually, admin.listUsers() supports filters? No, mostly pagination.
        // Wait, createClient... admin.auth.admin.listUsers()

        // Attempt to lookup
        // If we can't search by email efficiently, we might have to rely on the fact that we can't 
        // simply "get" a user ID from email easily without leaking info if we aren't careful.
        // BUT, we are the admin here.

        // Currently, listUsers doesn't support filtering by email in v2 API effectively without fetching.
        // Actually, there is `getUserById` but not `getUserByEmail` exposed cleanly in some versions.
        // Let's try `admin.listUsers` and scan? No, that's bad for scale.
        // 
        // Correction: supabase-js v2 admin.listUsers() does NOT explicitly filter by email in the JS client params usually.
        // BUT! `generateLink` or `inviteUserByEmail` works.
        //
        // WAIT! If the user exists, we just want their ID.
        // We can try `supabaseAdmin.rpc('get_user_id_by_email', { email })` if we wrote an RPC?
        // No, we want to avoid extra migrations if possible.

        // Let's check if the standard Admin API allows specific user retrieval.
        // `supabaseAdmin.auth.admin.listUsers()` is the standard.
        // If the project is small, it's fine. If large, bad.

        // Alternative: We try to INVITE them.
        // `supabaseAdmin.auth.admin.inviteUserByEmail(email)`
        // If they exist, it *might*) return their user object?
        // Or `createUser` with email?

        // Let's stick to the simplest correct path for now.
        // We will use a PostgreSQL query on `auth.users` via the service role client? 
        // No, standard client can't query `auth` schema directly usually.
        // UNLESS we use the service role key which bypasses RLS? 
        // The service role CAN query `auth.users` if we mapped it, but `auth` schema is usually protected.
        // Usually `auth` schema is NOT exposed to Postgrest.

        // Best Approach:
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

        if (inviteError) {
            console.error("Invite Error", inviteError);
            throw inviteError;
        }

        if (!inviteData || !inviteData.user) {
            throw new Error("Failed to resolve user from invite.");
        }

        const targetUserId = inviteData.user.id;

        // 6. Insert into Project Members
        // Use upsert to handle re-invites harmlessly
        const { error: insertError } = await supabaseAdmin
            .from('project_members')
            .upsert({
                project_id: projectId,
                user_id: targetUserId,
                role: role || 'viewer'
            });

        if (insertError) {
            throw insertError;
        }

        return new Response(JSON.stringify({
            message: "Invite sent successfully",
            user: { id: targetUserId, email }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
