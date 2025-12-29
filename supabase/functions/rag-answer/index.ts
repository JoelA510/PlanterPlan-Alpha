// supabase/functions/rag-answer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const RequestSchema = z.object({
            projectId: z.string().uuid(),
            query: z.string().min(1).max(1000)
        });

        const parseResult = RequestSchema.safeParse(body);
        if (!parseResult.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: parseResult.error.format() }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { projectId, query } = parseResult.data;

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
        const chunks = chunkData ? chunkData.map((c: any) => c.content) : [];

        const { generateSystemPrompt } = await import("./prompt.ts");
        const systemPrompt = generateSystemPrompt(tasks, resources, chunks);

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
