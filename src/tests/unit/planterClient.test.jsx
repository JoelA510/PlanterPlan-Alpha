import { describe, it, expect, vi } from 'vitest';
import { planter } from '@shared/api/planterClient';
// We don't necessarily need to import supabase here if we mock it, but importing it allows spying if needed.
// However, since we are mocking the module, the import will get the mock.

vi.mock('@app/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    then: vi.fn(resolve => resolve({ data: [], error: null })),
                    // Mock promise chain for various scenarios
                    single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
                    order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                })),
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
                    }))
                })),
                is: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                    }))
                }))
            }))
        }))
    }
}));

import { supabase } from '@app/supabaseClient'; // Import after mock definition

describe('Planter Client', () => {
    it('Task.filter should construct correct query', async () => {
        const fromSpy = supabase.from;
        // We need to capture the mocks returned by the factory
        // Since we defined the mock factory above, accessing supabase.from directly gives us the verifyable mock function?
        // vitest vi.mock hoisted the factory.

        await planter.entities.Task.filter({ root_id: '123' });

        // Verify calls
        // planter.entities.Task uses createEntityClient('tasks', undefined) -> default select '*'

        // 1. from('tasks')
        expect(fromSpy).toHaveBeenCalledWith('tasks');

        // 2. select('*')
        const selectMock = fromSpy.mock.results[0].value.select;
        expect(selectMock).toHaveBeenCalledWith('*');

        // 3. eq('root_id', '123')
        const eqMock = selectMock.mock.results[0].value.eq;
        expect(eqMock).toHaveBeenCalledWith('root_id', '123');
    });
});
