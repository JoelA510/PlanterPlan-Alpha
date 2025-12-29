// src/lib/rag/answer.test.ts
import { ragGenerateAnswer } from './answer';
import { supabase } from '../../supabaseClient';

// Mock Supabase
jest.mock('../../supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('ragGenerateAnswer', () => {
  const originalEnv = process.env.REACT_APP_ENABLE_RAG;

  beforeAll(() => {
    process.env.REACT_APP_ENABLE_RAG = 'true';
  });

  afterAll(() => {
    process.env.REACT_APP_ENABLE_RAG = originalEnv;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should invoke the edge function with correct payload', async () => {
    const mockResponse = {
      answer: 'The project is on track [task:123]',
      meta: { task_count: 5, resource_count: 0, chunk_count: 2 },
    };

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const result = await ragGenerateAnswer('proj-1', 'status?');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('rag-answer', {
      body: { projectId: 'proj-1', query: 'status?' },
    });
    expect(result).toEqual(mockResponse);
  });

  it('should throw on function error', async () => {
    const mockError = { message: 'Function failed' };
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(ragGenerateAnswer('proj-1', 'status?')).rejects.toEqual(mockError);
  });
});
