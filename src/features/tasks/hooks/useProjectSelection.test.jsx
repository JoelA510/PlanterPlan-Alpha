import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProjectSelection } from './useProjectSelection';

describe('useProjectSelection', () => {
    const mockFetchProjectDetails = vi.fn();

    const instanceTasks = [{ id: 'p1', title: 'P1' }];
    const templateTasks = [];
    const joinedProjects = [];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with null activeProjectId', () => {
        const { result } = renderHook(() => useProjectSelection({
            urlProjectId: null,
            instanceTasks,
            templateTasks,
            joinedProjects,
            hydratedProjects: {},
            fetchProjectDetails: mockFetchProjectDetails,
            loading: false
        }));

        expect(result.current.activeProjectId).toBeNull();
    });

    it('selects project and hydrates if missing', async () => {
        const { result } = renderHook(() => useProjectSelection({
            urlProjectId: null,
            instanceTasks,
            templateTasks,
            joinedProjects,
            hydratedProjects: {},
            fetchProjectDetails: mockFetchProjectDetails,
            loading: false
        }));

        await act(async () => {
            await result.current.handleSelectProject(instanceTasks[0]);
        });

        expect(result.current.activeProjectId).toBe('p1');
        expect(mockFetchProjectDetails).toHaveBeenCalledWith('p1');
    });

    it('syncs from URL', async () => {
        const { result } = renderHook(() => useProjectSelection({
            urlProjectId: 'p1',
            instanceTasks,
            templateTasks,
            joinedProjects,
            hydratedProjects: {},
            fetchProjectDetails: mockFetchProjectDetails,
            loading: false
        }));

        // Expect sync to happen in effect
        await waitFor(() => {
            expect(result.current.activeProjectId).toBe('p1');
        });

        expect(mockFetchProjectDetails).toHaveBeenCalledWith('p1');
    });

    it('does not re-hydrate if already cached', async () => {
        const { result } = renderHook(() => useProjectSelection({
            urlProjectId: null,
            instanceTasks,
            templateTasks,
            joinedProjects,
            hydratedProjects: { 'p1': [] }, // Already cached
            fetchProjectDetails: mockFetchProjectDetails,
            loading: false
        }));

        await act(async () => {
            await result.current.handleSelectProject(instanceTasks[0]);
        });

        expect(result.current.activeProjectId).toBe('p1');
        expect(mockFetchProjectDetails).not.toHaveBeenCalled();
    });
});
