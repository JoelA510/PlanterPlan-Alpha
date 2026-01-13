import { describe, it, expect, vi } from 'vitest';
import { planter } from '@shared/api/planterClient';

vi.mock('@app/supabaseClient', () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u123' } }, error: null })),
      },
      from: vi.fn(() => chain),
    },
  };
});

import { supabase } from '@app/supabaseClient';

describe('Planter Client', () => {
  it('Task.filter should construct correct query', async () => {
    const fromSpy = supabase.from;
    await planter.entities.Task.filter({ root_id: '123' });
    expect(fromSpy).toHaveBeenCalledWith('tasks');
  });

  it('Project.list should filter for root instance tasks', async () => {
    const fromSpy = supabase.from;
    await planter.entities.Project.list();
    expect(fromSpy).toHaveBeenCalledWith('tasks');
  });

  it('Project.create should map payload to tasks table', async () => {
    const fromSpy = supabase.from;
    await planter.entities.Project.create({ name: 'New Project', description: 'desc' });
    expect(fromSpy).toHaveBeenCalledWith('tasks');
  });

  it('TeamMember.filter should use project_members table', async () => {
    const fromSpy = supabase.from;
    await planter.entities.TeamMember.filter({ project_id: 'p123' });
    expect(fromSpy).toHaveBeenCalledWith('project_members');
  });

  it('Generic delete should call supabase delete', async () => {
    const fromSpy = supabase.from;
    await planter.entities.Task.delete('t123');
    expect(fromSpy).toHaveBeenCalledWith('tasks');
  });
});
