import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import planter from './planterClient';
import type { TaskUpdate } from '@/shared/db/app.types';

// Mock environment variables
vi.stubGlobal('import.meta', { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' } });

describe('planterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage for token
        const localStorageMock = {
            getItem: vi.fn((key: string) => {
                if (key === 'e2e-bypass-token') return null;
                return JSON.stringify({ access_token: 'mock-token' });
            }),
            length: 1,
            key: vi.fn().mockReturnValue('sb-test-auth-token'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        vi.stubGlobal('localStorage', localStorageMock);

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
            const callUrl = (global.fetch as any).mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');
            expect(callUrl).toContain('origin=eq.instance');
            expect(callUrl).toContain('parent_task_id=is.null');

            const callOptions = (global.fetch as any).mock.calls[0][1];
            expect(callOptions.method).toBe('GET');
            expect(callOptions.headers['Authorization']).toBe('Bearer mock-token');
        });
    });

    describe('entities.Task.create', () => {
        it('should post payload to tasks table', async () => {
            // Mock response for create (usually returns the created object)
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve([{ id: '1', title: 'New Task' }]),
            });

            const payload = { title: 'New Task', creator: 'u1' };
            const result = await planter.entities.Task.create(payload as any);

            expect(result).toEqual({ id: '1', title: 'New Task' });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callUrl = (global.fetch as any).mock.calls[0][0];
            expect(callUrl).toContain('/rest/v1/tasks');

            const callOptions = (global.fetch as any).mock.calls[0][1];
            expect(callOptions.method).toBe('POST');
            expect(callOptions.body).toContain('"title":"New Task"');
        });
    });

    describe('entities.Task.updateParentDates', () => {
        it('should calculate child dates and update parent', async () => {
            vi.mock('../lib/date-engine/index', () => ({
                calculateMinMaxDates: vi.fn(() => ({
                    start_date: '2024-01-01',
                    due_date: '2024-01-10'
                }))
            }));

            (global.fetch as any)
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

            const childrenQuery = (global.fetch as any).mock.calls[0][0];
            expect(childrenQuery).toContain('parent_task_id=eq.p1');

            const updateUrl = (global.fetch as any).mock.calls[1][0];
            const updateOptions = (global.fetch as any).mock.calls[1][1];
            expect(updateUrl).toContain('id=eq.p1');
            expect(updateOptions.method).toBe('PATCH');
            const body = JSON.parse(updateOptions.body);
            expect(body.start_date).toBe('2024-01-01');
            expect(body.due_date).toBe('2024-01-10');
        });

        it('should propagate updates recursively up the tree', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'p1', parent_task_id: 'p2' }) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'p2', parent_task_id: null }) });

            await planter.entities.Task.updateParentDates('p1');

            expect(global.fetch).toHaveBeenCalledTimes(4);
            expect((global.fetch as any).mock.calls[1][0]).toContain('id=eq.p1');
            expect((global.fetch as any).mock.calls[3][0]).toContain('id=eq.p2');
        });
    });
});
