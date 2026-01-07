import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskList from './TaskList';
import '@testing-library/jest-dom';

// Mock Hooks
// Mock Hooks
vi.mock('../../hooks/useTaskBoard', () => ({
  useTaskBoard: () => ({
    // Data
    joinedProjects: [],
    instanceTasks: [],
    templateTasks: [],
    loading: false,
    error: null,
    joinedError: null,
    activeProjectId: null,
    activeProject: null,
    hydrationError: null,

    // Pagination
    hasMore: false,
    isFetchingMore: false,
    loadMoreProjects: vi.fn(),

    // UI State
    showForm: false,
    setShowForm: vi.fn(),
    selectedTask: null,
    setSelectedTask: vi.fn(),
    taskFormState: null,
    setTaskFormState: vi.fn(),
    inviteModalProject: null,
    setInviteModalProject: vi.fn(),
    isSaving: false,

    // Handlers
    handleSelectProject: vi.fn(),
    handleTaskClick: vi.fn(),
    handleToggleExpand: vi.fn(),
    handleAddChildTask: vi.fn(),
    handleEditTask: vi.fn(),
    handleDeleteById: vi.fn(),
    handleOpenInvite: vi.fn(),
    handleProjectSubmit: vi.fn(),
    handleTaskSubmit: vi.fn(),
    getTaskById: vi.fn(),
    fetchTasks: vi.fn(),
    onDeleteTaskWrapper: vi.fn(),

    // DND
    sensors: [],
    handleDragEnd: vi.fn(),
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock Child Components to simplify testing
vi.mock('../../layouts/DashboardLayout', () => ({
  default: ({ children, sidebar }) => (
    <div data-testid="dashboard-layout">
      <div data-testid="sidebar">{sidebar}</div>
      {children}
    </div>
  ),
}));

vi.mock('./SideNav', () => ({ default: () => <div data-testid="side-nav">SideNav</div> }));
vi.mock('../molecules/ProjectTasksView', () => ({
  default: () => <div data-testid="project-tasks-view">ProjectTasksView</div>,
}));
vi.mock('./NewProjectForm', () => ({
  default: () => <div data-testid="new-project-form">NewProjectForm</div>,
}));
vi.mock('./NewTaskForm', () => ({
  default: () => <div data-testid="new-task-form">NewTaskForm</div>,
}));
vi.mock('../templates/TaskDetailsView', () => ({
  default: () => <div data-testid="task-details-view">TaskDetailsView</div>,
}));

describe('TaskList Pinning Test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
    expect(screen.getByText('No Project Selected')).toBeInTheDocument();
  });
});
