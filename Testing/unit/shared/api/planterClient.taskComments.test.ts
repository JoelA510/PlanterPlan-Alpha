import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock — chainable query builder (same pattern as planterClient.test.ts)
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
    (chain as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve: (v: unknown) => void) =>
        resolve(resolvedValue);
    return chain;
}

const mockFrom = vi.fn();

vi.mock('@/shared/db/client', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock('@/shared/lib/retry', () => ({
    retry: (fn: () => unknown) => fn(),
}));

vi.mock('@/shared/lib/date-engine', () => ({
    toIsoDate: (v: unknown) => (v ? String(v) : null),
    nowUtcIso: () => '2026-04-18T12:00:00.000Z',
    calculateMinMaxDates: vi.fn().mockReturnValue({ start_date: null, due_date: null }),
}));

import { planter } from '@/shared/api/planterClient';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('planter.entities.TaskComment (Wave 26)', () => {
    describe('listByTask', () => {
        it('selects with author join, filters by task_id, orders by created_at asc', async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.listByTask('task-1');

            expect(mockFrom).toHaveBeenCalledWith('task_comments');
            expect(chain.select).toHaveBeenCalledWith('*, author:users(id, email, user_metadata)');
            expect(chain.eq).toHaveBeenCalledWith('task_id', 'task-1');
            expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
        });

        it('does NOT filter out soft-deleted rows (tombstones preserve thread lineage; body is already blanked)', async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.listByTask('task-1');

            expect(chain.is).not.toHaveBeenCalledWith('deleted_at', null);
        });

        it('returns [] when Supabase returns null data without error', async () => {
            const chain = createChain({ data: null, error: null });
            mockFrom.mockReturnValue(chain);
            const rows = await planter.entities.TaskComment.listByTask('task-1');
            expect(rows).toEqual([]);
        });
    });

    describe('create', () => {
        it('inserts task_id + author_id + body + defaulted parent/mentions, then selects with author join', async () => {
            const chain = createChain({
                data: { id: 'c1', task_id: 'task-1', author_id: 'u1', body: 'hi' },
                error: null,
            });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.create({
                task_id: 'task-1',
                author_id: 'u1',
                body: 'hi',
            });

            expect(chain.insert).toHaveBeenCalledWith({
                task_id: 'task-1',
                author_id: 'u1',
                parent_comment_id: null,
                body: 'hi',
                mentions: [],
            });
            expect(chain.select).toHaveBeenCalledWith('*, author:users(id, email, user_metadata)');
            expect(chain.single).toHaveBeenCalled();
        });

        it('passes through parent_comment_id and mentions when provided', async () => {
            const chain = createChain({ data: { id: 'c2' }, error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.create({
                task_id: 'task-1',
                author_id: 'u1',
                parent_comment_id: 'parent-c',
                body: 'reply body',
                mentions: ['alice', 'bob'],
            });

            expect(chain.insert).toHaveBeenCalledWith({
                task_id: 'task-1',
                author_id: 'u1',
                parent_comment_id: 'parent-c',
                body: 'reply body',
                mentions: ['alice', 'bob'],
            });
        });
    });

    describe('updateBody', () => {
        it('stamps edited_at + body, keeps mentions absent when unspecified', async () => {
            const chain = createChain({ data: { id: 'c1' }, error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.updateBody('c1', { body: 'edited' });

            expect(chain.update).toHaveBeenCalledWith({
                body: 'edited',
                edited_at: '2026-04-18T12:00:00.000Z',
            });
            expect(chain.eq).toHaveBeenCalledWith('id', 'c1');
        });

        it('includes mentions when explicitly passed', async () => {
            const chain = createChain({ data: { id: 'c1' }, error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.updateBody('c1', { body: 'edited', mentions: ['dee'] });

            expect(chain.update).toHaveBeenCalledWith({
                body: 'edited',
                edited_at: '2026-04-18T12:00:00.000Z',
                mentions: ['dee'],
            });
        });
    });

    describe('softDelete', () => {
        it('writes deleted_at = now() and clears body (scrubs cached payload)', async () => {
            const chain = createChain({ data: { id: 'c1' }, error: null });
            mockFrom.mockReturnValue(chain);

            await planter.entities.TaskComment.softDelete('c1');

            expect(chain.update).toHaveBeenCalledWith({
                deleted_at: '2026-04-18T12:00:00.000Z',
                body: '',
            });
            expect(chain.eq).toHaveBeenCalledWith('id', 'c1');
        });
    });
});
