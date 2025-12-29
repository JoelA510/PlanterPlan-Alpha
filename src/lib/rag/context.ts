// src/lib/rag/context.ts
import { supabase } from '../../supabaseClient';

export type RagContext = {
  project_id: string;
  tasks: Array<{
    id: string;
    parent_id: string | null;
    title: string;
    status: string | null;
    notes: string | null;
    updated_at: string;
  }>;
  resources: Array<{
    id: string;
    task_id: string | null;
    type: string;
    title: string | null;
    url: string | null;
    text: string | null;
    updated_at: string;
  }>;
};

// Type guard / Assertion helper
function assertObject(v: unknown): asserts v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) throw new Error('Invalid RPC payload: Not an object');
}

export async function ragGetProjectContext(projectId: string): Promise<RagContext> {
  if (process.env.REACT_APP_ENABLE_RAG !== 'true') {
    // Return empty structure if disabled
    return { project_id: projectId, tasks: [], resources: [] };
  }

  const { data, error } = await supabase.rpc('rag_get_project_context', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching project context:', error);
    throw error;
  }

  // Runtime validation could be more exhaustive (Zod), but strict assumption here matches the contract
  assertObject(data);

  // Cast to type
  return data as RagContext;
}
