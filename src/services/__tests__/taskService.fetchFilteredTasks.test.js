const { supabase } = require('../../supabaseClient');
const { fetchFilteredTasks } = require('../taskService');

const createBuilder = (state) => {
  const builder = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.or = jest.fn(() => builder);
  builder.range = jest.fn(() => {
    const next =
      state.resultQueue.length > 0
        ? state.resultQueue.shift()
        : { data: [], error: null, count: 0 };
    return Promise.resolve(next);
  });
  return builder;
};

describe('fetchFilteredTasks', () => {
  const originalFrom = supabase.from;
  let state;

  beforeEach(() => {
    state = { resultQueue: [] };
    state.builder = createBuilder(state);
    supabase.from = jest.fn(() => state.builder);
  });

  afterEach(() => {
    supabase.from = originalFrom;
  });

  it('applies filters and returns data with count', async () => {
    const sample = [{ id: 'a', title: 'Foo task' }];
    state.resultQueue.push({ data: sample, error: null, count: 1 });

    const result = await fetchFilteredTasks({
      text: 'foo',
      status: ['open', 'done'],
      taskType: 'template',
      assigneeId: 'user-123',
      projectId: 'project-456',
      limit: 10,
      from: 5,
    });

    const query = state.builder;

    expect(supabase.from).toHaveBeenCalledWith('tasks');
    expect(query.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(query.in).toHaveBeenCalledWith('status', ['open', 'done']);
    expect(query.eq).toHaveBeenCalledWith('project_id', 'project-456');
    expect(query.eq).toHaveBeenCalledWith('task_type', 'template');
    expect(query.eq).toHaveBeenCalledWith('assignee_id', 'user-123');
    expect(query.or).toHaveBeenCalledWith('title.ilike.%foo%,description.ilike.%foo%');
    expect(query.range).toHaveBeenCalledWith(5, 14);
    expect(result).toEqual({ data: sample, count: 1 });
  });

  it('supports scalar status filters and escapes text patterns', async () => {
    state.resultQueue.push({ data: [], error: null, count: 0 });

    await fetchFilteredTasks({
      text: '100%_match',
      status: 'open',
      taskType: ['instance', 'template'],
    });

    const query = state.builder;

    expect(query.eq).toHaveBeenCalledWith('status', 'open');
    expect(query.in).toHaveBeenCalledWith('task_type', ['instance', 'template']);
    expect(query.or).toHaveBeenCalledWith(
      'title.ilike.%100\\%\\_match%,description.ilike.%100\\%\\_match%'
    );
  });

  it('throws when Supabase returns an error', async () => {
    const error = { message: 'Boom' };
    state.resultQueue.push({ data: null, error, count: null });

    await expect(fetchFilteredTasks()).rejects.toEqual(error);
  });
});
