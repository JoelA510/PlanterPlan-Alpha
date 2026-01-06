import { getUserProjects, getJoinedProjects, inviteMemberByEmail } from './projectService';

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

describe('getUserProjects', () => {
  it('returns paginated projects', async () => {
    const mockData = [
      { id: '1', title: 'Project 1' },
      { id: '2', title: 'Project 2' },
    ];

    // Mock chain: from -> select -> eq -> eq -> is -> order -> range
    const rangeMock = jest.fn().mockResolvedValue({ data: mockData, count: 5, error: null });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const isMock = jest.fn().mockReturnValue({ order: orderMock });
    const eqOriginMock = jest.fn().mockReturnValue({ is: isMock });
    const eqCreatorMock = jest.fn().mockReturnValue({ eq: eqOriginMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqCreatorMock });

    const client = {
      from: jest.fn().mockReturnValue({ select: selectMock }),
    };

    const { data, count, error } = await getUserProjects('user1', 1, 2, client);

    expect(error).toBeNull();
    expect(data).toEqual(mockData);
    expect(count).toBe(5);
    expect(rangeMock).toHaveBeenCalledWith(0, 1); // page 1, size 2 -> 0 to 1
  });

  it('handles database errors', async () => {
    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest
                    .fn()
                    .mockResolvedValue({ data: null, count: 0, error: { message: 'DB Error' } }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const { data, error } = await getUserProjects('user1', 1, 10, client);

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.message).toBe('DB Error');
  });
});

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

describe('inviteMemberByEmail', () => {
  // Import dynamically since it's not exported by default in the test file snippet above,
  it('calls the edge function successfully', async () => {
    const invokeMock = jest.fn().mockResolvedValue({ data: { message: 'Success' }, error: null });
    const client = {
      functions: { invoke: invokeMock },
    };

    const result = await inviteMemberByEmail('p1', 'test@example.com', 'editor', client);

    expect(result.error).toBeNull();
    expect(invokeMock).toHaveBeenCalledWith('invite-by-email', {
      body: { projectId: 'p1', email: 'test@example.com', role: 'editor' },
      method: 'POST',
    });
  });

  it('handles function errors', async () => {
    const invokeMock = jest
      .fn()
      .mockResolvedValue({ data: { error: 'User not found' }, error: null });
    const client = {
      functions: { invoke: invokeMock },
    };

    const result = await inviteMemberByEmail('p1', 'fail@example.com', 'viewer', client);

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('User not found');
  });

  it('handles implementation errors', async () => {
    const invokeMock = jest
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Network Fail') });
    const client = {
      functions: { invoke: invokeMock },
    };

    const result = await inviteMemberByEmail('p1', 'fail@example.com', 'viewer', client);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('Network Fail');
  });
});
