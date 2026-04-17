import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TaskRow } from '@/shared/db/app.types';

// ---------------------------------------------------------------------------
// Chainable supabase mock (mirrors the pattern in planterClient.test.ts)
// ---------------------------------------------------------------------------

function createChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'is', 'or', 'order', 'range', 'limit',
    'maybeSingle', 'single', 'abortSignal',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (resolve: (v: unknown) => void) => void }).then =
    (resolve: (v: unknown) => void) => resolve(resolvedValue);
  return chain;
}

const mockFrom = vi.fn();

vi.mock('@/shared/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/retry', () => ({
  retry: (fn: () => unknown) => fn(),
}));

vi.mock('@/shared/lib/date-engine', () => ({
  toIsoDate: (v: unknown) => (v ? String(v) : null),
  nowUtcIso: () => '2026-04-16T00:00:00.000Z',
  calculateMinMaxDates: vi.fn().mockReturnValue({ start_date: null, due_date: null }),
}));

// Import after mocks
import { planter } from '@/shared/api/planterClient';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('planter.entities.Task.listSiblings', () => {
  it('returns [] for a root task (parent_task_id is null)', async () => {
    // First `get(taskId)` call returns a root task (no parent).
    const getChain = createChain({
      data: { id: 'root-1', parent_task_id: null } as Partial<TaskRow>,
      error: null,
    });
    mockFrom.mockReturnValueOnce(getChain);

    const result = await planter.entities.Task.listSiblings('root-1');

    expect(result).toEqual([]);
    // Only the initial get() hit supabase.
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('tasks');
  });

  it('returns [] when the task does not exist', async () => {
    const getChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(getChain);

    const result = await planter.entities.Task.listSiblings('missing-id');

    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('fetches siblings filtered by parent_task_id, excludes current id, ordered by position', async () => {
    // 1st call: get(taskId) -> returns task with parent_task_id = "parent-A"
    const getChain = createChain({
      data: { id: 'task-2', parent_task_id: 'parent-A' } as Partial<TaskRow>,
      error: null,
    });
    // 2nd call: actual siblings query
    const siblingsRows = [
      { id: 'task-1', parent_task_id: 'parent-A', position: 1, title: 'A' },
      { id: 'task-3', parent_task_id: 'parent-A', position: 3, title: 'C' },
    ];
    const siblingsChain = createChain({ data: siblingsRows, error: null });

    mockFrom
      .mockReturnValueOnce(getChain)
      .mockReturnValueOnce(siblingsChain);

    const result = await planter.entities.Task.listSiblings('task-2');

    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'tasks');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');

    // Verify query shape on the siblings chain
    expect(siblingsChain.select).toHaveBeenCalledWith('*');
    expect(siblingsChain.eq).toHaveBeenCalledWith('parent_task_id', 'parent-A');
    expect(siblingsChain.neq).toHaveBeenCalledWith('id', 'task-2');
    expect(siblingsChain.order).toHaveBeenCalledWith('position', { ascending: true });

    expect(result).toEqual(siblingsRows);
  });

  it('returns [] when supabase returns an empty array', async () => {
    const getChain = createChain({
      data: { id: 'only-child', parent_task_id: 'parent-Z' } as Partial<TaskRow>,
      error: null,
    });
    const siblingsChain = createChain({ data: [], error: null });
    mockFrom
      .mockReturnValueOnce(getChain)
      .mockReturnValueOnce(siblingsChain);

    const result = await planter.entities.Task.listSiblings('only-child');

    expect(result).toEqual([]);
  });

  it('propagates supabase errors from the siblings query', async () => {
    const getChain = createChain({
      data: { id: 'task-2', parent_task_id: 'parent-A' } as Partial<TaskRow>,
      error: null,
    });
    const siblingsChain = createChain({
      data: null,
      error: { message: 'boom', code: '500' },
    });
    mockFrom
      .mockReturnValueOnce(getChain)
      .mockReturnValueOnce(siblingsChain);

    await expect(planter.entities.Task.listSiblings('task-2')).rejects.toThrow('boom');
  });
});
