import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TaskInsert } from '@/shared/db/app.types';

// ---------------------------------------------------------------------------
// Supabase SDK mock — chainable query builder
// ---------------------------------------------------------------------------
const mockResult = { data: [] as unknown[], error: null as Error | null };

const createChainableQuery = (overrides: Record<string, unknown> = {}) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'is', 'or', 'ilike', 'order', 'range', 'limit', 'maybeSingle', 'single', 'abortSignal'];

  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods return a promise
  chain.then = vi.fn((resolve: (val: typeof mockResult) => void) => resolve({ ...mockResult, ...overrides }));

  // Make it thenable
  const proxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (val: typeof mockResult) => void) => resolve({ ...mockResult, ...overrides });
      }
      return target[prop as string] || vi.fn().mockReturnValue(proxy);
    }
  });

  return proxy;
};

const mockFrom = vi.fn(() => createChainableQuery());
const mockRpc = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock('../db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'mock-token' } },
        error: null
      })),
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user' } },
        error: null
      }))
    }
  }
}));

// Must import AFTER the mock so the mock is in place
const { default: planter } = await import('./planterClient');

describe('planterClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult.data = [];
    mockResult.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('entities.Project.list', () => {
    it('should query via supabase SDK with correct filters', async () => {
      const result = await planter.entities.Project.list();

      expect(result).toEqual([]);

      // Verify supabase.from('tasks') was called
      expect(mockFrom).toHaveBeenCalledWith('tasks');
    });
  });

  describe('entities.Task.create', () => {
    it('should insert payload and return created task', async () => {
      // Override mock result for this test
      const createdTask = { id: '1', title: 'New Task' };
      mockFrom.mockImplementationOnce(() => createChainableQuery({ data: [createdTask] }));

      const payload = { title: 'New Task', creator: 'u1' };
      const result = await planter.entities.Task.create(payload as unknown as TaskInsert);

      expect(result).toEqual(createdTask);
      expect(mockFrom).toHaveBeenCalledWith('tasks');
    });
  });

  describe('entities.Task.updateParentDates', () => {
    it('should calculate child dates and update parent', async () => {
      vi.mock('../lib/date-engine/index', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../lib/date-engine/index')>();
        return {
          ...actual,
          calculateMinMaxDates: vi.fn(() => ({
            start_date: '2024-01-01',
            due_date: '2024-01-10'
          }))
        };
      });

      let callCount = 0;

      // First call: filter children → returns 1 child
      // Second call: update parent → returns parent with no further parent
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // filter call: returns children
          return createChainableQuery({ data: [{ id: 'c1', parent_task_id: 'p1' }] });
        } else {
          // update call: returns updated parent (no further parent)
          return createChainableQuery({ data: [{ id: 'p1', parent_task_id: null }] });
        }
      });

      await planter.entities.Task.updateParentDates('p1');

      // Should have called supabase.from('tasks') at least twice (filter + update)
      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should propagate updates recursively up the tree', async () => {
      let callCount = 0;

      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // filter children of p1 → empty (no children)
          return createChainableQuery({ data: [] });
        } else if (callCount === 2) {
          // update p1 → returns parent pointing to p2
          return createChainableQuery({ data: [{ id: 'p1', parent_task_id: 'p2' }] });
        } else if (callCount === 3) {
          // filter children of p2 → empty
          return createChainableQuery({ data: [] });
        } else {
          // update p2 → returns parent with no further parent
          return createChainableQuery({ data: [{ id: 'p2', parent_task_id: null }] });
        }
      });

      await planter.entities.Task.updateParentDates('p1');

      // Should propagate: filter(p1) → update(p1) → filter(p2) → update(p2)
      expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });
});
