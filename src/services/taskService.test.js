import { fetchMasterLibraryTasks, searchMasterLibraryTasks } from './taskService';

const createMockClient = (response) => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject);
    },
    catch() {
      return this;
    },
  };

  const from = jest.fn().mockReturnValue(builder);

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

    expect(client.from).toHaveBeenCalledWith('view_master_library');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('title.ilike'));
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('description.ilike'));
    expect(results).toEqual(sampleTasks);
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

    await expect(searchMasterLibraryTasks({ query: 'fail' }, client)).rejects.toEqual({
      message: 'Search failed',
    });
  });
});

describe('fetchMasterLibraryTasks', () => {
  it('paginates and validates results', async () => {
    const sampleTasks = [{ id: '1', title: 'Task', origin: 'library', position: 1 }];

    const { client, builder } = createMockClient({ data: sampleTasks, error: null });

    const results = await fetchMasterLibraryTasks({ from: 10, limit: 5 }, client);

    expect(client.from).toHaveBeenCalledWith('view_master_library');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(10, 14);
    expect(results).toEqual(sampleTasks);
  });

  it('returns empty array when payload shape invalid', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = createMockClient({ data: [{ bad: 'record' }], error: null });

    const results = await fetchMasterLibraryTasks({}, client);

    expect(results).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe('deepCloneTask', () => {
  const { deepCloneTask } = require('./taskService');

  beforeAll(() => {
    global.crypto = { randomUUID: () => 'mock-uuid-' + Math.random() };
  });

  it('clones a task tree correctly', async () => {
    const templateRoot = {
      id: 't1',
      title: 'Template Root',
      origin: 'template',
      parent_task_id: null,
    };
    const templateChild = {
      id: 't2',
      title: 'Template Child',
      origin: 'template',
      parent_task_id: 't1',
    };
    const allTasks = [templateRoot, templateChild];

    // Mock client for fetchTaskChildren

    const mockSingle = jest.fn().mockResolvedValue({ data: { origin: 'template' }, error: null });

    // Mock client for insert
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id: 'new1' }, { id: 'new2' }], error: null }),
    });

    const client = {
      from: jest.fn().mockReturnValue({
        select: (cols) => {
          if (cols === 'origin') return { eq: jest.fn().mockReturnValue({ single: mockSingle }) };
          return { eq: jest.fn().mockReturnValue({ data: allTasks, error: null }) }; // Simplified mock for fetchTaskChildren
        },
        insert: mockInsert,
      }),
    };

    // We need to refine the mock for fetchTaskChildren because it chains .select().eq().single() and .select().eq()
    client.from = jest.fn((table) => {
      if (table === 'tasks') {
        return {
          select: jest.fn((cols) => {
            if (cols === 'origin') {
              return {
                eq: jest.fn(() => ({
                  single: mockSingle,
                })),
              };
            }
            if (cols.includes('root_id')) {
              return {
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 't1', root_id: 'existing-root' },
                    error: null,
                  }),
                })),
              };
            }
            return {
              eq: jest.fn(() => ({
                data: allTasks,
                error: null,
              })),
            };
          }),
          insert: mockInsert,
        };
      }
    });

    await deepCloneTask('t1', 'p1', 'instance', 'user1', client);

    expect(client.from).toHaveBeenCalledWith('tasks');
    // expect(mockSingle).toHaveBeenCalled(); // fetched root origin - No longer called explicitly
    expect(mockInsert).toHaveBeenCalled();

    const insertedRows = mockInsert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].origin).toBe('instance');
    expect(insertedRows[0].creator).toBe('user1');
    // Check parentage
    const newRoot = insertedRows.find((r) => r.parent_task_id === 'p1');
    const newChild = insertedRows.find((r) => r.parent_task_id !== 'p1');
    expect(newRoot).toBeDefined();
    expect(newChild).toBeDefined();
    expect(newChild.parent_task_id).toBe(newRoot.id);
  });
});
