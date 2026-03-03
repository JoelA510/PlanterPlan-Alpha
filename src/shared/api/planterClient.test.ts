import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import planter from './planterClient';
import type { TaskInsert } from '@/shared/db/app.types';

// Mock environment variables
vi.stubGlobal('import.meta', { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' } });

describe('planterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mock('../db/client', () => ({
            supabase: {
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

        // Mock global fetch
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve([]),
                text: () => Promise.resolve(''),
            } as Response)
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('entities.Project.list', () => {
        it('should fetch from tasks table with correct params', async () => {
            await planter.entities.Project.list();

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callUrl = (global.fetch as Mock).mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');
            expect(callUrl).toContain('origin=eq.instance');
            expect(callUrl).toContain('parent_task_id=is.null');

            const callOptions = (global.fetch as Mock).mock.calls[0][1];
            expect(callOptions.method).toBe('GET');
            expect(callOptions.headers['Authorization']).toBe('Bearer mock-token');
        });
    });

    describe('entities.Task.create', () => {
        it('should post payload to tasks table', async () => {
            // Mock response for create (usually returns the created object)
            (global.fetch as Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve([{ id: '1', title: 'New Task' }]),
            });

            const payload = { title: 'New Task', creator: 'u1' };
            const result = await planter.entities.Task.create(payload as unknown as TaskInsert);

            expect(result).toEqual({ id: '1', title: 'New Task' });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callUrl = (global.fetch as Mock).mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');

            const callOptions = (global.fetch as Mock).mock.calls[0][1];
            expect(callOptions.method).toBe('POST');
            expect(callOptions.body).toContain('"title":"New Task"');
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

            (global.fetch as Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve([{ id: 'c1', parent_task_id: 'p1' }]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ id: 'p1', parent_task_id: null }),
                });

            await planter.entities.Task.updateParentDates('p1');

            expect(global.fetch).toHaveBeenCalledTimes(2);

            const childrenQuery = (global.fetch as Mock).mock.calls[0][0];
            expect(childrenQuery).toContain('parent_task_id=eq.p1');

            const updateUrl = (global.fetch as Mock).mock.calls[1][0];
            const updateOptions = (global.fetch as Mock).mock.calls[1][1];
            expect(updateUrl).toContain('id=eq.p1');
            expect(updateOptions.method).toBe('PATCH');
            const body = JSON.parse(updateOptions.body);
            expect(body.start_date).toBe('2024-01-01');
            expect(body.due_date).toBe('2024-01-10');
        });

        it('should propagate updates recursively up the tree', async () => {
            (global.fetch as Mock)
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'p1', parent_task_id: 'p2' }) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'p2', parent_task_id: null }) });

            await planter.entities.Task.updateParentDates('p1');

            expect(global.fetch).toHaveBeenCalledTimes(4);
            expect((global.fetch as Mock).mock.calls[1][0]).toContain('id=eq.p1');
            expect((global.fetch as Mock).mock.calls[3][0]).toContain('id=eq.p2');
        });
    });
});
