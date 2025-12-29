// src/lib/rag/answer.ts
import { supabase } from '../../supabaseClient';

export type RagAnswerResponse = {
  answer: string;
  meta: {
    task_count: number;
    resource_count: number;
    chunk_count: number;
  };
};

export async function ragGenerateAnswer(
  projectId: string,
  query: string
): Promise<RagAnswerResponse> {
  if (process.env.REACT_APP_ENABLE_RAG !== 'true') {
    console.warn('RAG is disabled. Set REACT_APP_ENABLE_RAG=true in .env to enable.');
    return {
      answer: 'RAG feature is disabled on this environment.',
      meta: { task_count: 0, resource_count: 0, chunk_count: 0 },
    };
  }

  const { data, error } = await supabase.functions.invoke('rag-answer', {
    body: { projectId, query },
  });

  if (error) {
    console.error('Error generating answer:', error);
    throw error;
  }

  return data as RagAnswerResponse;
}
