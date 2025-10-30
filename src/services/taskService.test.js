import { searchMasterLibraryTasks } from './taskService';

const createMockClient = (response) => {
  const builder = {
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject);
    }
  };

  const select = jest.fn().mockReturnValue(builder);
  const from = jest.fn().mockReturnValue({ select });

  return { client: { from }, builder, select };
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

    const { client, builder, select } = createMockClient({ data: sampleTasks, error: null });

    const results = await searchMasterLibraryTasks({ query: 'soil' }, client);

    expect(client.from).toHaveBeenCalledWith('view_master_library');
    expect(select).toHaveBeenCalledWith('*');
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
});
