import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockUseTaskQuery = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: undefined }),
  };
});

vi.mock('@/features/tasks/hooks/useTaskQuery', () => ({
  useTaskQuery: () => mockUseTaskQuery(),
}));

import ProjectSwitcher from '@/features/projects/components/ProjectSwitcher';

function renderSwitcher() {
  return render(
    <MemoryRouter>
      <ProjectSwitcher />
    </MemoryRouter>,
  );
}

// Radix DropdownMenu opens on pointer events, not on synthetic `click`.
// Open it via Enter on the trigger, which Radix supports for keyboard users
// and which works reliably under jsdom.
async function openMenu() {
  const trigger = screen.getByTestId('project-switcher-trigger');
  await act(async () => {
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjectSwitcher', () => {
  it('renders only active projects in the dropdown by default', async () => {
    mockUseTaskQuery.mockReturnValue({
      tasks: [
        { id: 'p1', title: 'Active One', origin: 'instance', status: 'in_progress', is_complete: false },
        { id: 'p2', title: 'Archived One', origin: 'instance', status: 'archived', is_complete: false },
        { id: 'p3', title: 'Active Two', origin: 'instance', status: 'planning', is_complete: false },
        { id: 't1', title: 'Template', origin: 'template', status: null, is_complete: false },
      ],
      projectsLoading: false,
    });

    renderSwitcher();
    await openMenu();

    expect(screen.getByTestId('project-switcher-item-p1')).toBeInTheDocument();
    expect(screen.getByTestId('project-switcher-item-p3')).toBeInTheDocument();
    expect(screen.queryByTestId('project-switcher-item-p2')).toBeNull();
    expect(screen.queryByTestId('project-switcher-archived-list')).toBeNull();
  });

  it('reveals archived projects when "Show archived" is toggled', async () => {
    mockUseTaskQuery.mockReturnValue({
      tasks: [
        { id: 'p1', title: 'Active One', origin: 'instance', status: 'in_progress', is_complete: false },
        { id: 'p2', title: 'Archived One', origin: 'instance', status: 'archived', is_complete: false },
      ],
      projectsLoading: false,
    });

    renderSwitcher();
    await openMenu();
    await act(async () => {
      fireEvent.click(screen.getByTestId('project-switcher-toggle-archived'));
    });

    expect(screen.getByTestId('project-switcher-archived-list')).toBeInTheDocument();
    expect(screen.getByTestId('project-switcher-archived-p2')).toBeInTheDocument();
  });

  it('navigates to /project/:id when an item is selected', async () => {
    mockUseTaskQuery.mockReturnValue({
      tasks: [
        { id: 'p1', title: 'Active One', origin: 'instance', status: 'in_progress', is_complete: false },
      ],
      projectsLoading: false,
    });

    renderSwitcher();
    await openMenu();
    await act(async () => {
      fireEvent.click(screen.getByTestId('project-switcher-item-p1'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project/p1');
  });

  it('excludes completed projects from the active list', async () => {
    mockUseTaskQuery.mockReturnValue({
      tasks: [
        { id: 'p1', title: 'Done', origin: 'instance', status: 'completed', is_complete: true },
        { id: 'p2', title: 'Live', origin: 'instance', status: 'in_progress', is_complete: false },
      ],
      projectsLoading: false,
    });

    renderSwitcher();
    await openMenu();

    expect(screen.queryByTestId('project-switcher-item-p1')).toBeNull();
    expect(screen.getByTestId('project-switcher-item-p2')).toBeInTheDocument();
  });
});
