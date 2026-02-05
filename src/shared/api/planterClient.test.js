import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import planter from './planterClient';

// Mock environment variables
vi.stubGlobal('import.meta', { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' } });

describe('planterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage for token
        const localStorageMock = {
            getItem: vi.fn().mockReturnValue(JSON.stringify({ access_token: 'mock-token' })),
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
});
