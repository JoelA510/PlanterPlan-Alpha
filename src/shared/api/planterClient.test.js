import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import planter from './planterClient';

// Mock environment variables
vi.stubGlobal('import.meta', { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' } });

describe('planterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage for token
        const localStorageMock = {
            getItem: vi.fn((key) => {
                if (key === 'e2e-bypass-token') return null;
                return JSON.stringify({ access_token: 'mock-token' });
            }),
            length: 1,
            key: vi.fn().mockReturnValue('sb-test-auth-token')
        };
        vi.stubGlobal('localStorage', localStorageMock);

        // Mock global fetch
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
                text: () => Promise.resolve(''),
            })
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('entities.Project.list', () => {
        it('should fetch from tasks table with correct params', async () => {
            await planter.entities.Project.list();

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callUrl = global.fetch.mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');
            expect(callUrl).toContain('origin=eq.instance');
            expect(callUrl).toContain('parent_task_id=is.null'); // Check for is.null syntax

            const callOptions = global.fetch.mock.calls[0][1];
            expect(callOptions.method).toBe('GET');
            expect(callOptions.headers['Authorization']).toBe('Bearer mock-token');
        });
    });

    describe('entities.Task.create', () => {
        it('should post payload to tasks table', async () => {
            // Mock response for create (usually returns the created object)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ id: '1', title: 'New Task' }]), // PostgREST returns array
            });

            const payload = { title: 'New Task', creator: 'u1' };
            const result = await planter.entities.Task.create(payload);

            expect(result).toEqual({ id: '1', title: 'New Task' });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callUrl = global.fetch.mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');

            const callOptions = global.fetch.mock.calls[0][1];
            expect(callOptions.method).toBe('POST');
            expect(callOptions.body).toContain('"title":"New Task"');
        });
    });

    describe('entities.Task.updateParentDates', () => {
        it('should calculate child dates and update parent', async () => {
            // Mock calculateMinMaxDates via vi.mock
            vi.mock('../lib/date-engine/index', () => ({
                calculateMinMaxDates: vi.fn(() => ({
                    start_date: '2024-01-01',
                    due_date: '2024-01-10'
                }))
            }));

            // Mock fetch responses:
            // 1. Get children
            // 2. Update parent
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([{ id: 'c1', parent_task_id: 'p1' }]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ id: 'p1', parent_task_id: null }),
                });

            await planter.entities.Task.updateParentDates('p1');

            expect(global.fetch).toHaveBeenCalledTimes(2);

            // Verify children fetch
            const childrenQuery = global.fetch.mock.calls[0][0];
            expect(childrenQuery).toContain('parent_task_id=eq.p1');

            // Verify parent update
            const updateUrl = global.fetch.mock.calls[1][0];
            const updateOptions = global.fetch.mock.calls[1][1];
            expect(updateUrl).toContain('id=eq.p1');
            expect(updateOptions.method).toBe('PATCH');
            const body = JSON.parse(updateOptions.body);
            expect(body.start_date).toBe('2024-01-01');
            expect(body.due_date).toBe('2024-01-10');
        });

        it('should propagate updates recursively up the tree', async () => {
            // Mock fetch responses:
            // 1. Get children of p1
            // 2. Update p1 (returns p2 as parent)
            // 3. Get children of p2
            // 4. Update p2 (returns null as parent)
            global.fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // children of p1
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'p1', parent_task_id: 'p2' }) }) // update p1
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // children of p2
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'p2', parent_task_id: null }) }); // update p2

            await planter.entities.Task.updateParentDates('p1');

            expect(global.fetch).toHaveBeenCalledTimes(4);
            expect(global.fetch.mock.calls[1][0]).toContain('id=eq.p1');
            expect(global.fetch.mock.calls[3][0]).toContain('id=eq.p2');
        });
    });
});
