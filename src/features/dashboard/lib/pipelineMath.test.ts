import { describe, it, expect } from 'vitest';
import {
  COLUMNS,
  bucketizeProjects,
  groupTasksByProject,
  groupMembersByProject,
  determineNewStatus,
} from './pipelineMath';
import { makeTask, makeTeamMember } from '@/test-utils';
import { PROJECT_STATUS } from '@/shared/constants';
import type { Project, Task, TeamMemberRow } from '@/shared/db/app.types';

// ---------------------------------------------------------------------------
// bucketizeProjects
// ---------------------------------------------------------------------------
describe('bucketizeProjects', () => {
  it('buckets projects by status', () => {
    const projects = [
      makeTask({ id: 'p1', status: PROJECT_STATUS.PLANNING }),
      makeTask({ id: 'p2', status: PROJECT_STATUS.IN_PROGRESS }),
      makeTask({ id: 'p3', status: PROJECT_STATUS.PLANNING }),
    ] as Project[];

    const result = bucketizeProjects(projects, COLUMNS);
    const planningCol = result.find(c => c.id === PROJECT_STATUS.PLANNING)!;
    const inProgressCol = result.find(c => c.id === PROJECT_STATUS.IN_PROGRESS)!;
    expect(planningCol.projects).toHaveLength(2);
    expect(inProgressCol.projects).toHaveLength(1);
  });

  it('defaults missing status to PLANNING', () => {
    const projects = [makeTask({ id: 'p1', status: null })] as Project[];
    const result = bucketizeProjects(projects, COLUMNS);
    const planningCol = result.find(c => c.id === PROJECT_STATUS.PLANNING)!;
    expect(planningCol.projects).toHaveLength(1);
  });

  it('handles empty projects array', () => {
    const result = bucketizeProjects([], COLUMNS);
    result.forEach(col => {
      expect(col.projects).toEqual([]);
    });
  });

  it('puts unknown status in its own bucket (not in predefined columns)', () => {
    const projects = [makeTask({ id: 'p1', status: 'archived' })] as Project[];
    const result = bucketizeProjects(projects, COLUMNS);
    // No column should contain this project since 'archived' is not a defined column
    result.forEach(col => {
      expect(col.projects).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// groupTasksByProject
// ---------------------------------------------------------------------------
describe('groupTasksByProject', () => {
  it('groups tasks by root_id', () => {
    const tasks = [
      makeTask({ id: 't1', root_id: 'proj-a' }),
      makeTask({ id: 't2', root_id: 'proj-b' }),
      makeTask({ id: 't3', root_id: 'proj-a' }),
    ] as Task[];

    const result = groupTasksByProject(tasks);
    expect(result['proj-a']).toHaveLength(2);
    expect(result['proj-b']).toHaveLength(1);
  });

  it('uses "unassigned" for null root_id', () => {
    const tasks = [makeTask({ id: 't1', root_id: null })] as Task[];
    const result = groupTasksByProject(tasks);
    expect(result['unassigned']).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    expect(groupTasksByProject([])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// groupMembersByProject
// ---------------------------------------------------------------------------
describe('groupMembersByProject', () => {
  it('groups members by project_id', () => {
    const members: TeamMemberRow[] = [
      makeTeamMember({ project_id: 'proj-a' }),
      makeTeamMember({ project_id: 'proj-b' }),
      makeTeamMember({ project_id: 'proj-a' }),
    ];

    const result = groupMembersByProject(members);
    expect(result['proj-a']).toHaveLength(2);
    expect(result['proj-b']).toHaveLength(1);
  });

  it('uses "unassigned" for null project_id', () => {
    const members = [makeTeamMember({ project_id: null as unknown as string })];
    const result = groupMembersByProject(members);
    expect(result['unassigned']).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    expect(groupMembersByProject([])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// determineNewStatus
// ---------------------------------------------------------------------------
describe('determineNewStatus', () => {
  const projects = [
    makeTask({ id: 'p1', status: PROJECT_STATUS.IN_PROGRESS }),
    makeTask({ id: 'p2', status: PROJECT_STATUS.LAUNCHED }),
  ] as Project[];

  it('returns column ID when overId matches a status string', () => {
    expect(determineNewStatus(PROJECT_STATUS.PLANNING, projects)).toBe(PROJECT_STATUS.PLANNING);
  });

  it('returns project status when overId matches a project ID', () => {
    expect(determineNewStatus('p1', projects)).toBe(PROJECT_STATUS.IN_PROGRESS);
  });

  it('returns null for numeric overId that does not match', () => {
    expect(determineNewStatus(999, projects)).toBeNull();
  });

  it('returns null for unknown string overId', () => {
    expect(determineNewStatus('unknown-id', projects)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 5d: COLUMNS constant structure
// ---------------------------------------------------------------------------
describe('COLUMNS constant', () => {
  it('has entries for all PROJECT_STATUS values', () => {
    const statusValues = Object.values(PROJECT_STATUS);
    for (const status of statusValues) {
      const col = COLUMNS.find((c: any) => c.id === status);
      expect(col, `Missing column for status: ${status}`).toBeDefined();
      expect(col.title).toBeTruthy();
    }
  });
});
