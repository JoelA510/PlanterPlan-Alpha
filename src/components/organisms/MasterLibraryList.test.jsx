// src/components/organisms/MasterLibraryList.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MasterLibraryList from './MasterLibraryList';
import { fetchTaskChildren, updateTaskStatus } from '../../services/taskService';
import useMasterLibraryTasks from '../../hooks/useMasterLibraryTasks';

// Mock child components to avoid cluttering the test
jest.mock('../molecules/TaskItem', () => {
  return function MockTaskItem({ task, onToggleExpand, onStatusChange }) {
    return (
      <div data-testid={`task-item-${task.id}`}>
        <span>{task.title}</span>
        <button
          data-testid={`expand-btn-${task.id}`}
          onClick={() => onToggleExpand(task, !task.isExpanded)}
        >
          {task.isExpanded ? 'Collapse' : 'Expand'}
        </button>
        <select
          data-testid={`status-select-${task.id}`}
          value={task.status || 'todo'}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
        </select>
        {task.children && task.children.length > 0 && (
          <div data-testid={`children-${task.id}`}>
            {task.children.map((child) => (
              <div key={child.id}>{child.title}</div>
            ))}
          </div>
        )}
      </div>
    );
  };
});

jest.mock('../../services/taskService');
jest.mock('../../hooks/useMasterLibraryTasks');

describe('MasterLibraryList', () => {
  const mockTasks = [
    { id: '1', title: 'Task 1', status: 'todo', origin: 'template', children: [] },
    { id: '2', title: 'Task 2', status: 'in_progress', origin: 'template', children: [] },
  ];

  beforeEach(() => {
    useMasterLibraryTasks.mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      hasMore: false,
      refresh: jest.fn(),
    });
    fetchTaskChildren.mockResolvedValue([]);
    updateTaskStatus.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders list of tasks', () => {
    render(<MasterLibraryList />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('toggles expansion and fetches children', async () => {
    const mockChildren = [
      { id: '1-1', title: 'Subtask 1', parent_task_id: '1', origin: 'template', position: 1 },
    ];
    fetchTaskChildren.mockResolvedValue(mockChildren);

    render(<MasterLibraryList />);

    const expandBtn = screen.getByTestId('expand-btn-1');
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(fetchTaskChildren).toHaveBeenCalledWith('1');
    });

    // Check if subtask is rendered (mock TaskItem renders children if present)
    await waitFor(() => {
      expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    });
  });

  it('updates task status successfully', async () => {
    render(<MasterLibraryList />);

    const statusSelect = screen.getByTestId('status-select-1');
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

    // Verify optimistic update (TaskItem mock reflects prop change immediately if parent re-renders with new data)
    // Actually, our mock TaskItem uses props. Since MasterLibraryList updates local treeData, it should re-render TaskItem with new status.
    // The select value in the mock is bound to task.status.
    await waitFor(() => {
      expect(statusSelect).toHaveValue('in_progress');
    });

    expect(updateTaskStatus).toHaveBeenCalledWith('1', 'in_progress');
  });
});
