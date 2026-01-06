import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskList from './TaskList';
import '@testing-library/jest-dom';

// Mock Hooks
// Mock Hooks
jest.mock('../../hooks/useTaskBoard', () => ({
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
    loadMoreProjects: jest.fn(),

    // UI State
    showForm: false,
    setShowForm: jest.fn(),
    selectedTask: null,
    setSelectedTask: jest.fn(),
    taskFormState: null,
    setTaskFormState: jest.fn(),
    inviteModalProject: null,
    setInviteModalProject: jest.fn(),
    isSaving: false,

    // Handlers
    handleSelectProject: jest.fn(),
    handleTaskClick: jest.fn(),
    handleToggleExpand: jest.fn(),
    handleAddChildTask: jest.fn(),
    handleEditTask: jest.fn(),
    handleDeleteById: jest.fn(),
    handleOpenInvite: jest.fn(),
    handleProjectSubmit: jest.fn(),
    handleTaskSubmit: jest.fn(),
    getTaskById: jest.fn(),
    fetchTasks: jest.fn(),
    onDeleteTaskWrapper: jest.fn(),

    // DND
    sensors: [],
    handleDragEnd: jest.fn(),
  }),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

// Mock Child Components to simplify testing
jest.mock('../../layouts/DashboardLayout', () => ({ children, sidebar }) => (
  <div data-testid="dashboard-layout">
    <div data-testid="sidebar">{sidebar}</div>
    {children}
  </div>
));

jest.mock('./SideNav', () => () => <div data-testid="side-nav">SideNav</div>);
jest.mock('../molecules/ProjectTasksView', () => () => (
  <div data-testid="project-tasks-view">ProjectTasksView</div>
));
jest.mock('./NewProjectForm', () => () => <div data-testid="new-project-form">NewProjectForm</div>);
jest.mock('./NewTaskForm', () => () => <div data-testid="new-task-form">NewTaskForm</div>);
jest.mock('../templates/TaskDetailsView', () => () => (
  <div data-testid="task-details-view">TaskDetailsView</div>
));

describe('TaskList Pinning Test', () => {
  it('renders without crashing', () => {
    render(<TaskList />);
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
    expect(screen.getByText('No Project Selected')).toBeInTheDocument();
  });
});
