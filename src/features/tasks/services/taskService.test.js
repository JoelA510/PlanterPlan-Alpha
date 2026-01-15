import {
  fetchMasterLibraryTasks,
  searchMasterLibraryTasks,
  deepCloneTask,
} from '@features/tasks/services/taskService';

const createMockClient = (response) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),

    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject);
    },
    catch() {
      return this;
    },
  };

  const from = vi.fn().mockReturnValue(builder);

  return { client: { from }, builder };
};

describe('searchMasterLibraryTasks', () => {
  it('returns tasks when query matches description only', async () => {
    const sampleTasks = [
      {
        id: '1',
        title: 'Launch Plan',
        description: 'Complete soil preparation checklist',
        origin: 'library',
      },
    ];

    const { client, builder } = createMockClient({ data: sampleTasks, error: null });

    const results = await searchMasterLibraryTasks({ query: 'soil' }, client);

    expect(client.from).toHaveBeenCalledWith('tasks_with_primary_resource');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('title.ilike'));
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('description.ilike'));
    expect(results).toEqual({ data: sampleTasks, error: null });
  });

  it('returns empty array when query is blank', async () => {
    const { client } = createMockClient({ data: [], error: null });
    const results = await searchMasterLibraryTasks({ query: ' ' }, client);
    expect(results).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('escapes wildcard characters in query', async () => {
    const { client, builder } = createMockClient({ data: [], error: null });

    await searchMasterLibraryTasks({ query: '%_plan' }, client);

    const orArgument = builder.or.mock.calls[0][0];
    expect(orArgument).toContain('title.ilike."%\\%\\_plan%"');
    expect(orArgument).toContain('description.ilike."%\\%\\_plan%"');
  });

  it('handles search errors gracefully', async () => {
    const { client } = createMockClient({ data: null, error: { message: 'Search failed' } });

    await expect(searchMasterLibraryTasks({ query: 'fail' }, client)).resolves.toEqual({
      data: null,
      error: { message: 'Search failed' },
    });
  });
});

describe('fetchMasterLibraryTasks', () => {
  it('paginates and validates results', async () => {
    const sampleTasks = [{ id: '1', title: 'Task', origin: 'library', position: 1 }];

    const { client, builder } = createMockClient({ data: sampleTasks, error: null });

    const results = await fetchMasterLibraryTasks({ from: 10, limit: 5 }, client);

    expect(client.from).toHaveBeenCalledWith('tasks_with_primary_resource');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(10, 14);
    expect(results).toEqual({ data: sampleTasks, error: null });
  });

  it('returns empty array when payload shape invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = createMockClient({ data: [{ bad: 'record' }], error: null });

    const results = await fetchMasterLibraryTasks({}, client);

    expect(results).toEqual({ data: [], error: null });
    warnSpy.mockRestore();
  });
});

describe('deepCloneTask', () => {
  it('calls the RPC successfully with overrides', async () => {
    // Mock client.rpc
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        new_root_id: 'new-root-uuid',
        root_project_id: 'new-root-uuid',
        tasks_cloned: 5,
      },
      error: null,
    });

    const client = {
      rpc: mockRpc,
    };

    const overrides = {
      title: 'New Title',
      description: 'New Desc',
      start_date: '2025-01-01',
      due_date: '2025-01-31',
    };

    const result = await deepCloneTask('t1', 'p1', 'instance', 'user1', overrides, client);

    expect(mockRpc).toHaveBeenCalledWith('clone_project_template', {
      p_template_id: 't1',
      p_new_parent_id: 'p1',
      p_new_origin: 'instance',
      p_user_id: 'user1',
      p_title: 'New Title',
      p_description: 'New Desc',
      p_start_date: '2025-01-01',
      p_due_date: '2025-01-31',
    });

    expect(result).toEqual({
      data: {
        new_root_id: 'new-root-uuid',
        root_project_id: 'new-root-uuid',
        tasks_cloned: 5,
      },
      error: null,
    });
  });

  it('calls the RPC successfully without overrides', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    const client = { rpc: mockRpc };

    // Pass empty overrides - these should NOT be sent to the RPC
    await deepCloneTask('t1', null, 'instance', 'u1', {}, client);

    // When no overrides are provided, only the required params should be sent
    // p_title, p_description, p_start_date, p_due_date should be omitted (not null)
    expect(mockRpc).toHaveBeenCalledWith('clone_project_template', {
      p_template_id: 't1',
      p_new_parent_id: null,
      p_new_origin: 'instance',
      p_user_id: 'u1',
    });
  });

  it('handles error if RPC fails', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'RPC Failed' },
    });

    const client = { rpc: mockRpc };

    await expect(deepCloneTask('t1', null, 'instance', 'u1', {}, client)).resolves.toEqual({
      data: null,
      error: { message: 'RPC Failed' },
    });
  });
});
