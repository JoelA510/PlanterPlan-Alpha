import { renderHook } from '@testing-library/react';
import { useTaskOperations } from './useTaskOperations';

jest.mock('../supabaseClient', () => ({
    supabase: {
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], count: 0 }),
        })),
    },
}));

jest.mock('../services/taskService', () => ({
    fetchTaskChildren: jest.fn(),
    deepCloneTask: jest.fn(),
}));

jest.mock('../services/projectService', () => ({
    getUserProjects: jest.fn().mockResolvedValue({ data: [], count: 0 }),
    getJoinedProjects: jest.fn().mockResolvedValue({ data: [] }),
}));

describe('useTaskOperations', () => {
    it('renders without crashing', () => {
        const { result } = renderHook(() => useTaskOperations());
        expect(result.current).toBeDefined();
    });
});
