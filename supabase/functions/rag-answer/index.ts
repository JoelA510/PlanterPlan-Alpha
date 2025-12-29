// supabase/functions/rag-answer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { projectId, query } = await req.json();
        if (!projectId || !query) {
            throw new Error("Missing projectId or query");
        }

        // 1. Setup Supabase Client (Service Role not needed if we want to respect user RLS, 
        //    but usually Edge Functions use Service Role for specific overrides. 
        //    Here we use the USER'S token to strictly enforce RLS.)
        // 1. Setup Supabase Client
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
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        // 2. Retrieval Step 1: Structured Context
        const { data: contextData, error: contextError } = await supabaseClient.rpc(
            "rag_get_project_context",
            { p_project_id: projectId, p_limit: 20 }
        );
        if (contextError) throw contextError;

        // 3. Retrieval Step 2: Unstructured Chunks (FTS)
        // Simple implementation: websearch_to_tsquery for better natural language handling
        const { data: chunkData, error: chunkError } = await supabaseClient
            .from("rag_chunks")
            .select("content, task_id, resource_id")
            .eq("project_id", projectId)
            .textSearch("fts", query, { type: "websearch", config: "english" })
            .limit(5);

        if (chunkError) {
            console.error("Chunk fetch error", chunkError);
            // Continue without chunks if error, or throw? simpler to continue with partial data
        }

        // 4. Construct Prompt
        const tasks = contextData?.tasks || [];
        const resources = contextData?.resources || [];
        const chunks = chunkData || [];

        const systemPrompt = `
You are an AI assistant for the PlanterPlan project management app.
Your goal is to answer questions based ONLY on the provided context.

Rules:
1. Retrieval is pre-filtered by project_id. Do not hallucinate data outside this context.
2. If the answer is not in the context, say "Insufficient evidence" and list what is missing.
3. Cite your sources. When using a fact from a task, append [task:ID]. For resources, [resource:ID].
4. Be concise.

Context:
Tasks: ${JSON.stringify(tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status, notes: t.notes })))}
Resources: ${JSON.stringify(resources.map((r: any) => ({ id: r.id, title: r.title, type: r.type })))}
Relevant text chunks: ${JSON.stringify(chunks.map((c: any) => c.content))}
    `;

        // 5. Call LLM (Google Gemini)
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        let answer = "LLM Generation Disabled (Missing Key)";

        if (geminiKey) {
            const fullPrompt = `${systemPrompt}\n\nUser Question: ${query}`;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrompt }] }]
                    })
                }
            );

            const json = await response.json();

            if (json.error) {
                console.error("Gemini Error", json.error);
                throw new Error(json.error.message);
            }

            const candidate = json.candidates?.[0];
            if (candidate?.content?.parts?.[0]?.text) {
                answer = candidate.content.parts[0].text;
            } else {
                answer = "Error: No content returned from Gemini.";
            }
        }

        // 6. Return Result
        return new Response(
            JSON.stringify({
                answer,
                meta: {
                    task_count: tasks.length,
                    resource_count: resources.length,
                    chunk_count: chunks.length
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
