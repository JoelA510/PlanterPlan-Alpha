import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/shared/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u1@example.com', role: 'user' } }),
}));

vi.mock('@/shared/db/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// RecurrencePicker pulls planterClient transitively via queries; stub it for this test.
vi.mock('@/features/tasks/components/RecurrencePicker', () => ({
  default: () => <div data-testid="recurrence-picker-stub" />,
}));

import TaskForm from '@/features/tasks/components/TaskForm';
import type { TaskFormData } from '@/shared/db/app.types';

function renderForm(props: {
  membershipRole?: string;
  origin?: 'instance' | 'template';
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialTask?: Record<string, unknown> | null;
}) {
  return render(
    <TaskForm
      onSubmit={props.onSubmit}
      onCancel={vi.fn()}
      origin={props.origin ?? 'instance'}
      membershipRole={props.membershipRole}
      initialTask={props.initialTask ?? null}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TaskForm — Coaching task checkbox gating (Wave 22)', () => {
  it('renders the checkbox for owner on an instance form', () => {
    renderForm({ membershipRole: 'owner', onSubmit: vi.fn(async () => undefined) });
    expect(screen.getByTestId('is-coaching-task-checkbox')).toBeInTheDocument();
  });

  it('renders the checkbox for editor on an instance form', () => {
    renderForm({ membershipRole: 'editor', onSubmit: vi.fn(async () => undefined) });
    expect(screen.getByTestId('is-coaching-task-checkbox')).toBeInTheDocument();
  });

  it('hides the checkbox for coach role', () => {
    renderForm({ membershipRole: 'coach', onSubmit: vi.fn(async () => undefined) });
    expect(screen.queryByTestId('is-coaching-task-checkbox')).toBeNull();
  });

  it('hides the checkbox for viewer role', () => {
    renderForm({ membershipRole: 'viewer', onSubmit: vi.fn(async () => undefined) });
    expect(screen.queryByTestId('is-coaching-task-checkbox')).toBeNull();
  });

  it('hides the checkbox for limited role', () => {
    renderForm({ membershipRole: 'limited', onSubmit: vi.fn(async () => undefined) });
    expect(screen.queryByTestId('is-coaching-task-checkbox')).toBeNull();
  });

  it('hides the checkbox on template origin even for owner', () => {
    renderForm({ membershipRole: 'owner', origin: 'template', onSubmit: vi.fn(async () => undefined) });
    expect(screen.queryByTestId('is-coaching-task-checkbox')).toBeNull();
  });

  it('hides the checkbox when no membershipRole is supplied', () => {
    renderForm({ onSubmit: vi.fn(async () => undefined) });
    expect(screen.queryByTestId('is-coaching-task-checkbox')).toBeNull();
  });
});

describe('TaskForm — Coaching task submission (Wave 22)', () => {
  it('submits is_coaching_task=true when the owner checks the box', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm({ membershipRole: 'owner', onSubmit });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: 'Coach meeting' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('is-coaching-task-checkbox'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add new task/i }));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submitted = onSubmit.mock.calls[0][0] as TaskFormData;
    expect(submitted.is_coaching_task).toBe(true);
  });

  it('seeds the checkbox from settings.is_coaching_task on edit', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm({
      membershipRole: 'editor',
      onSubmit,
      initialTask: {
        id: 't1',
        title: 'Existing',
        settings: { is_coaching_task: true, due_soon_threshold: 3 },
      },
    });

    const checkbox = screen.getByTestId('is-coaching-task-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('submits is_coaching_task=false when the editor unchecks an already-tagged task', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm({
      membershipRole: 'editor',
      onSubmit,
      initialTask: {
        id: 't1',
        title: 'Existing',
        settings: { is_coaching_task: true },
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('is-coaching-task-checkbox'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submitted = onSubmit.mock.calls[0][0] as TaskFormData;
    expect(submitted.is_coaching_task).toBe(false);
  });
});
