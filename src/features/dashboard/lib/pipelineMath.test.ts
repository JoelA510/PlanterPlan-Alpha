import { describe, it, expect } from 'vitest';
import { bucketizeProjects, COLUMNS, determineNewStatus } from './pipelineMath';
import { PROJECT_STATUS } from '@/shared/constants';
import type { Project } from '@/shared/db/app.types';

describe('pipelineMath', () => {
  it('correctly bucketizes projects into respective columns', () => {
    const mockProjects: Project[] = [
      { id: '1', title: 'A', status: PROJECT_STATUS.PLANNING },
      { id: '2', title: 'B', status: PROJECT_STATUS.IN_PROGRESS },
      { id: '3', title: 'C', status: PROJECT_STATUS.PLANNING }
    ] as Project[];

    const result = bucketizeProjects(mockProjects, COLUMNS);

    const planningCol = result.find(c => c.id === PROJECT_STATUS.PLANNING);
    expect(planningCol?.projects).toHaveLength(2);
    expect(planningCol?.projects[0].id).toBe('1');
    expect(planningCol?.projects[1].id).toBe('3');

    const inProgressCol = result.find(c => c.id === PROJECT_STATUS.IN_PROGRESS);
    expect(inProgressCol?.projects).toHaveLength(1);
    expect(inProgressCol?.projects[0].id).toBe('2');

    const launchedCol = result.find(c => c.id === PROJECT_STATUS.LAUNCHED);
    expect(launchedCol?.projects).toHaveLength(0);
  });

  it('determines the new status based on drop constraints', () => {
    const mockProjects = [
      { id: 'proj-1', title: 'A', status: PROJECT_STATUS.LAUNCHED }
    ] as Project[];

    // Dropping directly on a column
    expect(determineNewStatus(PROJECT_STATUS.IN_PROGRESS, mockProjects)).toBe(PROJECT_STATUS.IN_PROGRESS);

    // Dropping on another project item inherits that item's column
    expect(determineNewStatus('proj-1', mockProjects)).toBe(PROJECT_STATUS.LAUNCHED);

    // Dropping somewhere invalid
    expect(determineNewStatus('nowhere', mockProjects)).toBeNull();
  });
});
