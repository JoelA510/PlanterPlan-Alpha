import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import { SearchProvider, useSearch } from '../SearchContext';
import { fetchFilteredTasks } from '../../../services/taskService';

jest.mock('../../../services/taskService', () => ({
  fetchFilteredTasks: jest.fn(),
}));

const TestConsumer = () => {
  const { filters, setFilters, results, isLoading, reset } = useSearch();

  return (
    <div>
      <input
        data-testid='search-input'
        value={filters.text}
        onChange={(event) =>
          setFilters((prev) => ({
            ...prev,
            text: event.target.value,
          }))
        }
      />
      <span data-testid='results-count'>{results.length}</span>
      {isLoading ? <span data-testid='loading'>loading</span> : null}
      <button type='button' data-testid='reset-button' onClick={reset}>
        reset
      </button>
    </div>
  );
};

describe('SearchContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchFilteredTasks.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('debounces filter updates and exposes latest results', async () => {
    fetchFilteredTasks
      .mockResolvedValueOnce({ data: [], count: 0 })
      .mockResolvedValueOnce({ data: [{ id: 'final' }], count: 1 });

    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );

    expect(fetchFilteredTasks).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(fetchFilteredTasks).toHaveBeenCalledTimes(1);

    const input = screen.getByTestId('search-input');

    fireEvent.change(input, { target: { value: 'f' } });
    fireEvent.change(input, { target: { value: 'fo' } });
    fireEvent.change(input, { target: { value: 'foo' } });

    expect(fetchFilteredTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetchFilteredTasks).toHaveBeenCalledTimes(2);
    const lastCall = fetchFilteredTasks.mock.calls.at(-1)[0];
    expect(lastCall.text).toBe('foo');
    expect(lastCall.from).toBe(0);

    await waitFor(() =>
      expect(screen.getByTestId('results-count').textContent).toBe('1')
    );
  });

  it('resets filters and triggers a new search', async () => {
    fetchFilteredTasks
      .mockResolvedValueOnce({ data: [], count: 0 })
      .mockResolvedValueOnce({ data: [{ id: 'after-change' }], count: 1 })
      .mockResolvedValueOnce({ data: [], count: 0 });

    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'bar' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetchFilteredTasks).toHaveBeenCalledTimes(2);

    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetchFilteredTasks).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('search-input')).toHaveValue('');
  });
});
