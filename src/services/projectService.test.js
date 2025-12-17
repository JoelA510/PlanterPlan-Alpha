import { getJoinedProjects } from './projectService';

const createMockClient = (membershipsData, tasksData, memberError = null, taskError = null) => {
  const from = jest.fn((table) => {
    if (table === 'project_members') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: membershipsData, error: memberError }),
        }),
      };
    }
    if (table === 'tasks') {
      const selectMock = {
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: tasksData, error: taskError }),
        }),
      };
      return {
        select: jest.fn().mockReturnValue(selectMock),
      };
    }
    return { select: jest.fn() };
  });

  return { from };
};

describe('getJoinedProjects', () => {
  it('returns joined projects with roles', async () => {
    const mockMemberships = [
      { project_id: 'p1', role: 'editor' },
      { project_id: 'p2', role: 'viewer' },
    ];
    const mockTasks = [
      { id: 'p1', title: 'Project 1' },
      { id: 'p2', title: 'Project 2' },
    ];

    const client = createMockClient(mockMemberships, mockTasks);

    const { data, error } = await getJoinedProjects('user1', client);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('p1');
    expect(data[0].membership_role).toBe('editor');
    expect(data[1].id).toBe('p2');
    expect(data[1].membership_role).toBe('viewer');
  });

  it('returns error when membership fetch fails', async () => {
    const client = createMockClient(null, null, { message: 'DB Error' }, null);

    const { data, error } = await getJoinedProjects('user1', client);

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.message).toBe('DB Error');
  });

  it('returns empty list when no memberships', async () => {
    const client = createMockClient([], []);

    const { data, error } = await getJoinedProjects('user1', client);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
