import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskTree } from './useTaskTree';

// Mock helpers from their new consolidated location
import { separateTasksByOrigin, buildTree } from '@/shared/lib/tree-helpers';

vi.mock('@/shared/lib/tree-helpers', () => ({
 separateTasksByOrigin: vi.fn(),
 buildTree: vi.fn(),
}));

describe('useTaskTree', () => {
 const mockTasks = [
 { id: 'p1', origin: 'instance' },
 { id: 't1', origin: 'template' }
 ];

 beforeEach(() => {
 vi.clearAllMocks();
 separateTasksByOrigin.mockReturnValue({
 instanceTasks: [{ id: 'p1', origin: 'instance' }],
 templateTasks: [{ id: 't1', origin: 'template' }]
 });
 buildTree.mockReturnValue([]);
 });

 it('separates tasks by origin', () => {
 const { result } = renderHook(() => useTaskTree({
 tasks: mockTasks,
 hydratedProjects: {},
 activeProjectId: null
 }));

 expect(result.current.instanceTasks).toHaveLength(1);
 expect(result.current.templateTasks).toHaveLength(1);
 });

 it('identifies active project from instanceTasks', () => {
 const { result } = renderHook(() => useTaskTree({
 tasks: mockTasks,
 hydratedProjects: {},
 activeProjectId: 'p1'
 }));

 expect(result.current.activeProject).toBeDefined();
 expect(result.current.activeProject.id).toBe('p1');
 });

 it('manages expansion state', () => {
 const { result } = renderHook(() => useTaskTree({
 tasks: mockTasks,
 hydratedProjects: {},
 activeProjectId: 'p1'
 }));

 expect(result.current.expandedTaskIds.has('task-1')).toBe(false);

 act(() => {
 result.current.handleToggleExpand({ id: 'task-1' }, true);
 });

 expect(result.current.expandedTaskIds.has('task-1')).toBe(true);

 act(() => {
 result.current.handleToggleExpand({ id: 'task-1' }, false);
 });

 expect(result.current.expandedTaskIds.has('task-1')).toBe(false);
 });
});
