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
    }
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
        origin: 'library'
      }
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
    expect(orArgument).toContain('title.ilike.%\\%\\_plan%');
    expect(orArgument).toContain('description.ilike.%\\%\\_plan%');
  });
});

describe('fetchMasterLibraryTasks', () => {
  it('paginates and validates results', async () => {
    const sampleTasks = [
      { id: '1', title: 'Task', origin: 'library', position: 1 }
    ];

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
