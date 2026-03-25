import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectPipelineLogic } from './useProjectPipelineLogic';
import { makeTask, makeTeamMember } from '@/test-utils';
import { PROJECT_STATUS } from '@/shared/constants';
import type { Project, Task, TeamMemberRow } from '@/shared/db/app.types';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

describe('useProjectPipelineLogic', () => {
  const projects = [
    makeTask({ id: 'p1', status: PROJECT_STATUS.PLANNING }),
    makeTask({ id: 'p2', status: PROJECT_STATUS.IN_PROGRESS }),
  ] as Project[];

  const tasks = [
    makeTask({ id: 't1', root_id: 'p1' }),
    makeTask({ id: 't2', root_id: 'p2' }),
  ] as Task[];

  const members: TeamMemberRow[] = [
    makeTeamMember({ project_id: 'p1' }),
  ];

  it('bucketizes projects into columns by status', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    const planningCol = result.current.columns.find(
      (c: any) => c.id === PROJECT_STATUS.PLANNING,
    );
    expect(planningCol?.projects).toHaveLength(1);
    expect(planningCol?.projects[0].id).toBe('p1');
  });

  it('groups tasks and members by project', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    expect(result.current.tasksByProjectId['p1']).toHaveLength(1);
    expect(result.current.teamMembersByProjectId['p1']).toHaveLength(1);
  });

  it('handleDragStart sets activeProject', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: 'p1' } } as DragStartEvent);
    });

    expect(result.current.activeProject?.id).toBe('p1');
  });

  it('handleDragEnd calls onStatusChange when status differs', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'p1' },
        over: { id: PROJECT_STATUS.LAUNCHED },
      } as unknown as DragEndEvent);
    });

    expect(onStatusChange).toHaveBeenCalledWith('p1', PROJECT_STATUS.LAUNCHED);
  });

  it('handleDragEnd does NOT call onStatusChange when same status', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'p1' },
        over: { id: PROJECT_STATUS.PLANNING }, // same as p1's current status
      } as unknown as DragEndEvent);
    });

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('handleDragEnd clears activeProject', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectPipelineLogic(projects, tasks, members, onStatusChange),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: 'p1' } } as DragStartEvent);
    });
    expect(result.current.activeProject).not.toBeNull();

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'p1' },
        over: { id: PROJECT_STATUS.LAUNCHED },
      } as unknown as DragEndEvent);
    });

    expect(result.current.activeProject).toBeNull();
  });
});
