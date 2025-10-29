const { supabase } = require('../../supabaseClient');
const { fetchFilteredTasks } = require('../taskService');

const createBuilder = (state) => {
  const builder = {};
  builder.select = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.abortSignal = jest.fn(() => builder);
  builder.range = jest.fn(() => builder);
  builder.ilike = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.or = jest.fn(() => builder);
  builder.then = jest.fn((onFulfilled, onRejected) => {
    const next =
      state.resultQueue.length > 0
        ? state.resultQueue.shift()
        : { data: [], error: null, count: 0 };
    return Promise.resolve(next).then(onFulfilled, onRejected);
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

  it('builds a filtered query with pagination and returns results', async () => {
    const sample = [{ id: 'a', title: 'Foo task' }];
    state.resultQueue.push({ data: sample, error: null, count: 1 });

    const controller = new AbortController();

    const result = await fetchFilteredTasks({
      q: 'foo',
      projectId: 'project-456',
      includeArchived: false,
      limit: 10,
      from: 5,
      signal: controller.signal,
    });

    const query = state.builder;

    expect(supabase.from).toHaveBeenCalledWith('tasks');
    expect(query.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(query.order).toHaveBeenCalledWith('title', { ascending: true });
    expect(query.abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(query.ilike).toHaveBeenCalledWith('title', '%foo%');
    expect(query.eq).toHaveBeenCalledWith('project_id', 'project-456');
    expect(query.or).toHaveBeenCalledWith('is_archived.is.null,is_archived.eq.false');
    expect(query.range).toHaveBeenCalledWith(5, 14);
    expect(result).toEqual({ data: sample, count: 1 });
  });

  it('skips archived filter when includeArchived is true and trims query', async () => {
    state.resultQueue.push({ data: [], error: null, count: 0 });

    await fetchFilteredTasks({ q: '  plants  ', includeArchived: true });

    const query = state.builder;

    expect(query.abortSignal).not.toHaveBeenCalled();
    expect(query.ilike).toHaveBeenCalledWith('title', '%plants%');
    expect(query.or).not.toHaveBeenCalled();
  });

  it('retries without archive filter when the column is missing', async () => {
    state.resultQueue.push({
      data: null,
      error: { message: 'column "is_archived" does not exist' },
      count: null,
    });
    state.resultQueue.push({ data: [{ id: 'fallback' }], error: null, count: 1 });

    const result = await fetchFilteredTasks({ q: 'foo' });

    expect(state.builder.or).toHaveBeenCalledTimes(1);
    expect(state.builder.range).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: [{ id: 'fallback' }], count: 1 });
  });

  it('throws other Supabase errors', async () => {
    const error = { message: 'Boom' };
    state.resultQueue.push({ data: null, error, count: null });

    await expect(fetchFilteredTasks()).rejects.toEqual(error);
  });
});
