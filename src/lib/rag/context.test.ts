// src/lib/rag/context.test.ts
import { ragGetProjectContext } from './context';
import { supabase } from '../../supabaseClient';

// Mock the Supabase client
jest.mock('../../supabaseClient', () => ({
    supabase: {
        rpc: jest.fn(),
    },
}));

describe('ragGetProjectContext', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call rpc with correct parameters and return typed data', async () => {
        const mockData = {
            project_id: 'proj-123',
            tasks: [
                { id: 't1', title: 'Task 1', updated_at: '2023-01-01' }
            ],
            resources: []
        };

        (supabase.rpc as jest.Mock).mockResolvedValue({
            data: mockData,
            error: null,
        });

        const result = await ragGetProjectContext('proj-123');

        expect(supabase.rpc).toHaveBeenCalledWith('rag_get_project_context', {
            p_project_id: 'proj-123',
        });
        expect(result).toEqual(mockData);
    });

    it('should throw error if rpc fails', async () => {
        const mockError = { message: 'RPC Error' };
        (supabase.rpc as jest.Mock).mockResolvedValue({
            data: null,
            error: mockError,
        });

        await expect(ragGetProjectContext('proj-123')).rejects.toEqual(mockError);
    });

    it('should throw if data is not an object', async () => {
        (supabase.rpc as jest.Mock).mockResolvedValue({
            data: "some string",
            error: null,
        });
        await expect(ragGetProjectContext('proj-123')).rejects.toThrow("Invalid RPC payload");
    });
});
